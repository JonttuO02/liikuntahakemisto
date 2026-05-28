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

  it('strips angle brackets and other non-allowed characters', () => {
    // <> are stripped; word chars in 'script' remain — this is expected/correct behavior
    expect(sanitizeKotikaupunki('Tampere<script>')).toBe('Tamperescript')
    // Emoji and other special chars are stripped entirely
    expect(sanitizeKotikaupunki('Tampere🔥')).toBe('Tampere')
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
