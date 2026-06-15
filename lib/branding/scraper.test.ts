import { describe, it, expect, vi, beforeEach } from 'vitest'
import { scrapeWebsite } from './scraper'

// Mock global fetch so tests never make real network calls
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock sharp so tests never require the native binary
vi.mock('sharp', () => {
  const sharpInstanceMock = {
    resize: vi.fn().mockReturnThis(),
    png: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('PNG_DATA')),
  }
  const sharpMock = vi.fn().mockImplementation(() => sharpInstanceMock)
  return { default: sharpMock }
})

function makeHtmlResponse(html: string) {
  return {
    ok: true,
    text: async () => html,
    arrayBuffer: async () => Buffer.from(html).buffer as ArrayBuffer,
  }
}

function makeImageResponse(data: Buffer = Buffer.from('FAKE_IMAGE')) {
  return {
    ok: true,
    text: async () => '',
    arrayBuffer: async () => data.buffer as ArrayBuffer,
  }
}

beforeEach(() => {
  mockFetch.mockReset()
})

describe('scrapeWebsite', () => {
  it('SCRAP-01: returns ScrapeResult with all four fields (logoUrls, logoBuffers, colors, htmlSnippet)', async () => {
    const html = '<html><head></head><body>Hello</body></html>'
    // First call: HTML fetch; no CSS links, no logos
    mockFetch.mockResolvedValueOnce(makeHtmlResponse(html))
    // favicon.ico fallback fetch attempt
    mockFetch.mockResolvedValueOnce({ ok: false })

    const result = await scrapeWebsite('https://example.com')

    expect(result).toHaveProperty('logoUrls')
    expect(result).toHaveProperty('logoBuffers')
    expect(result).toHaveProperty('colors')
    expect(result).toHaveProperty('htmlSnippet')
    expect(Array.isArray(result.logoUrls)).toBe(true)
    expect(Array.isArray(result.logoBuffers)).toBe(true)
    expect(Array.isArray(result.colors)).toBe(true)
    expect(typeof result.htmlSnippet).toBe('string')
  })

  it('SCRAP-02: extracts hex color from <meta name="theme-color">', async () => {
    const html = '<html><head><meta name="theme-color" content="#ff5500"></head><body></body></html>'
    mockFetch.mockResolvedValueOnce(makeHtmlResponse(html))
    // favicon.ico fallback
    mockFetch.mockResolvedValueOnce({ ok: false })

    const result = await scrapeWebsite('https://example.com')

    expect(result.colors).toContain('#ff5500')
  })

  it('SCRAP-02: extracts hex colors from CSS :root variables', async () => {
    const html = `<html><head>
      <link rel="stylesheet" href="/style.css">
    </head><body></body></html>`
    const css = `:root { --primary-color: #3b82f6; --secondary: #abc; }`

    mockFetch
      .mockResolvedValueOnce(makeHtmlResponse(html))  // HTML fetch
      .mockResolvedValueOnce({ ok: true, text: async () => css })  // CSS fetch
    // favicon.ico fallback
    mockFetch.mockResolvedValueOnce({ ok: false })

    const result = await scrapeWebsite('https://example.com')

    expect(result.colors).toContain('#3b82f6')
    expect(result.colors).toContain('#abc')
  })

  it('SCRAP-02: colors array contains only #-prefixed hex strings', async () => {
    const html = `<html><head>
      <meta name="theme-color" content="#ff5500">
      <link rel="stylesheet" href="/style.css">
    </head><body></body></html>`
    const css = `:root { --color: #3b82f6; --other: red; --rgb: rgb(0,0,0); }`

    mockFetch
      .mockResolvedValueOnce(makeHtmlResponse(html))
      .mockResolvedValueOnce({ ok: true, text: async () => css })
    // favicon.ico fallback
    mockFetch.mockResolvedValueOnce({ ok: false })

    const result = await scrapeWebsite('https://example.com')

    for (const color of result.colors) {
      expect(color).toMatch(/^#[0-9a-fA-F]{3,6}$/)
    }
  })

  it('SCRAP-03: logoUrls max length is 5 even when HTML contains more logo candidates', async () => {
    // Build HTML with 10 img[*=logo] candidates
    const imgs = Array.from({ length: 10 }, (_, i) =>
      `<img src="/logo${i}.png" alt="logo ${i}">`
    ).join('\n')
    const html = `<html><head></head><body>${imgs}</body></html>`

    // HTML fetch
    mockFetch.mockResolvedValueOnce(makeHtmlResponse(html))
    // favicon.ico fallback (ok: false means no favicon)
    mockFetch.mockResolvedValueOnce({ ok: false })
    // Up to 5 logo fetches - return fake images (no favicon, so first 5 logo imgs)
    for (let i = 0; i < 5; i++) {
      mockFetch.mockResolvedValueOnce(makeImageResponse())
    }

    const result = await scrapeWebsite('https://example.com')

    expect(result.logoUrls.length).toBeLessThanOrEqual(5)
  })

  it('htmlSnippet is exactly html.slice(0, 8000) — not longer', async () => {
    // Create HTML longer than 8000 chars
    const longHtml = '<html><head></head><body>' + 'A'.repeat(10000) + '</body></html>'
    mockFetch.mockResolvedValueOnce(makeHtmlResponse(longHtml))
    // favicon.ico fallback
    mockFetch.mockResolvedValueOnce({ ok: false })

    const result = await scrapeWebsite('https://example.com')

    expect(result.htmlSnippet.length).toBeLessThanOrEqual(8000)
    expect(result.htmlSnippet).toBe(longHtml.slice(0, 8000))
  })

  it('SCRAP-05: sharp failure is caught — invalid buffer does not crash scraper and candidate is skipped', async () => {
    // Override sharp mock to throw on toBuffer call
    const sharpModule = await import('sharp')
    const sharpFn = sharpModule.default as unknown as ReturnType<typeof vi.fn>
    sharpFn.mockImplementationOnce(() => ({
      resize: vi.fn().mockReturnThis(),
      png: vi.fn().mockReturnThis(),
      toBuffer: vi.fn().mockRejectedValueOnce(new Error('Input file is missing')),
    }))

    const html = '<html><head></head><body><img src="/logo.png" alt="logo"></body></html>'
    mockFetch
      .mockResolvedValueOnce(makeHtmlResponse(html))  // HTML
      .mockResolvedValueOnce({ ok: false })             // favicon.ico — not found
      .mockResolvedValueOnce(makeImageResponse())       // logo.png fetch

    // Should not throw even if sharp fails
    const result = await scrapeWebsite('https://example.com')
    // The failing candidate should be skipped (not included in logoBuffers)
    expect(result.logoBuffers.length).toBe(0)
  })
})
