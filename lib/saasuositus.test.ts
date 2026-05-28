import { describe, it, expect } from 'vitest'
import { buildReissuKonteksti } from './buildReissuKonteksti'
import { sanitizeKotikaupunki } from './sanitizeKotikaupunki'

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

describe('sanitizeKotikaupunki', () => {
  it('returns undefined for empty string input', () => {
    expect(sanitizeKotikaupunki('')).toBeUndefined()
  })

  it('returns undefined for whitespace-only input', () => {
    expect(sanitizeKotikaupunki('  ')).toBeUndefined()
  })

  it('returns sanitized city name for valid input', () => {
    expect(sanitizeKotikaupunki('Tampere')).toBe('Tampere')
  })

  it('strips special characters not in the allowed set', () => {
    expect(sanitizeKotikaupunki('Tampere<script>')).toBe('Tampere')
  })

  it('truncates to 80 characters', () => {
    const long = 'A'.repeat(100)
    const result = sanitizeKotikaupunki(long)
    expect(result).toHaveLength(80)
  })

  it('allows Finnish characters ÄäÖöÅå', () => {
    expect(sanitizeKotikaupunki('Äänekoski')).toBe('Äänekoski')
  })
})
