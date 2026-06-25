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

// Non-critical side effects — silence and short-circuit them.
vi.mock('@/lib/email', () => ({
  sendAdminNotificationEmail: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/onboardingUtils', () => ({
  hinnastaToHintaKuvaus: vi.fn().mockReturnValue('10€ / kerta'),
}))

// ---------------------------------------------------------------------------
// Supabase admin mock
// ---------------------------------------------------------------------------
// Chainable builder keyed by table name, mirroring tests/api/update-paikka.test.ts's pattern.
// Tables touched by submit/route.ts: onboarding_draft (select + delete),
// business_paikka_links (select + update), liikuntapaikat (update + select),
// business_accounts (select).

const mockGetUser = vi.fn()
const mockDraftMaybeSingle = vi.fn()
const mockLinkMaybeSingle = vi.fn()
const mockUpdateLiikuntapaikat = vi.fn()
const mockUpdateLiikuntapaikatEq = vi.fn()
const mockLinkUpdateEq = vi.fn()
const mockDraftDeleteEq = vi.fn()
const mockBizSingle = vi.fn()
const mockPaikkaSingle = vi.fn()

vi.mock('@/lib/supabaseAdmin.server', () => {
  const draftSelectBuilder = {
    select: () => draftSelectBuilder,
    eq: () => draftSelectBuilder,
    maybeSingle: () => mockDraftMaybeSingle(),
  }

  const draftDeleteBuilder = {
    delete: () => draftDeleteBuilder,
    eq: (...args: unknown[]) => {
      mockDraftDeleteEq(...args)
      return draftDeleteBuilder
    },
  }

  let draftCallCount = 0
  const onboardingDraftTable = {
    select: () => {
      draftCallCount += 1
      return draftSelectBuilder
    },
    delete: () => draftDeleteBuilder,
  }
  void draftCallCount

  const linkSelectBuilder = {
    select: () => linkSelectBuilder,
    eq: () => linkSelectBuilder,
    maybeSingle: () => mockLinkMaybeSingle(),
  }

  const linkUpdateBuilder = {
    update: () => linkUpdateBuilder,
    eq: (...args: unknown[]) => {
      mockLinkUpdateEq(...args)
      return linkUpdateBuilder
    },
    then: (resolve: (v: { error: null }) => void) => resolve({ error: null }),
  }

  let linkCallIndex = 0
  const businessPaikkaLinksTable = {
    select: () => {
      linkCallIndex += 1
      return linkSelectBuilder
    },
    update: () => linkUpdateBuilder,
  }
  void linkCallIndex

  const liikuntapaikatUpdateBuilder = {
    update: (payload: unknown) => {
      mockUpdateLiikuntapaikat(payload)
      return liikuntapaikatUpdateBuilder
    },
    eq: (...args: unknown[]) => {
      mockUpdateLiikuntapaikatEq(...args)
      return mockUpdateLiikuntapaikatEq()
    },
  }

  const paikkaSelectBuilder = {
    select: () => paikkaSelectBuilder,
    eq: () => paikkaSelectBuilder,
    single: () => mockPaikkaSingle(),
  }

  const liikuntapaikatTable = {
    update: (payload: unknown) => liikuntapaikatUpdateBuilder.update(payload),
    select: () => paikkaSelectBuilder,
  }

  const bizSelectBuilder = {
    select: () => bizSelectBuilder,
    eq: () => bizSelectBuilder,
    single: () => mockBizSingle(),
  }

  const businessAccountsTable = {
    select: () => bizSelectBuilder,
  }

  return {
    supabaseAdmin: {
      auth: {
        getUser: (token: string) => mockGetUser(token),
      },
      from: (table: string) => {
        if (table === 'onboarding_draft') return onboardingDraftTable
        if (table === 'business_paikka_links') return businessPaikkaLinksTable
        if (table === 'liikuntapaikat') return liikuntapaikatTable
        if (table === 'business_accounts') return businessAccountsTable
        return onboardingDraftTable
      },
    },
  }
})

