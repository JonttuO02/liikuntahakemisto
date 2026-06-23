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
// Chainable builder keyed by table name (business_paikka_links ownership lookup,
// onboarding_draft upsert), mirroring tests/api/update-paikka.test.ts's pattern.

const mockMaybeSingle = vi.fn()
const mockUpsert = vi.fn()
const mockGetUser = vi.fn()

vi.mock('@/lib/supabaseAdmin.server', () => {
  // Chainable ownership query builder (business_paikka_links)
  const ownershipBuilder = {
    select: () => ownershipBuilder,
    eq: (..._args: unknown[]) => ownershipBuilder,
    maybeSingle: () => mockMaybeSingle(),
  }

  // Chainable upsert builder (onboarding_draft)
  const upsertBuilder = {
    upsert: (payload: unknown, opts: unknown) => mockUpsert(payload, opts),
  }

  return {
    supabaseAdmin: {
      auth: {
        getUser: (token: string) => mockGetUser(token),
      },
      from: (table: string) => {
        if (table === 'business_paikka_links') return ownershipBuilder
        if (table === 'onboarding_draft') return upsertBuilder
        return ownershipBuilder
      },
    },
  }
})

// ---------------------------------------------------------------------------
// Import the route handler AFTER mocks are set up
// ---------------------------------------------------------------------------
import { POST } from '@/app/api/business/onboarding/save-step/route'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/business/onboarding/save-step', {
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

function setAuthSuccess() {
  mockGetUser.mockResolvedValue({ data: { user: VALID_USER }, error: null })
}

function setOwnershipApproved() {
  mockMaybeSingle.mockResolvedValue({ data: { id: 1 }, error: null })
}

function setUpsertSuccess() {
  mockUpsert.mockResolvedValue({ error: null })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/business/onboarding/save-step — laji field (AI-06)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('accepts a valid laji string and writes it via UPSERT', async () => {
    setAuthSuccess()
    setOwnershipApproved()
    setUpsertSuccess()
    const req = makeRequest(
      { paikka_id: 1, field: 'laji', step: 5, value: 'padel' },
      VALID_AUTH_HEADER,
    )
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ ok: true })
    expect(mockUpsert).toHaveBeenCalledTimes(1)
    const [payload] = mockUpsert.mock.calls[0]
    expect(payload.laji).toBe('padel')
  })

  it('rejects an empty laji value with 400 and no laji', async () => {
    setAuthSuccess()
    setOwnershipApproved()
    const req = makeRequest(
      { paikka_id: 1, field: 'laji', step: 5, value: '' },
      VALID_AUTH_HEADER,
    )
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/laji/i)
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('rejects a laji value longer than 100 chars with 400 and no laji', async () => {
    setAuthSuccess()
    setOwnershipApproved()
    const req = makeRequest(
      { paikka_id: 1, field: 'laji', step: 5, value: 'a'.repeat(101) },
      VALID_AUTH_HEADER,
    )
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/laji/i)
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('rejects a non-string laji value with 400 and no laji', async () => {
    setAuthSuccess()
    setOwnershipApproved()
    const req = makeRequest(
      { paikka_id: 1, field: 'laji', step: 5, value: 123 },
      VALID_AUTH_HEADER,
    )
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/laji/i)
    expect(mockUpsert).not.toHaveBeenCalled()
  })
})
