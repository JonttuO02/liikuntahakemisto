import { describe, it, expect } from 'vitest'
import { haversineKm, nearestKaupunki } from './geo'

describe('haversineKm', () => {
  it('returns approximately 0 for the same coordinates', () => {
    expect(haversineKm(61.4978, 23.761, 61.4978, 23.761)).toBeCloseTo(0, 5)
  })

  it('returns correct distance between Tampere and Helsinki (~166 km)', () => {
    const d = haversineKm(61.4978, 23.761, 60.1699, 24.9384)
    expect(d).toBeGreaterThan(155)
    expect(d).toBeLessThan(175)
  })
})

describe('nearestKaupunki', () => {
  it('returns Tampere for Tampere coordinates', () => {
    expect(nearestKaupunki(61.4978, 23.761)).toBe('Tampere')
  })

  it('returns Helsinki for Helsinki coordinates', () => {
    expect(nearestKaupunki(60.1699, 24.9384)).toBe('Helsinki')
  })

  it('returns Turku for Turku coordinates', () => {
    expect(nearestKaupunki(60.4518, 22.2666)).toBe('Turku')
  })

  it('returns Oulu for Oulu coordinates', () => {
    expect(nearestKaupunki(65.0121, 25.4651)).toBe('Oulu')
  })

  it('returns a string', () => {
    const result = nearestKaupunki(62.0, 25.0)
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})
