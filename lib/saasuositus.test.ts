import { describe, it, expect } from 'vitest'
import { buildReissuKonteksti } from './buildReissuKonteksti'

describe('buildReissuKonteksti', () => {
  it('appends context when cities differ', () => {
    const result = buildReissuKonteksti('Tampere', 'Helsinki')
    expect(result).toContain('kotikaupunkinsa on Tampere')
  })

  it('returns empty string when cities match (case-insensitive)', () => {
    expect(buildReissuKonteksti('tampere', 'Tampere')).toBe('')
  })

  it('returns empty string when kotikaupunki is undefined', () => {
    expect(buildReissuKonteksti(undefined, 'Tampere')).toBe('')
  })

  it('returns empty string when kotikaupunki is whitespace-only after trim', () => {
    expect(buildReissuKonteksti('   ', 'Tampere')).toBe('')
  })

  it('returns empty string when kotikaupunki matches kaupunki in reverse case', () => {
    expect(buildReissuKonteksti('Tampere', 'tampere')).toBe('')
  })
})
