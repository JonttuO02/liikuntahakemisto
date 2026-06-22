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

// Suppress the non-critical admin-notification side effect
vi.mock('@/lib/email', () => ({
  sendAdminNotificationEmail: vi.fn().mockResolvedValue(undefined),
}))

// ---------------------------------------------------------------------------
// Supabase admin mock
// ---------------------------------------------------------------------------
// Chainable builder per table, configured via spies so each test can assert
// on the exact payload the route passed to `.insert(...)`.

const mockGetUser = vi.fn()
const mockBizAccountsMaybeSingle = vi.fn()
const mockBizAccountsSingle = vi.fn()
const mockLiikuntapaikatInsert = vi.fn()
const mockLiikuntapaikatInsertSingle = vi.fn()
const mockLiikuntapaikatUpdateEq = vi.fn()
const mockLiikuntapaikatSelectSingle = vi.fn()
const mockLinksInsert = vi.fn()
const mockLinksSelectSingle = vi.fn()

vi.mock('@/lib/supabaseAdmin.server', () => {
  // business_accounts: .select('user_id').eq().maybeSingle() (ownership check)
  //                     .select('company_name').eq().single() (email block)
  const businessAccountsBuilder = {
    select: (cols: string) => {
      if (cols === 'company_name') {
        return {
          eq: () => ({ single: () => mockBizAccountsSingle() }),
        }
      }
      return {
        eq: () => ({ maybeSingle: () => mockBizAccountsMaybeSingle() }),
      }
    },
  }

  // liikuntapaikat: .insert(payload).select('id').single()
  //                 .update({is_claimed:true}).eq()
  //                 .select('nimi').eq().single()
  //                 .delete().eq() (rollback path, unused in these tests)
  const liikuntapaikatBuilder = {
    insert: (payload: unknown) => {
      mockLiikuntapaikatInsert(payload)
      return {
        select: () => ({ single: () => mockLiikuntapaikatInsertSingle() }),
      }
    },
    update: (_payload: unknown) => ({
      eq: (...args: unknown[]) => mockLiikuntapaikatUpdateEq(...args),
    }),
    select: (cols: string) => {
      if (cols === 'nimi') {
        return { eq: () => ({ single: () => mockLiikuntapaikatSelectSingle() }) }
      }
      return { eq: () => ({ single: () => mockLiikuntapaikatSelectSingle() }) }
    },
    delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
  }

  // business_paikka_links: .insert({...}) -> {error}
  //                         .select('id').eq().eq().single()
  const linksBuilder = {
    insert: (payload: unknown) => {
      mockLinksInsert(payload)
      return Promise.resolve(mockLinksInsert.mock.results.length ? { error: null } : { error: null })
    },
    select: () => ({
      eq: () => ({
        eq: () => ({ single: () => mockLinksSelectSingle() }),
      }),
    }),
  }

  return {
    supabaseAdmin: {
      auth: {
        getUser: (token: string) => mockGetUser(token),
      },
      from: (table: string) => {
        if (table === 'business_accounts') return businessAccountsBuilder
        if (table === 'liikuntapaikat') return liikuntapaikatBuilder
        if (table === 'business_paikka_links') return linksBuilder
        return businessAccountsBuilder
      },
    },
  }
})

// ---------------------------------------------------------------------------
// Import the route handler AFTER mocks are set up
// ---------------------------------------------------------------------------
import { POST } from '@/app/api/business/create-paikka/route'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/business/create-paikka', {
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
  nimi: 'Testihalli',
  osoite: 'Testikatu 1',
  kaupunki: 'Tampere',
  latitude: 61.5,
  longitude: 23.7,
}

function setHappyPathMocks() {
  mockGetUser.mockResolvedValue({ data: { user: VALID_USER }, error: null })
  mockBizAccountsMaybeSingle.mockResolvedValue({ data: { user_id: VALID_USER.id }, error: null })
  mockBizAccountsSingle.mockResolvedValue({ data: { company_name: 'Testi Oy' }, error: null })
  mockLiikuntapaikatInsertSingle.mockResolvedValue({ data: { id: 42 }, error: null })
  mockLiikuntapaikatUpdateEq.mockResolvedValue({ error: null })
  mockLiikuntapaikatSelectSingle.mockResolvedValue({ data: { nimi: 'Testihalli' }, error: null })
  mockLinksInsert.mockImplementation(() => Promise.resolve({ error: null }))
  mockLinksSelectSingle.mockResolvedValue({ data: { id: 7 }, error: null })
}

describe('POST /api/business/create-paikka', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('persists latitude and longitude to the liikuntapaikat insert', async () => {
    setHappyPathMocks()
    const req = makeRequest(VALID_BODY, VALID_AUTH_HEADER)
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(mockLiikuntapaikatInsert).toHaveBeenCalledWith(
      expect.objectContaining({ latitude: 61.5, longitude: 23.7 }),
    )
  })

  it('does not persist place_id even when present in the body', async () => {
    setHappyPathMocks()
    const req = makeRequest(
      {
        ...VALID_BODY,
        place_id: 'ChIJxxxx',
        formatted_address: 'Testikatu 1, 33100 Tampere, Finland',
      },
      VALID_AUTH_HEADER,
    )
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(mockLiikuntapaikatInsert).toHaveBeenCalledWith(
      expect.not.objectContaining({ place_id: expect.anything() }),
    )
    expect(mockLiikuntapaikatInsert).toHaveBeenCalledWith(
      expect.not.objectContaining({ formatted_address: expect.anything() }),
    )
  })

  it('rejects invalid lat/lng', async () => {
    setHappyPathMocks()
    const req = makeRequest(
      { ...VALID_BODY, latitude: NaN },
      VALID_AUTH_HEADER,
    )
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Missing fields')
    expect(mockLiikuntapaikatInsert).not.toHaveBeenCalled()
  })

  it('rejects out-of-range lat/lng', async () => {
    setHappyPathMocks()
    const req = makeRequest(
      { ...VALID_BODY, latitude: 999 },
      VALID_AUTH_HEADER,
    )
    const res = await POST(req)
    expect(res.status).toBe(400)
    expect(mockLiikuntapaikatInsert).not.toHaveBeenCalled()
  })

  it('returns 200 with { ok: true, paikka_id } on a fully valid request', async () => {
    setHappyPathMocks()
    const req = makeRequest(VALID_BODY, VALID_AUTH_HEADER)
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ ok: true, paikka_id: 42 })
  })
})
