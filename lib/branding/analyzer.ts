// Server-only. Never import in client components.

import Anthropic from '@anthropic-ai/sdk'
import { BRANDING_ANALYSIS_PROMPT } from './prompt'
import { lajiKonfig } from '@/lib/lajit'

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

export type LogoType = 'wordmark' | 'icon' | 'combination' | 'unknown'
export type ColorRole = 'background' | 'primary' | 'secondary' | 'accent' | 'text' | 'unknown'

export interface LabeledPage {
  label: string
  html: string
}

export interface BrandingAnalysisResult {
  logos: Array<{ index: number; type: LogoType }>       // every distinct logo variant found
  colors: Array<{ hex: string; role: ColorRole }>        // role-tagged colors, most prominent first, max 6
  prices: Array<{ label: string; price: string; source_page: string }>
  opening_hours: Array<{ day: string; open: string; close: string; source_page: string }>
  website_url: string                                    // canonical URL from HTML; "" if not found
  raw_analysis: unknown                                  // full parsed JSON for raw_analysis column

  // Backward-compat (additive, RESEARCH.md Pitfall 5): keeps Plan 47-05's existing
  // upload/UPSERT path and the Phase-46 GET consumer working until Phase 48.
  logo_index: number                                     // = logos[0]?.index ?? -1

  // AI-06: raw AI-suggested sport-category key, allowlist-validated against the
  // live lib/lajit.ts taxonomy. null on omission/mismatch (D-03) — never a sentinel.
  suggested_laji: string | null
}

const VALID_LOGO_TYPES: LogoType[] = ['wordmark', 'icon', 'combination', 'unknown']
const VALID_COLOR_ROLES: ColorRole[] = ['background', 'primary', 'secondary', 'accent', 'text', 'unknown']
const VALID_LAJI_KEYS: string[] = Object.keys(lajiKonfig)

export async function analyzeWithClaude(
  logoCandidatesBuffers: Buffer[],
  labeledPages: LabeledPage[],
  screenshot?: Buffer | null
): Promise<BrandingAnalysisResult> {
  try {
    // 1. Convert each logo candidate Buffer to raw base64 — NO data:image/png;base64, prefix
    const base64Images = logoCandidatesBuffers.map((buf) => buf.toString('base64'))

    // 2. Build content array — images BEFORE text (official best practice).
    // If a homepage screenshot is provided, it is prepended before the logo
    // candidate images (image-before-text, screenshot-before-logos ordering).
    const logoImageItems = base64Images.map((b64) => ({
      type: 'image' as const,
      source: {
        type: 'base64' as const,
        media_type: 'image/png' as const,
        data: b64,
      },
    }))

    const screenshotItem = screenshot
      ? [
          {
            type: 'image' as const,
            source: {
              type: 'base64' as const,
              media_type: 'image/png' as const,
              data: screenshot.toString('base64'),
            },
          },
        ]
      : []

    const imageItems = [...screenshotItem, ...logoImageItems]

    const pagesText = labeledPages
      .map((p) => '[PAGE: ' + p.label + ']\n' + p.html)
      .join('\n\n')

    const textItem = {
      type: 'text' as const,
      text: BRANDING_ANALYSIS_PROMPT + '\n\n' + pagesText,
    }

    const contentArray = [...imageItems, textItem]

    // 3. Call Claude Haiku — no temperature parameter per D-09
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{ role: 'user', content: contentArray }],
    })

    // 4. Extract text from first text content block
    const block = response.content.find((b) => b.type === 'text')
    const rawText = block && block.type === 'text' ? block.text : ''

    // 5. Parse JSON (strips markdown fences if present)
    const result = parseClaudeJson(rawText) as {
      logos?: Array<{ index?: unknown; type?: unknown }>
      colors?: Array<{ hex?: unknown; role?: unknown }>
      prices?: Array<{ label?: unknown; price?: unknown; source_page?: unknown }>
      opening_hours?: Array<{ day?: unknown; open?: unknown; close?: unknown; source_page?: unknown }>
      website_url?: unknown
      laji?: unknown
    }

    // 6. Validate logos: drop out-of-bounds indexes, default invalid types to 'unknown'
    const rawLogos = Array.isArray(result.logos) ? result.logos : []
    const logos: BrandingAnalysisResult['logos'] = rawLogos
      .filter(
        (l): l is { index: number; type?: unknown } =>
          typeof l?.index === 'number' &&
          Number.isInteger(l.index) &&
          l.index >= 0 &&
          l.index < logoCandidatesBuffers.length
      )
      .map((l) => ({
        index: l.index,
        type: VALID_LOGO_TYPES.includes(l.type as LogoType) ? (l.type as LogoType) : 'unknown',
      }))

    // 7. Validate colors: filter to valid hex strings (WR-04 style), default invalid roles to 'unknown', max 6
    const rawColors = Array.isArray(result.colors) ? result.colors : []
    const colors: BrandingAnalysisResult['colors'] = rawColors
      .filter(
        (c): c is { hex: string; role?: unknown } =>
          typeof c?.hex === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(c.hex)
      )
      .map((c) => ({
        hex: c.hex,
        role: VALID_COLOR_ROLES.includes(c.role as ColorRole) ? (c.role as ColorRole) : 'unknown',
      }))
      .slice(0, 6)

    // 8. Validate prices: coerce source_page to string (default '')
    const rawPrices = Array.isArray(result.prices) ? result.prices : []
    const prices: BrandingAnalysisResult['prices'] = rawPrices.map((p) => ({
      label: typeof p?.label === 'string' ? p.label : '',
      price: typeof p?.price === 'string' ? p.price : '',
      source_page: typeof p?.source_page === 'string' ? p.source_page : '',
    }))

    // 9. Validate opening_hours: coerce source_page to string (default '')
    const rawHours = Array.isArray(result.opening_hours) ? result.opening_hours : []
    const opening_hours: BrandingAnalysisResult['opening_hours'] = rawHours.map((h) => ({
      day: typeof h?.day === 'string' ? h.day : '',
      open: typeof h?.open === 'string' ? h.open : '',
      close: typeof h?.close === 'string' ? h.close : '',
      source_page: typeof h?.source_page === 'string' ? h.source_page : '',
    }))

    // CR-02: guard against non-string website_url (Claude may return null or number)
    const website_url = typeof result.website_url === 'string' ? result.website_url : ''

    // 10. Validate laji: discard to null on any mismatch/omission (D-03) — NOT a
    // sentinel like the logo/color 'unknown' path, because the UI's unconfirmed
    // state keys on suggested_laji === null (AI-06 criterion 1).
    const rawLaji = typeof result.laji === 'string' ? result.laji : null
    const suggested_laji: string | null = rawLaji && VALID_LAJI_KEYS.includes(rawLaji) ? rawLaji : null

    // Backward-compat: logo_index derived from the first logo entry
    const logo_index = logos[0]?.index ?? -1

    return {
      logos,
      colors,
      prices,
      opening_hours,
      website_url,
      raw_analysis: result,
      logo_index,
      suggested_laji,
    }
  } catch (err) {
    console.error('[branding/analyzer] error:', err)
    throw err
  }
}
