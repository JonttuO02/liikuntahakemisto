import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mock @anthropic-ai/sdk ───────────────────────────────────────────────────
// vi.mock is hoisted to the top by vitest. The factory must be self-contained.
// We store the mock via a module-level import after mocking.

vi.mock('@anthropic-ai/sdk', () => {
  const createFn = vi.fn().mockResolvedValue({
    content: [
      {
        type: 'text',
        text: '{"logo_index":0,"logo_type":"icon","colors":["#3b82f6"],"prices":[],"opening_hours":[],"website_url":""}',
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

function makeOkResponse(overrides: Record<string, unknown> = {}) {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          logo_index: 0,
          logo_type: 'icon',
          colors: ['#3b82f6'],
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
    const result = await analyzeWithClaude(buffers, '<html>Test site</html>')

    expect(result).toMatchObject({
      logo_index: 0,
      logo_type: 'icon',
      colors: ['#3b82f6'],
      prices: [],
      opening_hours: [],
      website_url: '',
    })
    expect(result.raw_analysis).toBeDefined()
  })

  it('SCRAP-04: returns prices array when Claude returns prices', async () => {
    mockCreate.mockResolvedValue(
      makeOkResponse({ prices: [{ label: 'Aikuinen', price: '12 €' }] })
    )

    const result = await analyzeWithClaude(makeBuffers(1), '<html>Prices here</html>')

    expect(result.prices).toEqual([{ label: 'Aikuinen', price: '12 €' }])
  })

  it('SCRAP-04: returns opening_hours array when Claude returns opening hours', async () => {
    mockCreate.mockResolvedValue(
      makeOkResponse({
        opening_hours: [{ day: 'Ma', open: '07:00', close: '21:00' }],
      })
    )

    const result = await analyzeWithClaude(makeBuffers(1), '<html>Hours here</html>')

    expect(result.opening_hours).toEqual([{ day: 'Ma', open: '07:00', close: '21:00' }])
  })

  it('SCRAP-04: throws when Claude returns logo_index >= candidate count (out-of-bounds)', async () => {
    mockCreate.mockResolvedValue(makeOkResponse({ logo_index: 5 }))

    // 3 candidates, but Claude returns index 5 — out of bounds
    await expect(analyzeWithClaude(makeBuffers(3), '<html></html>')).rejects.toThrow(
      'out-of-bounds logo_index'
    )
  })

  it('SCRAP-04: throws when Claude returns logo_index below -1', async () => {
    mockCreate.mockResolvedValue(makeOkResponse({ logo_index: -2, logo_type: 'unknown' }))

    await expect(analyzeWithClaude(makeBuffers(2), '<html></html>')).rejects.toThrow(
      'out-of-bounds logo_index'
    )
  })

  it('SCRAP-04: handles Claude JSON wrapped in markdown code fences', async () => {
    const jsonStr = JSON.stringify({
      logo_index: 0,
      logo_type: 'combination',
      colors: ['#ff0000'],
      prices: [],
      opening_hours: [],
      website_url: 'https://example.fi',
    })
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: '```json\n' + jsonStr + '\n```' }],
    })

    const result = await analyzeWithClaude(makeBuffers(1), '<html>Test</html>')

    expect(result.logo_index).toBe(0)
    expect(result.logo_type).toBe('combination')
    expect(result.colors).toEqual(['#ff0000'])
    expect(result.website_url).toBe('https://example.fi')
  })

  it('SCRAP-04: content array sent to Claude has image items BEFORE the text item', async () => {
    const buffers = makeBuffers(2)
    await analyzeWithClaude(buffers, '<html>HTML here</html>')

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
    await analyzeWithClaude(buffers, '<html>Test</html>')

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
