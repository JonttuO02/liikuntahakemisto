/**
 * brandingResult.ts — Client-safe branding types and utilities.
 *
 * This file is intentionally server-free: no 'use server', no Node.js APIs,
 * no imports from server-only modules (e.g. lib/branding/analyzer.ts).
 * It can be imported from any client component.
 *
 * Exports:
 *   - BrandingResult: client-safe subset of BrandingAnalysisResult
 *   - getContrastColor: YIQ-based text colour utility (D-BR-03)
 *   - buildBrandingPreview: constructs a Liikuntapaikka preview object (D-ES-02)
 */

import type { Liikuntapaikka } from '@/lib/types'
import { type PaikkaBase, hinnastaToHintaKuvaus, FI_TO_EN } from '@/lib/onboardingUtils'

// ─── BrandingResult ───────────────────────────────────────────────────────────

/**
 * BrandingResult — client-safe representation of the analyse-website API
 * response (GET /api/business/analyze-website).
 *
 * Shape mirrors the JSON returned by the GET Route Handler (D-PA-02), reshaped
 * in Phase 48 to mirror the live `.select(...)` column list exactly: status,
 * logo_url, colors, logo_type, logo_candidates, image_urls,
 * selected_background_color, selected_accent_color, raw_analysis,
 * error_message, analyzed_at.
 * raw_analysis is kept as a nested object so steps 3–5 can read prices,
 * opening_hours, and website_url without destructuring the full server type.
 */
export type BrandingResult = {
  status: 'pending' | 'analyzing' | 'analyzed' | 'failed'
  logo_url: string | null
  logo_type: string | null
  /** Plural AI-extracted brand colors with a semantic role per Phase 47's analyzer prompt. */
  colors: Array<{ hex: string; role: string }> | null
  /** Logo candidates Claude identified on the page — the user picks one in Phase 48's logo picker. */
  logo_candidates: Array<{ url: string; type: string }> | null
  /** Scraped gallery image URLs (Supabase Storage, capped at MAX_GALLERY_UPLOADS) the user can pick from. */
  image_urls: string[] | null
  /** User-selected logo URL, persisted via PATCH /api/business/branding. */
  selected_logo_url: string | null
  /** User-selected background color, persisted via PATCH /api/business/branding. */
  selected_background_color: string | null
  /** User-selected accent color, persisted via PATCH /api/business/branding. */
  selected_accent_color: string | null
  raw_analysis: {
    prices: Array<{ label: string; price: string; source_page?: string }>
    opening_hours: Array<{ day: string; open: string; close: string; source_page?: string }>
    website_url: string
  } | null
  error_message: string | null
  /** AI-06: raw AI-suggested sport-category key from the lib/lajit.ts taxonomy, or null (unconfirmed/no signal). */
  suggested_laji: string | null
}

// ─── getContrastColor ─────────────────────────────────────────────────────────

/**
 * getContrastColor — returns '#000000' (black) or '#ffffff' (white) based on
 * the perceived luminance (YIQ formula) of the given hex colour.
 *
 * Used by DiagonaalKortti to ensure the venue name and price text are readable
 * regardless of the brand's primary colour (D-BR-03).
 *
 * @param hex - Hex colour string with or without leading '#' (e.g. '#3b82f6' or '3b82f6')
 * @returns '#000000' when the colour is light (yiq >= 128), '#ffffff' when dark
 */
export function getContrastColor(hex: string): '#000000' | '#ffffff' {
  // Strip leading '#' if present
  let clean = hex.replace(/^#/, '')

  // Expand 3-char shorthand to 6-char (e.g. 'fff' → 'ffffff')
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('')
  }

  // Parse R, G, B as 2-character hex segments; treat NaN as 0 (malformed input guard)
  const r = parseInt(clean.substring(0, 2), 16) || 0
  const g = parseInt(clean.substring(2, 4), 16) || 0
  const b = parseInt(clean.substring(4, 6), 16) || 0

  // YIQ perceived luminance formula (ITU-R BT.601 coefficients)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000

  return yiq >= 128 ? '#000000' : '#ffffff'
}