// ---------------------------------------------------------------------------
// Import the route handler AFTER mocks are set up
// ---------------------------------------------------------------------------
import { POST } from '@/app/api/business/onboarding/submit/route'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/business/onboarding/submit', {
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

const BASE_DRAFT = {
  paikka_id: 1,
  business_account_id: 'user-123',
  hinnasto: [],
  aukioloajat: null,
  yhteystiedot: {},
  media_urls: {},
  liikuntapaikat: { nimi: 'Test Paikka', osoite: 'Testikatu 1', kaupunki: 'Tampere', laji: null, latitude: 0, longitude: 0, aukioloajat: null },
}

function setAuthSuccess() {
  mockGetUser.mockResolvedValue({ data: { user: VALID_USER }, error: null })
}

function setOwnershipApproved() {
  mockLinkMaybeSingle.mockResolvedValue({ data: { id: 1, link_type: 'created' }, error: null })
}

function setUpdateSuccess() {
  mockUpdateLiikuntapaikatEq.mockReturnValue({ error: null })
}

function setNonCriticalSuccess() {
  mockLinkUpdateEq.mockReturnValue({ error: null })
  mockDraftDeleteEq.mockReturnValue({ error: null })
  mockBizSingle.mockResolvedValue({ data: { companies: { name: 'Test Oy' } }, error: null })
  mockPaikkaSingle.mockResolvedValue({ data: { nimi: 'Test Paikka' }, error: null })
}

describe('POST /api/business/onboarding/submit — draft.laji conditional spread (AI-06)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('writes confirmed laji into liikuntapaikat when draft.laji is set', async () => {
    setAuthSuccess()
    mockDraftMaybeSingle.mockResolvedValue({ data: { ...BASE_DRAFT, laji: 'padel' }, error: null })
    setOwnershipApproved()
    setUpdateSuccess()
    setNonCriticalSuccess()

    const req = makeRequest({ paikka_id: 1 }, VALID_AUTH_HEADER)
    const res = await POST(req)
    expect(res.status).toBe(200)

    expect(mockUpdateLiikuntapaikat).toHaveBeenCalledTimes(1)
    const [updateArgs] = mockUpdateLiikuntapaikat.mock.calls[0]
    expect(updateArgs.laji).toBe('padel')
  })

  it('does not overwrite laji when draft.laji is falsy (key absent, not null)', async () => {
    setAuthSuccess()
    mockDraftMaybeSingle.mockResolvedValue({ data: { ...BASE_DRAFT, laji: null }, error: null })
    setOwnershipApproved()
    setUpdateSuccess()
    setNonCriticalSuccess()

    const req = makeRequest({ paikka_id: 1 }, VALID_AUTH_HEADER)
    const res = await POST(req)
    expect(res.status).toBe(200)

    expect(mockUpdateLiikuntapaikat).toHaveBeenCalledTimes(1)
    const [updateArgs] = mockUpdateLiikuntapaikat.mock.calls[0]
    expect('laji' in updateArgs).toBe(false)
  })

  it('still writes existing fields (hinta_kuvaus, aukioloajat, image_url) regardless of laji', async () => {
    setAuthSuccess()
    mockDraftMaybeSingle.mockResolvedValue({
      data: {
        ...BASE_DRAFT,
        laji: null,
        aukioloajat: { monday: { open: '09:00', close: '17:00' } },
        media_urls: { photos: ['https://example.com/p1.jpg'], logo: 'https://example.com/logo.png' },
      },
      error: null,
    })
    setOwnershipApproved()
    setUpdateSuccess()
    setNonCriticalSuccess()

    const req = makeRequest({ paikka_id: 1 }, VALID_AUTH_HEADER)
    const res = await POST(req)
    expect(res.status).toBe(200)

    const [updateArgs] = mockUpdateLiikuntapaikat.mock.calls[0]
    expect(updateArgs.hinta_kuvaus).toBe('10€ / kerta')
    expect(updateArgs.aukioloajat).toEqual({ monday: { open: '09:00', close: '17:00' } })
    expect(updateArgs.image_url).toBe('https://example.com/p1.jpg')
  })
})
