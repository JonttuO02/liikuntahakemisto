import { describe, it, expect } from 'vitest'
import { resolveLocale } from './i18nUtils'

describe('resolveLocale', () => {
  it('palauttaa "fi" kun raw on undefined (ei cookiea)', () => {
    expect(resolveLocale(undefined)).toBe('fi')
  })

  it('palauttaa "fi" kun raw on "fi"', () => {
    expect(resolveLocale('fi')).toBe('fi')
  })

  it('palauttaa "en" kun raw on "en"', () => {
    expect(resolveLocale('en')).toBe('en')
  })

  it('palauttaa "fi" tuntemattomalle lokaaliarvolla (esim. "de")', () => {
    expect(resolveLocale('de')).toBe('fi')
  })

  it('palauttaa "fi" tyhjälle merkkijonolle', () => {
    expect(resolveLocale('')).toBe('fi')
  })

  it('palauttaa "fi" polkutraversaaliyritykselle ("../etc/passwd")', () => {
    expect(resolveLocale('../etc/passwd')).toBe('fi')
  })
})
