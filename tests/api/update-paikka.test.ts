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
// We need a chainable builder that can return different terminal results
// depending on which table was queried. We track calls with fromMock so each
// test can configure them independently.

const mockMaybeSingle = vi.fn()
const mockEqChain = vi.fn()
const mockUpdate = vi.fn()
const mockUpdateEq = vi.fn()
const mockGetUser = vi.fn()

vi.mock('@/lib/supabaseAdmin.server', () => {
  // Chainable ownership query builder (business_paikka_links)
  const ownershipBuilder = {
    select: () => ownershipBuilder,
    eq: (..._args: unknown[]) => ownershipBuilder,
    maybeSingle: () => mockMaybeSingle(),
  }

  // Chainable update builder (liikuntapaikat)
  const updateBuilder = {
    update: (payload: unknown) => {
      mockUpdate(payload)
      return updateBuilder
    },
    eq: (...args: unknown[]) => {
      mockUpdateEq(...args)
      return mockUpdateEq()
    },
  }

  return {
    supabaseAdmin: {
      auth: {
        getUser: (token: string) => mockGetUser(token),
      },
      from: (table: string) => {
        if (table === 'business_paikka_links') return ownershipBuilder
        if (table === 'liikuntapaikat') return updateBuilder
        return ownershipBuilder
      },
    },
  }
})

// ---------------------------------------------------------------------------
// Import the route handler AFTER mocks are set up
// ---------------------------------------------------------------------------
import { POST } from '@/app/api/business/update-paikka/route'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(
  body: unknown,
  headers: Record<string, string> = {},
): Request {
  const bodyStr = JSON.stringify(body)
  return new Request('http://localhost/api/business/update-paikka', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: bodyStr,
  })
}

function makeRawRequest(rawBody: string, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/business/update-paikka', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: rawBody,
  })
}

const VALID_USER = { id: 'user-123' }
const VALID_TOKEN = 'valid-token-abc'
const VALID_AUTH_HEADER = { Authorization: `Bearer ${VALID_TOKEN}` }

function setAuthSuccess() {
  mockGetUser.mockResolvedValue({ data: { user: VALID_USER }, error: null })
}

function setOwnershipApproved() {
  mockMaybySingle_approved()
}

function mockMaybySingle_approved() {
  mockMaybeSingle.mockResolvedValue({ data: { paikka_id: 1 }, error: null })
}

