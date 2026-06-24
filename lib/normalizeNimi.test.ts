import { describe, it, expect } from 'vitest'
import { normalizeNimi } from './normalizeNimi'

describe('normalizeNimi', () => {
  it('trimmaa ja tiivistää sisäiset välilyönnit', () => {
    expect(normalizeNimi('  FitLife   Oy  ')).toBe('FitLife Oy')
  })

  it('säilyttää kirjainkoon muuttumattomana — ei toLowerCase/toUpperCase', () => {
    expect(normalizeNimi('CrossFit')).toBe('CrossFit')
  })

  it('palauttaa tyhjän merkkijonon tyhjällä syötteellä', () => {
    expect(normalizeNimi('')).toBe('')
  })

  it('palauttaa tyhjän merkkijonon null-syötteellä (falsy guard)', () => {
    expect(normalizeNimi(null as never)).toBe('')
  })

  it('katkaisee 200 merkin pituuteen', () => {
    const input = 'a'.repeat(250)
    const result = normalizeNimi(input)
    expect(result.length).toBe(200)
  })

  it('käsittelee rivinvaihdon/sarkaimen välilyöntinä ja trimmaa/tiivistää sen', () => {
    expect(normalizeNimi('\n\tFitLife\t\nOy\n\t')).toBe('FitLife Oy')
  })
})
