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
// Chainable builder keyed by table name, mirroring tests/api/submit.test.ts's
// draftSelectBuilder / linkSelectBuilder / linkUpdateBuilder pattern.
//
// Tables touched by list/route.ts:
// - business_paikka_links: 1st select() call = owner-auth probe (select→eq→eq→eq→maybeSingle),
//   2nd select() call = approved-team-member list (select→eq→eq, awaited as an array).
// - business_accounts: select→eq→maybeSingle role probe.
// - business_access_requests: select→eq→eq, awaited as an array (pending requests).
// - auth.admin.getUserById: per-id identity resolution.

const mockGetUser = vi.fn()
const mockOwnerProbeMaybeSingle = vi.fn()
const mockRoleMaybeSingle = vi.fn()
const mockPendingRequestsResult = vi.fn()
const mockTeamMembersResult = vi.fn()
const mockGetUserById = vi.fn()

vi.mock('@/lib/supabaseAdmin.server', () => {
  // business_paikka_links — two distinct chain shapes depending on call order.
  const ownerProbeChain = {
    select: () => ownerProbeChain,
    eq: () => ownerProbeChain,
    maybeSingle: () => mockOwnerProbeMaybeSingle(),
  }

  const teamMembersChain = {
    select: () => teamMembersChain,
    eq: () => teamMembersChain,
    then: (resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
      Promise.resolve(mockTeamMembersResult()).then(resolve, reject),
  }

  // Call count tracked via a vi.fn() (not a plain closure variable) so that
  // vi.clearAllMocks() in beforeEach resets it between tests.
  const mockLinkSelectCall = vi.fn()
  const businessPaikkaLinksTable = {
    select: () => {
      mockLinkSelectCall()
      return mockLinkSelectCall.mock.calls.length === 1 ? ownerProbeChain : teamMembersChain
    },
  }

  // business_accounts — role probe (owner-auth check).
  const roleProbeChain = {
    select: () => roleProbeChain,
    eq: () => roleProbeChain,
    maybeSingle: () => mockRoleMaybeSingle(),
  }
  const businessAccountsTable = {
    select: () => roleProbeChain,
  }

  // business_access_requests — pending-requests list, awaited as an array.
  const pendingRequestsChain = {
    select: () => pendingRequestsChain,
    eq: () => pendingRequestsChain,
    then: (resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
      Promise.resolve(mockPendingRequestsResult()).then(resolve, reject),
  }
  const businessAccessRequestsTable = {
    select: () => pendingRequestsChain,
  }

  return {
    supabaseAdmin: {
      auth: {
        getUser: (token: string) => mockGetUser(token),
        admin: {
          getUserById: (id: string) => mockGetUserById(id),
        },
      },
      from: (table: string) => {
        if (table === 'business_paikka_links') return businessPaikkaLinksTable
        if (table === 'business_accounts') return businessAccountsTable
        if (table === 'business_access_requests') return businessAccessRequestsTable
        return businessPaikkaLinksTable
      },
    },
  }
})

// ---------------------------------------------------------------------------
// Import the route handler AFTER mocks are set up
// ---------------------------------------------------------------------------
import { GET } from '@/app/api/business/access-request/list/route'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(paikkaId: string | number, headers: Record<string, string> = { Authorization: 'Bearer test' }): Request {
  return new Request(`http://localhost/api/business/access-request/list?paikka_id=${paikkaId}`, {
    headers,
  })
}

const OWNER_USER = { id: 'owner-1' }

function setAuthSuccess(user: { id: string } = OWNER_USER) {
  mockGetUser.mockResolvedValue({ data: { user }, error: null })
}

function setOwnerApproved() {
  mockOwnerProbeMaybeSingle.mockResolvedValue({ data: { business_account_id: OWNER_USER.id }, error: null })
}

function setRoleOwner() {
  mockRoleMaybeSingle.mockResolvedValue({ data: { role: 'owner' }, error: null })
}

function getUserByIdMap(map: Record<string, { email?: string; full_name?: string }>) {
  mockGetUserById.mockImplementation((id: string) => {
    const entry = map[id]
    if (!entry) {
      return Promise.resolve({ data: { user: null }, error: null })
    }
    return Promise.resolve({
      data: {
        user: {
          email: entry.email ?? null,
          user_metadata: entry.full_name ? { full_name: entry.full_name } : {},
        },
      },
      error: null,
    })
  })
}

describe('GET /api/business/access-request/list', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns pending requests', async () => {
    setAuthSuccess()
    setOwnerApproved()
    setRoleOwner()
    mockPendingRequestsResult.mockReturnValue({
      data: [{ id: 5, requester_id: 'req-1', created_at: '2026-07-01T00:00:00Z' }],
      error: null,
    })
    mockTeamMembersResult.mockReturnValue({
      data: [
        {
          business_account_id: 'owner-1',
          claim_status: 'approved',
          business_accounts: { role: 'owner', display_name: 'Omistaja Oy' },
        },
        {
          business_account_id: 'member-1',
          claim_status: 'approved',
          business_accounts: { role: 'member', display_name: null },
        },
      ],
      error: null,
    })
    getUserByIdMap({
      'req-1': { email: 'req1@example.com' },
      'owner-1': { email: 'owner1@example.com' },
      'member-1': { email: 'member1@example.com', full_name: 'Member One' },
    })

    const res = await GET(makeRequest(5))
    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body.pendingRequests).toHaveLength(1)
    expect(body.pendingRequests[0]).toMatchObject({
      id: 5,
      requesterId: 'req-1',
      name: 'req1@example.com',
      email: 'req1@example.com',
    })

    expect(body.teamMembers).toHaveLength(2)
    const ownerRow = body.teamMembers.find((m: { userId: string }) => m.userId === 'owner-1')
    const memberRow = body.teamMembers.find((m: { userId: string }) => m.userId === 'member-1')
    expect(ownerRow).toMatchObject({ name: 'Omistaja Oy', role: 'owner', isSelf: true })
    expect(memberRow).toMatchObject({ name: 'Member One', role: 'member', isSelf: false })
  })

  it('forbidden', async () => {
    setAuthSuccess()
    mockOwnerProbeMaybeSingle.mockResolvedValue({ data: null, error: null })

    const res = await GET(makeRequest(5))
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.pendingRequests).toBeUndefined()
    expect(body.teamMembers).toBeUndefined()
  })

  it('forbidden non-owner role', async () => {
    setAuthSuccess()
    setOwnerApproved()
    mockRoleMaybeSingle.mockResolvedValue({ data: { role: 'member' }, error: null })

    const res = await GET(makeRequest(5))
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.pendingRequests).toBeUndefined()
    expect(body.teamMembers).toBeUndefined()
  })

  it('unauthorized', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'invalid token' } })

    const res = await GET(makeRequest(5))
    expect(res.status).toBe(401)
  })

  it('identity resolution fallback', async () => {
    setAuthSuccess()
    setOwnerApproved()
    setRoleOwner()
    mockPendingRequestsResult.mockReturnValue({ data: [], error: null })
    mockTeamMembersResult.mockReturnValue({
      data: [
        {
          business_account_id: 'owner-1',
          claim_status: 'approved',
          business_accounts: { role: 'owner', display_name: 'Omistaja Oy' },
        },
        {
          business_account_id: 'member-2',
          claim_status: 'approved',
          business_accounts: { role: 'member', display_name: null },
        },
      ],
      error: null,
    })
    getUserByIdMap({
      'owner-1': { email: 'owner1@example.com' },
      'member-2': { email: 'member2@example.com' }, // no full_name — must fall back to email
    })

    const res = await GET(makeRequest(5))
    expect(res.status).toBe(200)
    const body = await res.json()
    const memberRow = body.teamMembers.find((m: { userId: string }) => m.userId === 'member-2')
    expect(memberRow).toMatchObject({ name: 'member2@example.com', email: 'member2@example.com' })
  })
})
