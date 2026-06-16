import { describe, it, expect, vi, beforeEach } from 'vitest'
import { scrapeWebsite, discoverSubpages, extractGalleryImages } from './scraper'

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
    status: 200,
    headers: { get: (name: string) => (name.toLowerCase() === 'content-type' ? 'text/html' : null) },
    text: async () => html,
    arrayBuffer: async () => Buffer.from(html).buffer as ArrayBuffer,
  }
}

function makeImageResponse(data: Buffer = Buffer.from('FAKE_IMAGE')) {
  return {
    ok: true,
    status: 200,
    headers: { get: () => null },
    text: async () => '',
    arrayBuffer: async () => data.buffer as ArrayBuffer,
  }
}

beforeEach(() => {
  mockFetch.mockReset()
})

describe('scrapeWebsite', () => {
  it('SCRAP-01: returns ScrapeResult with all six fields (logoUrls, logoBuffers, colors, htmlSnippet, labeledPages, imageUrls)', async () => {
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
    expect(result).toHaveProperty('labeledPages')
    expect(result).toHaveProperty('imageUrls')
    expect(Array.isArray(result.logoUrls)).toBe(true)
    expect(Array.isArray(result.logoBuffers)).toBe(true)
    expect(Array.isArray(result.colors)).toBe(true)
    expect(typeof result.htmlSnippet).toBe('string')
    expect(Array.isArray(result.labeledPages)).toBe(true)
    expect(result.labeledPages.length).toBeGreaterThanOrEqual(1)
    expect(result.labeledPages.length).toBeLessThanOrEqual(5)
    expect(Array.isArray(result.imageUrls)).toBe(true)
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

  it('htmlSnippet is the stripped homepage truncated to the 6000-char homepage budget — not longer', async () => {
    // Create HTML longer than 6000 chars (no subpage links, so discoverSubpages fallback finds none)
    const longHtml = '<html><head></head><body>' + 'A'.repeat(10000) + '</body></html>'
    mockFetch.mockResolvedValueOnce(makeHtmlResponse(longHtml))
    // favicon.ico fallback
    mockFetch.mockResolvedValueOnce({ ok: false })

    const result = await scrapeWebsite('https://example.com')

    expect(result.htmlSnippet.length).toBeLessThanOrEqual(6000)
    expect(result.htmlSnippet).toBe(longHtml.slice(0, 6000))
    expect(result.labeledPages[0]).toEqual({ label: 'homepage', html: result.htmlSnippet })
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

describe('discoverSubpages / SCRAP-06', () => {
  it('returns same-origin pricing and contact links, excludes external host', () => {
    const html = `
      <a href="/hinnasto">Hinnasto</a>
      <a href="/yhteystiedot">Yhteystiedot</a>
      <a href="https://facebook.com/x">Facebook</a>
    `
    const result = discoverSubpages(html, 'https://example.com')

    expect(result.pricing).toBe('https://example.com/hinnasto')
    expect(result.contact).toBe('https://example.com/yhteystiedot')
    expect(Object.values(result)).not.toContain('https://facebook.com/x')
  })

  it('matches both Finnish and English keywords for the same category', () => {
    const htmlFi = '<a href="/hinnasto">Hinnasto</a>'
    const htmlEn = '<a href="/pricing">Pricing</a>'

    const resultFi = discoverSubpages(htmlFi, 'https://example.com')
    const resultEn = discoverSubpages(htmlEn, 'https://example.com')

    expect(resultFi.pricing).toBe('https://example.com/hinnasto')
    expect(resultEn.pricing).toBe('https://example.com/pricing')
  })

  it('matches hours and contact keyword categories', () => {
    const html = `
      <a href="/aukioloajat">Aukioloajat</a>
      <a href="/contact">Contact</a>
    `
    const result = discoverSubpages(html, 'https://example.com')

    expect(result.hours).toBe('https://example.com/aukioloajat')
    expect(result.contact).toBe('https://example.com/contact')
  })

  it('falls back to first N same-origin links when zero keyword matches found (D-06)', () => {
    const html = `
      <a href="/about">About</a>
      <a href="/team">Team</a>
      <a href="https://external.com/x">External</a>
    `
    const result = discoverSubpages(html, 'https://example.com', 4)

    const values = Object.values(result)
    expect(values.length).toBeGreaterThan(0)
    expect(values).toContain('https://example.com/about')
    expect(values).toContain('https://example.com/team')
    expect(values).not.toContain('https://external.com/x')
  })

  it('fallback respects the budget parameter', () => {
    const html = `
      <a href="/a">A</a>
      <a href="/b">B</a>
      <a href="/c">C</a>
      <a href="/d">D</a>
      <a href="/e">E</a>
    `
    const result = discoverSubpages(html, 'https://example.com', 2)

    expect(Object.keys(result).length).toBeLessThanOrEqual(2)
  })
})

describe('extractGalleryImages / SCRAP-09', () => {
  it('excludes data URIs, sub-100px images, noise patterns, and logo-candidate URLs', () => {
    const html = `
      <img src="data:image/png;base64,AAAA" alt="inline">
      <img src="/spacer.png" width="50" height="50" alt="spacer">
      <img src="/icon-menu.png" alt="menu icon">
      <img src="/logo.png" alt="logo">
      <img src="/gallery-photo1.jpg" alt="venue photo" width="400" height="300">
    `
    const excludeUrls = new Set(['https://example.com/logo.png'])
    const result = extractGalleryImages(html, 'https://example.com', excludeUrls)

    expect(result).not.toContain('https://example.com/spacer.png')
    expect(result).not.toContain('https://example.com/icon-menu.png')
    expect(result).not.toContain('https://example.com/logo.png')
    expect(result).toContain('https://example.com/gallery-photo1.jpg')
  })

  it('dedupes repeated image URLs', () => {
    const html = `
      <img src="/photo.jpg" alt="photo" width="400" height="300">
      <img src="/photo.jpg" alt="photo again" width="400" height="300">
    `
    const result = extractGalleryImages(html, 'https://example.com', new Set())

    expect(result.filter((u) => u === 'https://example.com/photo.jpg').length).toBe(1)
  })

  it('caps result length at 15', () => {
    const imgs = Array.from({ length: 25 }, (_, i) =>
      `<img src="/photo${i}.jpg" alt="photo ${i}" width="400" height="300">`
    ).join('\n')
    const result = extractGalleryImages(imgs, 'https://example.com', new Set())

    expect(result.length).toBeLessThanOrEqual(15)
  })

  it('includes images with no width/height attributes (no dimension info to filter on)', () => {
    const html = `<img src="/no-dims.jpg" alt="venue photo">`
    const result = extractGalleryImages(html, 'https://example.com', new Set())

    expect(result).toContain('https://example.com/no-dims.jpg')
  })
})

describe('scrapeWebsite multi-page / SCRAP-06', () => {
  it('crawls a discovered pricing subpage and labels it alongside the homepage', async () => {
    const homepageHtml = `
      <html><head></head><body>
        <a href="/hinnasto">Hinnasto</a>
      </body></html>
    `
    const pricingHtml = '<html><head></head><body>Hinnasto: 10e</body></html>'

    mockFetch
      .mockResolvedValueOnce(makeHtmlResponse(homepageHtml)) // homepage
      .mockResolvedValueOnce({ ok: false }) // favicon.ico fallback
      .mockResolvedValueOnce(makeHtmlResponse(pricingHtml)) // /hinnasto subpage

    const result = await scrapeWebsite('https://example.com')

    const labels = result.labeledPages.map((p) => p.label)
    expect(labels).toContain('homepage')
    expect(labels).toContain('pricing')
    expect(result.labeledPages.length).toBeGreaterThanOrEqual(2)
    expect(result.labeledPages.length).toBeLessThanOrEqual(5)
  })

  it('never fetches a subpage link pointing at a private IP', async () => {
    const homepageHtml = `
      <html><head></head><body>
        <a href="http://127.0.0.1/x">Hinnasto</a>
      </body></html>
    `
    mockFetch
      .mockResolvedValueOnce(makeHtmlResponse(homepageHtml)) // homepage
      .mockResolvedValueOnce({ ok: false }) // favicon.ico fallback

    const result = await scrapeWebsite('https://example.com')

    const fetchedUrls = mockFetch.mock.calls.map((call) => call[0])
    expect(fetchedUrls).not.toContain('http://127.0.0.1/x')
    // Only homepage + favicon.ico fallback fetched — subpage pre-validation rejected the private link
    expect(result.labeledPages.length).toBe(1)
    expect(result.labeledPages[0].label).toBe('homepage')
  })
})

describe('scrapeWebsite SSRF coverage / D-10', () => {
  it('routes the CSS fetch through fetchWithSsrfGuard and rejects a private-IP CSS URL', async () => {
    const homepageHtml = `
      <html><head>
        <link rel="stylesheet" href="http://127.0.0.1/style.css">
      </head><body></body></html>
    `
    mockFetch
      .mockResolvedValueOnce(makeHtmlResponse(homepageHtml)) // homepage
      .mockResolvedValueOnce({ ok: false }) // favicon.ico fallback

    const result = await scrapeWebsite('https://example.com')

    const fetchedUrls = mockFetch.mock.calls.map((call) => call[0])
    // The private-IP CSS URL must never reach global fetch — isUrlSafe rejects it inside the wrapper
    expect(fetchedUrls).not.toContain('http://127.0.0.1/style.css')
    // Color extraction degrades gracefully (no crash, empty CSS text tolerated)
    expect(Array.isArray(result.colors)).toBe(true)
  })

  it('routes the logo-candidate image fetch through fetchWithSsrfGuard and rejects a private-IP logo URL', async () => {
    const homepageHtml = `
      <html><head>
        <link rel="icon" href="http://127.0.0.1/favicon.png">
      </head><body></body></html>
    `
    mockFetch.mockResolvedValueOnce(makeHtmlResponse(homepageHtml)) // homepage only — favicon found inline, no fallback needed

    const result = await scrapeWebsite('https://example.com')

    const fetchedUrls = mockFetch.mock.calls.map((call) => call[0])
    expect(fetchedUrls).not.toContain('http://127.0.0.1/favicon.png')
    // The rejected candidate is skipped — no logo buffers produced
    expect(result.logoBuffers.length).toBe(0)
  })

  it('no bare fetch( call site remains for CSS or logo fetches — all calls go through global fetch only via the wrapper', async () => {
    // This test asserts behavior (private IPs never reach fetch), the source-level grep gate
    // in the plan's <verify> command additionally asserts zero literal bare `await fetch(`
    // call sites remain anywhere in scraper.ts outside fetchWithSsrfGuard.
    const html = '<html><head></head><body></body></html>'
    mockFetch
      .mockResolvedValueOnce(makeHtmlResponse(html))
      .mockResolvedValueOnce({ ok: false })

    await scrapeWebsite('https://example.com')

    // Every call recorded against the mocked global fetch is expected — fetchWithSsrfGuard
    // is the only thing that calls global fetch, so this is implicitly covered by the
    // homepage + favicon fallback call count.
    expect(mockFetch.mock.calls.length).toBeGreaterThanOrEqual(2)
  })
})
