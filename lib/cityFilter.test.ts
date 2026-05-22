import { describe, it, expect } from 'vitest'
import { deriveKaupungit } from './cityFilter'

describe('deriveKaupungit', () => {
  it('palauttaa ["Kaikki"] tyhjällä syötteellä', () => {
    expect(deriveKaupungit([])).toEqual(['Kaikki'])
  })

  it('palauttaa ["Kaikki", "Tampere"] yhdellä kaupungilla', () => {
    expect(deriveKaupungit([{ kaupunki: 'Tampere' }])).toEqual(['Kaikki', 'Tampere'])
  })

  it('poistaa duplikaatit — ["Kaikki", "Tampere"] kahdesta samasta kaupungista', () => {
    expect(deriveKaupungit([{ kaupunki: 'Tampere' }, { kaupunki: 'Tampere' }])).toEqual(['Kaikki', 'Tampere'])
  })

  it('järjestää aakkosittain — Helsinki, Tampere, Turku', () => {
    expect(
      deriveKaupungit([
        { kaupunki: 'Turku' },
        { kaupunki: 'Helsinki' },
        { kaupunki: 'Tampere' },
      ])
    ).toEqual(['Kaikki', 'Helsinki', 'Tampere', 'Turku'])
  })

  it('jättää null-kaupungin pois listasta', () => {
    expect(deriveKaupungit([{ kaupunki: null }, { kaupunki: 'Tampere' }])).toEqual(['Kaikki', 'Tampere'])
  })

  it('jättää tyhjän merkkijonon pois listasta', () => {
    expect(deriveKaupungit([{ kaupunki: '' }, { kaupunki: 'Tampere' }])).toEqual(['Kaikki', 'Tampere'])
  })

  it('jättää pelkkää välilyöntiä sisältävän merkkijonon pois listasta (Pitfall 6)', () => {
    expect(deriveKaupungit([{ kaupunki: '   ' }, { kaupunki: 'Tampere' }])).toEqual(['Kaikki', 'Tampere'])
  })

  it('palauttaa ["Kaikki"] kun kaikki kaupungit ovat null', () => {
    expect(deriveKaupungit([{ kaupunki: null }])).toEqual(['Kaikki'])
  })

  it('deduplikoi sentinel "Kaikki" vs. DB-rivi jolla on arvo "Kaikki"', () => {
    expect(deriveKaupungit([{ kaupunki: 'Kaikki' }])).toEqual(['Kaikki'])
  })
})
