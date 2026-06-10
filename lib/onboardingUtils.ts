import type { Liikuntapaikka } from '@/lib/types'

// ─── Type exports ────────────────────────────────────────────────────────────

export type OnboardingDraft = {
  paikka_id: number
  media_urls?: { logo: string | null; photos: string[] } | null
  hinnasto?: Array<{ kategoria: string; hinta: string; lisatieto?: string }> | null
  aukioloajat?: Record<string, { open: string; close: string }> | null
  yhteystiedot?: {
    puhelin?: string
    email?: string
    website?: string
    kuvaus?: string
  } | null
  current_step?: number
}

export type PaikkaBase = {
  nimi: string
  laji: string
  osoite: string | null
  kaupunki: string | null
  latitude: number | null
  longitude: number | null
  aukioloajat?: Record<string, { open: string; close: string }> | null
}

// ─── Day key mapping (Pitfall 5 prevention) ──────────────────────────────────

/** Maps Finnish UI abbreviations to English storage keys used by lib/aukiolo.ts */
export const FI_TO_EN: Record<string, string> = {
  'Ma': 'monday',
  'Ti': 'tuesday',
  'Ke': 'wednesday',
  'To': 'thursday',
  'Pe': 'friday',
  'La': 'saturday',
  'Su': 'sunday',
}

/** Ordered English day keys matching lib/aukiolo.ts ORDERED_DAYS */
export const ORDERED_DAYS: string[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

// ─── Pure utility functions ───────────────────────────────────────────────────

/**
 * hinnastaToHintaKuvaus — serializes wizard pricing rows into the hinta_kuvaus
 * TEXT format consumed by lib/priceUtils.ts (newline-separated price items).
 *
 * Format: "Kategoria: hinta€ (lisätieto)" per non-empty row, joined with '\n'.
 * Rows with an empty hinta string are filtered out.
 *
 * ONBOARD-04: returns '' when no rows have a non-empty hinta — callers use this
 * to gate the "Seuraava" button.
 */
export function hinnastaToHintaKuvaus(
  hinnasto: Array<{ kategoria: string; hinta: string; lisatieto?: string }>
): string {
  return hinnasto
    .filter(row => row.hinta.trim() !== '')
    .map(row => {
      const lisatieto = row.lisatieto?.trim()
      return `${row.kategoria}: ${row.hinta}€${lisatieto ? ` (${lisatieto})` : ''}`
    })
    .join('\n')
}

/**
 * buildDraftAsPaikka — constructs a Liikuntapaikka object from onboarding draft
 * data plus the base venue record. Used by StepEsikatselu to render PaikkaKortti
 * and DiagonaalKortti with the business-supplied data without a Supabase round-trip.
 *
 * Field mapping:
 * - id: draft.paikka_id
 * - nimi/laji/osoite/kaupunki/latitude/longitude: from paikka (not editable in wizard)
 * - hinta_min/hinta_max: always null (pricing shown via hinta_kuvaus)
 * - hinta_kuvaus: constructed via hinnastaToHintaKuvaus
 * - aukioloajat: draft.aukioloajat ?? paikka.aukioloajat (fallback to Google Places data)
 * - kuvaus/puhelin/varauslinkki: from draft.yhteystiedot
 * - image_url: first photo URL from draft.media_urls.photos
 * - featured: always false (business venues are not featured during onboarding)
 *
 * ONBOARD-07: maps all required Liikuntapaikka fields.
 */
export function buildDraftAsPaikka(draft: OnboardingDraft, paikka: PaikkaBase): Liikuntapaikka {
  return {
    id: draft.paikka_id,
    nimi: paikka.nimi,
    laji: paikka.laji,
    osoite: paikka.osoite,
    kaupunki: paikka.kaupunki,
    latitude: paikka.latitude,
    longitude: paikka.longitude,
    hinta_min: null,
    hinta_max: null,
    varauslinkki: draft.yhteystiedot?.website ?? null,
    kuvaus: draft.yhteystiedot?.kuvaus ?? null,
    puhelin: draft.yhteystiedot?.puhelin ?? null,
    hinta_kuvaus: hinnastaToHintaKuvaus(draft.hinnasto ?? []),
    aukioloajat: draft.aukioloajat ?? paikka.aukioloajat ?? null,
    image_url: draft.media_urls?.photos?.[0] ?? null,
    logo_url: draft.media_urls?.logo ?? null,
    photo_urls: draft.media_urls?.photos ?? null,
    featured: false,
  }
}