// ─── buildBrandingPreview ─────────────────────────────────────────────────────

/**
 * buildBrandingPreview — constructs a Liikuntapaikka preview object from
 * venue base data and the branding analysis result (D-ES-02).
 *
 * Used by the pre-phase esikatseluruutu and step 6 (StepEsikatselu) to
 * render DiagonaalKortti and CalloutCard without a Supabase round-trip.
 *
 * Field mapping:
 * - id: draftPaikkaId (numeric venue id from business_paikka_links)
 * - nimi/laji/osoite/kaupunki/latitude/longitude: always from paikkaBase
 * - logo_url: brandingResult.logo_url (may be null — DiagonaalKortti shows Building2 icon as fallback per D-BR-04)
 * - hinta_kuvaus: serialised from raw_analysis.prices via hinnastaToHintaKuvaus
 * - aukioloajat: converted from raw_analysis.opening_hours Array → Record<day, {open,close}>
 * - varauslinkki: raw_analysis.website_url (or null)
 * - business_managed: true (shows verification badge in preview)
 *
 * Note: background/accent color are NOT embedded in the returned Liikuntapaikka
 * — Phase 48 sources them from `selected_background_color`/`selected_accent_color`
 * (persisted via PATCH /api/business/branding) and passes them separately as the
 * `brandColor` prop to DiagonaalKortti (D-BR-02).
 *
 * @param paikkaBase    - Venue name, sport type, address, and coordinates
 * @param brandingResult - Analysis result from GET /api/business/analyze-website
 * @param draftPaikkaId - Numeric id of the venue row in liikuntapaikat
 * @param selectedLogoUrl - Optional user-selected logo URL (Phase 48 logo picker). When
 *   provided, takes precedence over brandingResult.logo_url; existing callers that omit
 *   this argument keep the original logo_url fallback unaffected.
 */
export function buildBrandingPreview(
  paikkaBase: PaikkaBase,
  brandingResult: BrandingResult,
  draftPaikkaId: number,
  selectedLogoUrl?: string | null,
): Liikuntapaikka {
  // Convert opening_hours Array<{day,open,close}> → Record<string, {open,close}>
  // Day strings from the API are Finnish abbreviations (lib/branding/prompt.ts), so
  // translate through FI_TO_EN to the English weekday keys lib/aukiolo.ts expects.
  const aukioloajat: Record<string, { open: string; close: string }> | null =
    brandingResult.raw_analysis?.opening_hours?.length
      ? Object.fromEntries(
          brandingResult.raw_analysis.opening_hours.map(entry => [
            FI_TO_EN[entry.day] ?? entry.day,
            { open: entry.open, close: entry.close },
          ]),
        )
      : null

  // Convert prices Array<{label,price}> → hinnastaToHintaKuvaus format
  const hinta_kuvaus: string =
    brandingResult.raw_analysis?.prices?.length
      ? hinnastaToHintaKuvaus(
          brandingResult.raw_analysis.prices.map(p => ({
            kategoria: p.label,
            hinta: p.price,
            lisatieto: '',
          })),
        )
      : ''

  return {
    id: draftPaikkaId,
    nimi: paikkaBase.nimi,
    laji: paikkaBase.laji,
    osoite: paikkaBase.osoite,
    kaupunki: paikkaBase.kaupunki,
    latitude: paikkaBase.latitude,
    longitude: paikkaBase.longitude,
    hinta_min: null,
    hinta_max: null,
    varauslinkki: brandingResult.raw_analysis?.website_url ?? null,
    kuvaus: null,
    puhelin: null,
    hinta_kuvaus,
    aukioloajat,
    image_url: null,
    logo_url: selectedLogoUrl ?? brandingResult.logo_url,
    photo_urls: null,
    featured: false,
    business_managed: true,
  }
}