function setUpdateSuccess() {
  mockUpdateEq.mockReturnValue({ error: null })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/business/update-paikka', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // 1. No Authorization header → 401
  it('returns 401 when Authorization header is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'no token' } })
    const req = makeRequest({ paikka_id: 1, section: 'mediat', data: {} })
    const res = await POST(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  // 2. Invalid token (authError) → 401
  it('returns 401 when token is invalid', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'invalid JWT' } })
    const req = makeRequest(
      { paikka_id: 1, section: 'mediat', data: {} },
      { Authorization: 'Bearer bad-token' },
    )
    const res = await POST(req)
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  // 3. Body > 64KB content-length → 413
  it('returns 413 when Content-Length exceeds 64KB', async () => {
    mockGetUser.mockResolvedValue({ data: { user: VALID_USER }, error: null })
    const req = makeRequest(
      { paikka_id: 1, section: 'mediat', data: {} },
      { ...VALID_AUTH_HEADER, 'content-length': '65537' },
    )
    const res = await POST(req)
    expect(res.status).toBe(413)
    const body = await res.json()
    expect(body.error).toBe('Request body too large')
  })

  // 4. Invalid JSON body → 400
  it('returns 400 when body is not valid JSON', async () => {
    setAuthSuccess()
    const req = makeRawRequest(
      'not-json{{{',
      VALID_AUTH_HEADER,
    )
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Invalid JSON')
  })

  // 5. paikka_id not a positive integer → 400
  it('returns 400 when paikka_id is not a positive integer', async () => {
    setAuthSuccess()
    const req = makeRequest(
      { paikka_id: -5, section: 'mediat', data: {} },
      VALID_AUTH_HEADER,
    )
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Invalid paikka_id')
  })

  // 6. Valid token but paikka not owned → 403 (E-01)
  it('returns 403 when user does not own the paikka (E-01: only approved claimants may edit)', async () => {
    setAuthSuccess()
    // No link row exists (pending/rejected/missing all blocked equally)
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    const req = makeRequest(
      { paikka_id: 1, section: 'mediat', data: {} },
      VALID_AUTH_HEADER,
    )
    const res = await POST(req)
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('Forbidden')
  })

  // 7. section=mediat: photo_urls > 5 items → 400
  it('returns 400 when photo_urls has more than 5 items', async () => {
    setAuthSuccess()
    setOwnershipApproved()
    const req = makeRequest(
      {
        paikka_id: 1,
        section: 'mediat',
        data: {
          photo_urls: ['a', 'b', 'c', 'd', 'e', 'f'],
        },
      },
      VALID_AUTH_HEADER,
    )
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('photo_urls must be an array with max 5 items')
  })

  // 8. section=mediat: non-string in photo_urls → 400 (T-03)
  it('returns 400 when photo_urls contains a non-string item (T-03)', async () => {
    setAuthSuccess()
    setOwnershipApproved()
    const req = makeRequest(
      {
        paikka_id: 1,
        section: 'mediat',
        data: {
          photo_urls: ['https://example.com/a.jpg', 42],
        },
      },
      VALID_AUTH_HEADER,
    )
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('photo_urls items must be strings')
  })

  // 9. section=aukioloajat: data is array → 400 (T-02)
  it('returns 400 when aukioloajat data is an array instead of object (T-02)', async () => {
    setAuthSuccess()
    setOwnershipApproved()
    const req = makeRequest(
      {
        paikka_id: 1,
        section: 'aukioloajat',
        data: [{ open: '09:00', close: '17:00' }],
      },
      VALID_AUTH_HEADER,
    )
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('aukioloajat must be an object')
  })

  // 10. section=aukioloajat: entry missing open/close fields → 400 (T-02)
  it('returns 400 when aukioloajat entry lacks open/close string fields (T-02)', async () => {
    setAuthSuccess()
    setOwnershipApproved()
    const req = makeRequest(
      {
        paikka_id: 1,
        section: 'aukioloajat',
        data: {
          monday: { open: '09:00' }, // missing close
        },
      },
      VALID_AUTH_HEADER,
    )
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('aukioloajat.monday must have open and close string fields')
  })

  // 11. section=yhteystiedot: javascript: varauslinkki → 400 (T-04)
  it('returns 400 when varauslinkki uses javascript: protocol (T-04)', async () => {
    setAuthSuccess()
    setOwnershipApproved()
    const req = makeRequest(
      {
        paikka_id: 1,
        section: 'yhteystiedot',
        data: {
          varauslinkki: 'javascript:alert(1)',
        },
      },
      VALID_AUTH_HEADER,
    )
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('varauslinkki must use http or https')
  })

  // 12. section=yhteystiedot: invalid URL → 400 (T-04)
  it('returns 400 when varauslinkki is not a valid URL (T-04)', async () => {
    setAuthSuccess()
    setOwnershipApproved()
    const req = makeRequest(
      {
        paikka_id: 1,
        section: 'yhteystiedot',
        data: {
          varauslinkki: 'not a url at all',
        },
      },
      VALID_AUTH_HEADER,
    )
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('varauslinkki must be a valid URL')
  })

  // 13. Unknown section → 400
  it('returns 400 for an unknown section value', async () => {
    setAuthSuccess()
    setOwnershipApproved()
    const req = makeRequest(
      {
        paikka_id: 1,
        section: 'nonexistent_section',
        data: {},
      },
      VALID_AUTH_HEADER,
    )
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Invalid section')
  })

  // 14. Happy path: valid mediat save → 200 { ok: true }
  it('returns 200 with { ok: true } on a valid mediat section save', async () => {
    setAuthSuccess()
    setOwnershipApproved()
    setUpdateSuccess()
    const req = makeRequest(
      {
        paikka_id: 1,
        section: 'mediat',
        data: {
          logo_url: 'https://example.com/logo.png',
          photo_urls: ['https://example.com/p1.jpg', 'https://example.com/p2.jpg'],
        },
      },
      VALID_AUTH_HEADER,
    )
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ ok: true })
  })
})
