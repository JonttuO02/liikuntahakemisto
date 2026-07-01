import { describe, it, expect } from 'vitest'
import { buildBrandingPreview, getPanelShade, darkenHex, lightenHex, type BrandingResult } from './brandingResult'
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

describe('getPanelShade', () => {
  it('darkens a light brandColor (e.g. white) so the result differs from the input', () => {
    const result = getPanelShade('#ffffff')
    expect(result).not.toBe('#ffffff')
  })

  it('lightens a dark brandColor (e.g. black) so the result differs from the input', () => {
    const result = getPanelShade('#000000')
    expect(result).not.toBe('#000000')
  })

  it('never equals the input brandColor for a representative set of light and dark hexes', () => {
    const brandColors = ['#4f46e5', '#e2e8f0', '#111111']
    for (const brandColor of brandColors) {
      expect(getPanelShade(brandColor)).not.toBe(brandColor)
    }
  })

  it('passes through malformed (non-hex) input unchanged, matching darkenHex/lightenHex guard behavior', () => {
    expect(getPanelShade('not-a-color')).toBe('not-a-color')
  })
})

describe('darkenHex / lightenHex', () => {
  it('darkenHex clamps channels within 0-255 and returns a valid #rrggbb', () => {
    const result = darkenHex('#808080', 0.3)
    expect(result).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('lightenHex clamps channels within 0-255 and returns a valid #rrggbb', () => {
    const result = lightenHex('#808080', 0.3)
    expect(result).toMatch(/^#[0-9a-f]{6}$/i)
  })
})
