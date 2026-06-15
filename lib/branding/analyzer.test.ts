import { describe, it, expect, vi } from 'vitest'

// Mock @anthropic-ai/sdk so tests never make live API calls
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: '{"logo_index":0,"logo_type":"icon","colors":[],"prices":[],"opening_hours":[],"website_url":""}' }],
      }),
    },
  })),
}))

// analyzer.ts does not exist yet — stubs fail until Wave 2 implements it
let analyzeWithClaude: (buffers: Buffer[], html: string) => Promise<unknown>
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  analyzeWithClaude = require('./analyzer').analyzeWithClaude
} catch {
  analyzeWithClaude = async () => { throw new Error('MISSING_IMPL') }
}

describe('analyzeWithClaude', () => {
  it('SCRAP-04: returns structured JSON with logo_index, logo_type, colors', async () => {
    throw new Error('MISSING_IMPL')
  })

  it('SCRAP-04: throws on out-of-bounds logo_index', async () => {
    throw new Error('MISSING_IMPL')
  })
})
