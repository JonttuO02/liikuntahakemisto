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

// D-11: no removal notification email. Present here only to assert these are
// NEVER called by the remove handler.
const mockSendAccessRequestDecisionEmail = vi.fn().mockResolvedValue(undefined)
const mockSendAccessRequestNotificationEmail = vi.fn().mockResolvedValue(undefined)
vi.mock('@/lib/email', () => ({
  sendAccessRequestDecisionEmail: (...args: unknown[]) => mockSendAccessRequestDecisionEmail(...args),
  sendAccessRequestNotificationEmail: (...args: unknown[]) => mockSendAccessRequestNotificationEmail(...args),
}))

// ---------------------------------------------------------------------------
// Supabase admin mock
// ---------------------------------------------------------------------------
// Chainable builder keyed by table name, mirroring tests/api/submit.test.ts's
// pattern. Tables touched by remove/route.ts:
//   business_paikka_links — select→eq→eq→eq→maybeSingle (owner-auth probe)
//                          — delete({count:'exact'})→eq→eq (the removal itself)
//   business_accounts     — select→eq→maybeSingle (caller role probe)

const mockGetUser = vi.fn()
const mockOwnerLinkMaybeSingle = vi.fn()
const mockCallerAccountMaybeSingle = vi.fn()
const mockDeleteResult = vi.fn()
const mockDeleteEq = vi.fn()

vi.mock('@/lib/supabaseAdmin.server', () => {
  const ownerLinkSelectBuilder = {
    select: () => ownerLinkSelectBuilder,
    eq: (...args: unknown[]) => {
      void args
      return ownerLinkSelectBuilder
    },
    maybeSingle: () => mockOwnerLinkMaybeSingle(),
  }

  const callerAccountSelectBuilder = {
    select: () => callerAccountSelectBuilder,
    eq: (...args: unknown[]) => {
      void args
      return callerAccountSelectBuilder
    },
    maybeSingle: () => mockCallerAccountMaybeSingle(),
  }

  const deleteBuilder = {
    delete: (...args: unknown[]) => {
      void args
      return deleteBuilder
    },
    eq: (...args: unknown[]) => {
      mockDeleteEq(...args)
      return deleteBuilder
    },
    then: (resolve: (v: { error: unknown; count: number | null }) => void) => resolve(mockDeleteResult()),
  }

  const businessPaikkaLinksTable = {
    select: () => ownerLinkSelectBuilder,
    delete: (...args: unknown[]) => deleteBuilder.delete(...args),
  }

  const businessAccountsTable = {
    select: () => callerAccountSelectBuilder,
  }

  return {
    supabaseAdmin: {
      auth: {
        getUser: (token: string) => mockGetUser(token),
      },
      from: (table: string) => {
        if (table === 'business_paikka_links') return businessPaikkaLinksTable
        if (table === 'business_accounts') return businessAccountsTable
        return businessPaikkaLinksTable
      },
    },
  }
})

// ---------------------------------------------------------------------------
// Import the route handler AFTER mocks are set up
// ---------------------------------------------------------------------------
import { POST } from '@/app/api/business/access-request/remove/route'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/business/access-request/remove', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  })
}

const OWNER_USER = { id: 'uid-owner' }
const MEMBER_USER_ID = 'uid-member'
const VALID_TOKEN = 'valid-token-abc'
const VALID_AUTH_HEADER = { Authorization: `Bearer ${VALID_TOKEN}` }
const PAIKKA_ID = 5

function setAuthSuccess(user: { id: string } = OWNER_USER) {
  mockGetUser.mockResolvedValue({ data: { user }, error: null })
}

function setAuthFailure() {
  mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'invalid token' } })
}

function setApprovedOwner() {
  mockOwnerLinkMaybeSingle.mockResolvedValue({ data: { business_account_id: OWNER_USER.id }, error: null })
  mockCallerAccountMaybeSingle.mockResolvedValue({ data: { role: 'owner' }, error: null })
}

function setNotOwner() {
  mockOwnerLinkMaybeSingle.mockResolvedValue({ data: null, error: null })
}

function setDeleteSuccess(count = 1) {
  mockDeleteResult.mockReturnValue({ error: null, count })
}

describe('POST /api/business/access-request/remove (ACCESS-07)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('removes member', async () => {
    setAuthSuccess()
    setApprovedOwner()
    setDeleteSuccess(1)

    const req = makeRequest({ paikka_id: PAIKKA_ID, target_user_id: MEMBER_USER_ID }, VALID_AUTH_HEADER)
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ ok: true })
    expect(mockDeleteEq).toHaveBeenCalledWith('business_account_id', MEMBER_USER_ID)
    expect(mockDeleteEq).toHaveBeenCalledWith('paikka_id', PAIKKA_ID)
    expect(mockSendAccessRequestDecisionEmail).not.toHaveBeenCalled()
    expect(mockSendAccessRequestNotificationEmail).not.toHaveBeenCalled()
  })

  it('forbidden non-owner', async () => {
    setAuthSuccess()
    setNotOwner()

    const req = makeRequest({ paikka_id: PAIKKA_ID, target_user_id: MEMBER_USER_ID }, VALID_AUTH_HEADER)
    const res = await POST(req)

    expect(res.status).toBe(403)
    expect(mockDeleteEq).not.toHaveBeenCalled()
  })

  it('self-removal blocked', async () => {
    setAuthSuccess()
    // Deliberately do NOT set up owner-auth mocks — the self-block must fire
    // before any DB probe/access occurs.

    const req = makeRequest({ paikka_id: PAIKKA_ID, target_user_id: OWNER_USER.id }, VALID_AUTH_HEADER)
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body).toEqual({ error: 'Cannot remove yourself' })
    expect(mockOwnerLinkMaybeSingle).not.toHaveBeenCalled()
    expect(mockCallerAccountMaybeSingle).not.toHaveBeenCalled()
    expect(mockDeleteEq).not.toHaveBeenCalled()
  })

  it('venue-scoped', async () => {
    setAuthSuccess()
    // Owner of Venue A has no approved link for Venue B's paikka_id.
    setNotOwner()

    const req = makeRequest({ paikka_id: 999, target_user_id: MEMBER_USER_ID }, VALID_AUTH_HEADER)
    const res = await POST(req)

    expect(res.status).toBe(403)
    expect(mockDeleteEq).not.toHaveBeenCalled()
  })

  it('concurrency', async () => {
    setAuthSuccess()
    setApprovedOwner()
    setDeleteSuccess(0)

    const req = makeRequest({ paikka_id: PAIKKA_ID, target_user_id: MEMBER_USER_ID }, VALID_AUTH_HEADER)
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body).toEqual({ error: 'Member not found for this venue' })
  })

  it('unauthorized', async () => {
    setAuthFailure()

    const req = makeRequest({ paikka_id: PAIKKA_ID, target_user_id: MEMBER_USER_ID }, VALID_AUTH_HEADER)
    const res = await POST(req)

    expect(res.status).toBe(401)
    expect(mockDeleteEq).not.toHaveBeenCalled()
  })
})
