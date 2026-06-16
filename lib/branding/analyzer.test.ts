import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mock @anthropic-ai/sdk ───────────────────────────────────────────────────
// vi.mock is hoisted to the top by vitest. The factory must be self-contained.
// We store the mock via a module-level import after mocking.

vi.mock('@anthropic-ai/sdk', () => {
  const createFn = vi.fn().mockResolvedValue({
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          logos: [{ index: 0, type: 'icon' }],
          colors: [{ hex: '#3b82f6', role: 'background' }],
          prices: [],
          opening_hours: [],
          website_url: '',
        }),
      },
    ],
  })

  // Store the function reference so tests can inspect/re-mock it.
  // vi.mock factory runs in a separate scope — we use a class-style mock.
  function MockAnthropic(this: Record<string, unknown>) {
    this.messages = { create: createFn }
  }
  // Attach the spy so we can access it via the mock module
  ;(MockAnthropic as unknown as Record<string, unknown>)._mockCreate = createFn

  return { default: MockAnthropic }
})

// Import the REAL module under test (after mock is set up)
import { analyzeWithClaude } from './analyzer'
// Import the mock module to get access to _mockCreate spy
import Anthropic from '@anthropic-ai/sdk'

// ─── Retrieve the shared mockCreate spy ──────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockCreate = (Anthropic as unknown as Record<string, any>)._mockCreate as ReturnType<typeof vi.fn>

// ─── Test helpers ─────────────────────────────────────────────────────────────
function makeBuffers(count: number): Buffer[] {
  return Array.from({ length: count }, (_, i) => Buffer.from(`fake-png-data-${i}`))
}

function makeLabeledPages(overrides?: Array<{ label: string; html: string }>) {
  return overrides ?? [{ label: 'homepage', html: '<html>Test site</html>' }]
}

function makeOkResponse(overrides: Record<string, unknown> = {}) {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          logos: [{ index: 0, type: 'icon' }],
          colors: [{ hex: '#3b82f6', role: 'background' }],
          prices: [],
          opening_hours: [],
          website_url: '',
          ...overrides,
        }),
      },
    ],
  }
}

describe('analyzeWithClaude', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreate.mockResolvedValue(makeOkResponse())
  })

  it('SCRAP-04: returns BrandingAnalysisResult when Claude mock returns valid JSON', async () => {
    const buffers = makeBuffers(2)
    const result = await analyzeWithClaude(buffers, makeLabeledPages())

    expect(result).toMatchObject({
      logos: [{ index: 0, type: 'icon' }],
      colors: [{ hex: '#3b82f6', role: 'background' }],
      prices: [],
      opening_hours: [],
      website_url: '',
    })
    expect(result.raw_analysis).toBeDefined()
  })

  it('SCRAP-04: returns prices array when Claude returns prices', async () => {
    mockCreate.mockResolvedValue(
      makeOkResponse({ prices: [{ label: 'Aikuinen', price: '12 €', source_page: 'pricing' }] })
    )

    const result = await analyzeWithClaude(makeBuffers(1), makeLabeledPages())

    expect(result.prices).toEqual([{ label: 'Aikuinen', price: '12 €', source_page: 'pricing' }])
  })

  it('SCRAP-04: returns opening_hours array when Claude returns opening hours', async () => {
    mockCreate.mockResolvedValue(
      makeOkResponse({
        opening_hours: [{ day: 'Ma', open: '07:00', close: '21:00', source_page: 'hours' }],
      })
    )

    const result = await analyzeWithClaude(makeBuffers(1), makeLabeledPages())

    expect(result.opening_hours).toEqual([
      { day: 'Ma', open: '07:00', close: '21:00', source_page: 'hours' },
    ])
  })

  it('SCRAP-04: handles Claude JSON wrapped in markdown code fences', async () => {
    const jsonStr = JSON.stringify({
      logos: [{ index: 0, type: 'combination' }],
      colors: [{ hex: '#ff0000', role: 'accent' }],
      prices: [],
      opening_hours: [],
      website_url: 'https://example.fi',
    })
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: '```json\n' + jsonStr + '\n```' }],
    })

    const result = await analyzeWithClaude(makeBuffers(1), makeLabeledPages())

    expect(result.logos).toEqual([{ index: 0, type: 'combination' }])
    expect(result.colors).toEqual([{ hex: '#ff0000', role: 'accent' }])
    expect(result.website_url).toBe('https://example.fi')
  })

  it('SCRAP-04: content array sent to Claude has image items BEFORE the text item', async () => {
    const buffers = makeBuffers(2)
    await analyzeWithClaude(buffers, makeLabeledPages())

    expect(mockCreate).toHaveBeenCalledOnce()
    const callArg = mockCreate.mock.calls[0][0]
    const content = callArg.messages[0].content as Array<{ type: string }>

    // Images come first, text comes last
    const firstItem = content[0]
    const lastItem = content[content.length - 1]
    expect(firstItem.type).toBe('image')
    expect(lastItem.type).toBe('text')
  })

  it('SCRAP-04: base64 data field does NOT start with data:image/png;base64, prefix', async () => {
    const buffers = [Buffer.from('fake-png')]
    await analyzeWithClaude(buffers, makeLabeledPages())

    const callArg = mockCreate.mock.calls[0][0]
    const content = callArg.messages[0].content as Array<{
      type: string
      source?: { data: string }
    }>

    const imageItems = content.filter((item) => item.type === 'image')
    expect(imageItems.length).toBe(1)

    for (const item of imageItems) {
      expect(item.source?.data).not.toMatch(/^data:image\/png;base64,/)
    }
  })
})

