import { describe, it, expect } from 'vitest'
import { buildBrandingPreview, type BrandingResult } from './brandingResult'
import { type PaikkaBase } from '@/lib/onboardingUtils'

const paikkaBase: PaikkaBase = {
  nimi: 'Testihalli',
  laji: 'kuntosali',
  osoite: null,
  kaupunki: null,
  latitude: null,
  longitude: null,
}

function brandingResultWithHours(
  hours: Array<{ day: string; open: string; close: string }>,
): BrandingResult {
  return {
    status: 'analyzed',
    logo_url: null,
    logo_type: null,
    colors: null,
    logo_candidates: null,
    image_urls: null,
    selected_logo_url: null,
    selected_background_color: null,
    selected_accent_color: null,
    raw_analysis: {
      prices: [],
      opening_hours: hours,
      website_url: '',
    },
    error_message: null,
    suggested_laji: null,
  }
}

describe('buildBrandingPreview — opening_hours day-key translation', () => {
  it('translates Finnish day abbreviations from the AI prompt into English weekday keys', () => {
    const result = buildBrandingPreview(
      paikkaBase,
      brandingResultWithHours([{ day: 'Ma', open: '09:00', close: '17:00' }]),
      1,
    )
    expect(result.aukioloajat).toEqual({ monday: { open: '09:00', close: '17:00' } })
    expect(result.aukioloajat).not.toHaveProperty('Ma')
  })

  it('passes through an already-English day key unchanged (defensive fallback)', () => {
    const result = buildBrandingPreview(
      paikkaBase,
      brandingResultWithHours([{ day: 'monday', open: '09:00', close: '17:00' }]),
      1,
    )
    expect(result.aukioloajat).toEqual({ monday: { open: '09:00', close: '17:00' } })
  })
})
