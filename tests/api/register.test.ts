import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock next/server so NextResponse.json works in pure Node
vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}))

// ---------------------------------------------------------------------------
// Supabase admin mock
// ---------------------------------------------------------------------------
// Chainable builder per table, configured via spies so each test can assert
// on the exact payload the route passed to `.insert(...)`, the insert order,
// and the rollback path.

const mockGetUser = vi.fn()
const mockCompaniesInsert = vi.fn()
const mockCompaniesInsertSingle = vi.fn()
const mockCompaniesDelete = vi.fn()
const mockBusinessAccountsInsert = vi.fn()

// Tracks call order across both tables so we can assert companies resolves
// before business_accounts is attempted.
const callOrder: string[] = []

vi.mock('@/lib/supabaseAdmin.server', () => {
  // companies: .insert({ name }).select('id').single()
  //            .delete().eq() (rollback path)
  const companiesBuilder = {
    insert: (payload: unknown) => {
      mockCompaniesInsert(payload)
      callOrder.push('companies.insert')
      return {
        select: () => ({
          single: async () => {
            const result = await mockCompaniesInsertSingle()
            callOrder.push('companies.insert.resolved')
            return result
          },
        }),
      }
    },
    delete: () => ({
      eq: (...args: unknown[]) => mockCompaniesDelete(...args),
    }),
  }

  // business_accounts: .insert({ user_id, company_id, role, role_in_company })
  const businessAccountsBuilder = {
    insert: async (payload: unknown) => {
      callOrder.push('business_accounts.insert')
      return mockBusinessAccountsInsert(payload)
    },
  }

  return {
    supabaseAdmin: {
      auth: {
        getUser: (token: string) => mockGetUser(token),
      },
      from: (table: string) => {
        if (table === 'companies') return companiesBuilder
        if (table === 'business_accounts') return businessAccountsBuilder
        return businessAccountsBuilder
      },
    },
  }
})

// ---------------------------------------------------------------------------
// Import the route handler AFTER mocks are set up
// ---------------------------------------------------------------------------
import { POST } from '@/app/api/business/register/route'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/business/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  })
}

const VALID_USER = { id: 'user-123' }
const VALID_TOKEN = 'valid-token-abc'
const VALID_AUTH_HEADER = { Authorization: `Bearer ${VALID_TOKEN}` }

const VALID_BODY = {
  company_name: 'Testi Oy',
  role_in_company: 'Omistaja',
}

// business_accounts.insert resolves to this — configurable per test
let businessAccountsInsertResult: { error: { message: string } | null } = { error: null }

function setHappyPathMocks() {
  callOrder.length = 0
  mockGetUser.mockResolvedValue({ data: { user: VALID_USER }, error: null })
  mockCompaniesInsertSingle.mockResolvedValue({ data: { id: 42 }, error: null })
  mockCompaniesDelete.mockResolvedValue({ error: null })
  businessAccountsInsertResult = { error: null }
  mockBusinessAccountsInsert.mockImplementation(() => businessAccountsInsertResult)
}

describe('POST /api/business/register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    callOrder.length = 0
  })

  it('creates a company then a business_accounts row with company_id + role: owner', async () => {
    setHappyPathMocks()
    const req = makeRequest(VALID_BODY, VALID_AUTH_HEADER)
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(mockCompaniesInsert).toHaveBeenCalledWith({ name: 'Testi Oy' })
    expect(mockBusinessAccountsInsert).toHaveBeenCalledWith({
      user_id: VALID_USER.id,
      company_id: 42,
      role: 'owner',
      role_in_company: 'Omistaja',
    })
  })

  it('does not write company_name to business_accounts', async () => {
    setHappyPathMocks()
    const req = makeRequest(VALID_BODY, VALID_AUTH_HEADER)
    await POST(req)
    expect(mockBusinessAccountsInsert).toHaveBeenCalledWith(
      expect.not.objectContaining({ company_name: expect.anything() }),
    )
  })

  it('resolves the companies insert before attempting the business_accounts insert', async () => {
    setHappyPathMocks()
    const req = makeRequest(VALID_BODY, VALID_AUTH_HEADER)
    await POST(req)
    const companiesResolvedIdx = callOrder.indexOf('companies.insert.resolved')
    const accountsInsertIdx = callOrder.indexOf('business_accounts.insert')
    expect(companiesResolvedIdx).toBeGreaterThanOrEqual(0)
    expect(accountsInsertIdx).toBeGreaterThan(companiesResolvedIdx)
  })

  it('rolls back the new companies row when the business_accounts insert fails', async () => {
    setHappyPathMocks()
    businessAccountsInsertResult = { error: { message: 'insert failed' } }
    mockBusinessAccountsInsert.mockImplementation(() => businessAccountsInsertResult)
    const req = makeRequest(VALID_BODY, VALID_AUTH_HEADER)
    const res = await POST(req)
    expect(res.status).toBe(500)
    expect(mockCompaniesDelete).toHaveBeenCalledWith('id', 42)
  })

  it('returns 401 and attempts no inserts when the Authorization header is missing/invalid', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'invalid token' } })
    const req = makeRequest(VALID_BODY)
    const res = await POST(req)
    expect(res.status).toBe(401)
    expect(mockCompaniesInsert).not.toHaveBeenCalled()
    expect(mockBusinessAccountsInsert).not.toHaveBeenCalled()
  })

  describe('invite-link path (invite: true)', () => {
    it('creates a business_accounts row with company_id: null, role: member, and does not insert a companies row', async () => {
      setHappyPathMocks()
      const req = makeRequest(
        { invite: true, role_in_company: 'Johtaja' },
        VALID_AUTH_HEADER,
      )
      const res = await POST(req)
      expect(res.status).toBe(200)
      expect(mockCompaniesInsert).not.toHaveBeenCalled()
      expect(mockBusinessAccountsInsert).toHaveBeenCalledWith({
        user_id: VALID_USER.id,
        company_id: null,
        role: 'member',
        role_in_company: 'Johtaja',
        display_name: null,
      })
    })

    it('trims and caps display_name to 100 chars, and does not insert a companies row', async () => {
      setHappyPathMocks()
      const longName = 'a'.repeat(150)
      const req = makeRequest(
        { invite: true, role_in_company: 'Johtaja', display_name: '  ' + longName + '  ' },
        VALID_AUTH_HEADER,
      )
      const res = await POST(req)
      expect(res.status).toBe(200)
      expect(mockCompaniesInsert).not.toHaveBeenCalled()
      expect(mockBusinessAccountsInsert).toHaveBeenCalledWith({
        user_id: VALID_USER.id,
        company_id: null,
        role: 'member',
        role_in_company: 'Johtaja',
        display_name: 'a'.repeat(100),
      })
    })
  })
})
