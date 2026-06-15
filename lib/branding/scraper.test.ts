import { describe, it, expect } from 'vitest'

// scraper.ts does not exist yet — stubs fail until Wave 1 implements it
let scrapeWebsite: (url: string) => Promise<unknown>
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  scrapeWebsite = require('./scraper').scrapeWebsite
} catch {
  scrapeWebsite = async () => { throw new Error('MISSING_IMPL') }
}

describe('scrapeWebsite', () => {
  it('SCRAP-01: fetches HTML with Mozilla User-Agent', async () => {
    throw new Error('MISSING_IMPL')
  })

  it('SCRAP-02: extracts hex colors from theme-color and :root CSS vars', async () => {
    throw new Error('MISSING_IMPL')
  })

  it('SCRAP-03: collects logo candidates in priority order (favicon, og:image, img[*=logo])', async () => {
    throw new Error('MISSING_IMPL')
  })

  it('SCRAP-05: converts logo candidates to PNG base64 via sharp (max 512px)', async () => {
    throw new Error('MISSING_IMPL')
  })
})