describe('analyzeWithClaude multi-page / SCRAP-08', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreate.mockResolvedValue(makeOkResponse())
  })

  it('drops a logo entry with an out-of-bounds index instead of crashing', async () => {
    mockCreate.mockResolvedValue(
      makeOkResponse({
        logos: [
          { index: 0, type: 'icon' },
          { index: 5, type: 'wordmark' }, // out of bounds — only 2 buffers provided
        ],
      })
    )

    const result = await analyzeWithClaude(makeBuffers(2), makeLabeledPages())

    expect(result.logos).toEqual([{ index: 0, type: 'icon' }])
  })

  it('defaults an invalid logo type to "unknown"', async () => {
    mockCreate.mockResolvedValue(
      makeOkResponse({
        logos: [{ index: 0, type: 'not-a-real-type' }],
      })
    )

    const result = await analyzeWithClaude(makeBuffers(1), makeLabeledPages())

    expect(result.logos).toEqual([{ index: 0, type: 'unknown' }])
  })

  it('filters non-hex colors and defaults an invalid role to "unknown"', async () => {
    mockCreate.mockResolvedValue(
      makeOkResponse({
        colors: [
          { hex: '#112233', role: 'background' },
          { hex: 'notahex', role: 'x' },
          { hex: '#445566', role: 'not-a-real-role' },
        ],
      })
    )

    const result = await analyzeWithClaude(makeBuffers(1), makeLabeledPages())

    expect(result.colors).toEqual([
      { hex: '#112233', role: 'background' },
      { hex: '#445566', role: 'unknown' },
    ])
  })

  it('rejects invalid 4- and 5-digit hex strings, but accepts valid 3-digit shorthand', async () => {
    mockCreate.mockResolvedValue(
      makeOkResponse({
        colors: [
          { hex: '#1234', role: 'background' },
          { hex: '#12345', role: 'background' },
          { hex: '#abc', role: 'accent' },
          { hex: '#aabbcc', role: 'accent' },
        ],
      })
    )

    const result = await analyzeWithClaude(makeBuffers(1), makeLabeledPages())

    expect(result.colors).toEqual([
      { hex: '#abc', role: 'accent' },
      { hex: '#aabbcc', role: 'accent' },
    ])
  })

  it('coerces a missing source_page on prices to an empty string, never undefined', async () => {
    mockCreate.mockResolvedValue(
      makeOkResponse({
        prices: [{ label: 'Aikuinen', price: '12 €' }], // no source_page
      })
    )

    const result = await analyzeWithClaude(makeBuffers(1), makeLabeledPages())

    expect(result.prices).toEqual([{ label: 'Aikuinen', price: '12 €', source_page: '' }])
  })

  it('coerces a missing source_page on opening_hours to an empty string, never undefined', async () => {
    mockCreate.mockResolvedValue(
      makeOkResponse({
        opening_hours: [{ day: 'Ma', open: '07:00', close: '21:00' }], // no source_page
      })
    )

    const result = await analyzeWithClaude(makeBuffers(1), makeLabeledPages())

    expect(result.opening_hours).toEqual([
      { day: 'Ma', open: '07:00', close: '21:00', source_page: '' },
    ])
  })

  it('sends a screenshot image block BEFORE the logo images and the text block when provided', async () => {
    const screenshot = Buffer.from('fake-screenshot-png')
    await analyzeWithClaude(makeBuffers(2), makeLabeledPages(), screenshot)

    const callArg = mockCreate.mock.calls[0][0]
    const content = callArg.messages[0].content as Array<{
      type: string
      source?: { data: string }
    }>

    // First item is the screenshot image block, followed by logo image blocks, then text.
    expect(content[0].type).toBe('image')
    expect(content[0].source?.data).toBe(screenshot.toString('base64'))
    expect(content[content.length - 1].type).toBe('text')
  })

  it('does not include a screenshot image block when screenshot is null/omitted', async () => {
    const buffers = makeBuffers(1)
    await analyzeWithClaude(buffers, makeLabeledPages(), null)

    const callArg = mockCreate.mock.calls[0][0]
    const content = callArg.messages[0].content as Array<{ type: string }>
    const imageItems = content.filter((item) => item.type === 'image')

    // Only the 1 logo candidate image, no screenshot block
    expect(imageItems.length).toBe(1)
  })

  it('text content includes [PAGE: <label>] sections for each labeled page', async () => {
    await analyzeWithClaude(
      makeBuffers(1),
      makeLabeledPages([
        { label: 'homepage', html: '<html>Home</html>' },
        { label: 'pricing', html: '<html>Prices</html>' },
      ])
    )

    const callArg = mockCreate.mock.calls[0][0]
    const content = callArg.messages[0].content as Array<{ type: string; text?: string }>
    const textItem = content.find((item) => item.type === 'text')

    expect(textItem?.text).toContain('[PAGE: homepage]')
    expect(textItem?.text).toContain('[PAGE: pricing]')
  })

  it('exposes backward-compat logo_index derived from logos[0]', async () => {
    mockCreate.mockResolvedValue(
      makeOkResponse({
        logos: [{ index: 1, type: 'wordmark' }],
      })
    )

    const result = await analyzeWithClaude(makeBuffers(2), makeLabeledPages())

    expect(result.logo_index).toBe(1)
  })

  it('exposes backward-compat logo_index of -1 when logos is empty', async () => {
    mockCreate.mockResolvedValue(makeOkResponse({ logos: [] }))

    const result = await analyzeWithClaude(makeBuffers(2), makeLabeledPages())

    expect(result.logo_index).toBe(-1)
  })
})
