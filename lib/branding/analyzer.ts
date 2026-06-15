// Server-only. Never import in client components.

import Anthropic from '@anthropic-ai/sdk'
import { BRANDING_ANALYSIS_PROMPT } from './prompt'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

/**
 * Strips optional markdown code fences from Claude's response and parses JSON.
 * Claude sometimes wraps JSON in ```json ... ``` or ``` ... ``` fences.
 */
function parseClaudeJson(raw: string): unknown {
  const cleaned = raw
    .replace(/^```(?:json)?\n?/, '')
    .replace(/\n?```$/, '')
    .trim()
  return JSON.parse(cleaned)
}

export interface BrandingAnalysisResult {
  logo_index: number                                             // 0-based index; -1 = no suitable logo
  logo_type: 'wordmark' | 'icon' | 'combination' | 'unknown'
  colors: string[]                                               // hex color strings (most important first)
  prices: Array<{ label: string; price: string }>               // extracted prices; [] if none found
  opening_hours: Array<{ day: string; open: string; close: string }>  // extracted hours; [] if none found
  website_url: string                                            // canonical URL from HTML; "" if not found
  raw_analysis: unknown                                          // full parsed JSON for raw_analysis column
}

export async function analyzeWithClaude(
  logoCandidatesBuffers: Buffer[],
  htmlSnippet: string
): Promise<BrandingAnalysisResult> {
  try {
    // 1. Convert each Buffer to raw base64 — NO data:image/png;base64, prefix
    const base64Images = logoCandidatesBuffers.map((buf) => buf.toString('base64'))

    // 2. Build content array — images BEFORE text (official best practice)
    const imageItems = base64Images.map((b64) => ({
      type: 'image' as const,
      source: {
        type: 'base64' as const,
        media_type: 'image/png' as const,
        data: b64,
      },
    }))

    const textItem = {
      type: 'text' as const,
      text: BRANDING_ANALYSIS_PROMPT + '\n\nHTML snippet:\n' + htmlSnippet,
    }

    const contentArray = [...imageItems, textItem]

    // 3. Call Claude Haiku — no temperature parameter per D-09
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages: [{ role: 'user', content: contentArray }],
    })

    // 4. Extract text from first text content block
    const block = response.content.find((b) => b.type === 'text')
    const rawText = block && block.type === 'text' ? block.text : ''

    // 5. Parse JSON (strips markdown fences if present)
    const result = parseClaudeJson(rawText) as {
      logo_index: number
      logo_type: string
      colors: string[]
      prices: Array<{ label: string; price: string }>
      opening_hours: Array<{ day: string; open: string; close: string }>
      website_url: string
    }

    // 6. Validate logo_index bounds — -1 is valid (no suitable logo)
    if (
      result.logo_index !== -1 &&
      (result.logo_index < 0 || result.logo_index >= logoCandidatesBuffers.length)
    ) {
      throw new Error(
        'Claude returned out-of-bounds logo_index: ' + result.logo_index
      )
    }

    // 7. Return structured result — validate all Claude-returned fields at runtime
    const VALID_LOGO_TYPES: BrandingAnalysisResult['logo_type'][] = ['wordmark', 'icon', 'combination', 'unknown']
    const rawLogoType = result.logo_type
    const logo_type: BrandingAnalysisResult['logo_type'] =
      VALID_LOGO_TYPES.includes(rawLogoType as BrandingAnalysisResult['logo_type'])
        ? (rawLogoType as BrandingAnalysisResult['logo_type'])
        : 'unknown'

    // CR-02: guard against non-string website_url (Claude may return null or number)
    const website_url = typeof result.website_url === 'string' ? result.website_url : ''

    // WR-04: filter colors to only valid hex strings
    const colors = Array.isArray(result.colors)
      ? result.colors.filter((c): c is string => typeof c === 'string' && /^#[0-9a-fA-F]{3,6}$/.test(c))
      : []

    return {
      logo_index: result.logo_index,
      logo_type,
      colors,
      prices: result.prices ?? [],
      opening_hours: result.opening_hours ?? [],
      website_url,
      raw_analysis: result,
    }
  } catch (err) {
    console.error('[branding/analyzer] error:', err)
    throw err
  }
}
