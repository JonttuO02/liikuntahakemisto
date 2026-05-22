import { describe, it, expect } from 'vitest'
import { isMembershipOnly } from './priceUtils'

describe('isMembershipOnly', () => {
  it('palauttaa true kun hinta_kuvaus sisältää "jäsenyys" ja hinnat ovat null', () => {
    expect(isMembershipOnly({ hinta_kuvaus: 'jäsenyys vaaditaan', hinta_min: null, hinta_max: null })).toBe(true)
  })

  it('palauttaa true isolla alkukirjaimella "Jäsenyys" (case-insensitive)', () => {
    expect(isMembershipOnly({ hinta_kuvaus: 'Jäsenyys 50€/v', hinta_min: null, hinta_max: null })).toBe(true)
  })

  it('palauttaa true isoilla kirjaimilla "JÄSENYYS" (case-insensitive)', () => {
    expect(isMembershipOnly({ hinta_kuvaus: 'Vain JÄSENYYS', hinta_min: null, hinta_max: null })).toBe(true)
  })

  it('palauttaa false kun hinta_min on asetettu vaikka hinta_kuvaus sisältää "jäsenyys"', () => {
    expect(isMembershipOnly({ hinta_kuvaus: 'jäsenyys vaaditaan', hinta_min: 20, hinta_max: null })).toBe(false)
  })

  it('palauttaa false kun hinta_max on asetettu vaikka hinta_kuvaus sisältää "jäsenyys"', () => {
    expect(isMembershipOnly({ hinta_kuvaus: 'jäsenyys vaaditaan', hinta_min: null, hinta_max: 30 })).toBe(false)
  })

  it('palauttaa false kun hinta_kuvaus ei sisällä "jäsenyys"', () => {
    expect(isMembershipOnly({ hinta_kuvaus: 'kertakäynti 8€', hinta_min: null, hinta_max: null })).toBe(false)
  })

  it('palauttaa false kun hinta_kuvaus on null (Pitfall 2: ei vahvistusta)', () => {
    expect(isMembershipOnly({ hinta_kuvaus: null, hinta_min: null, hinta_max: null })).toBe(false)
  })

  it('palauttaa false kun hinta_kuvaus on tyhjä merkkijono', () => {
    expect(isMembershipOnly({ hinta_kuvaus: '', hinta_min: null, hinta_max: null })).toBe(false)
  })

  it('palauttaa true kun hinta_kuvaus sisältää "jäsenyys" osana pidempää tekstiä (osajono)', () => {
    expect(isMembershipOnly({ hinta_kuvaus: 'kertakäynti 8€, jäsenyys 50€/v', hinta_min: null, hinta_max: null })).toBe(true)
  })
})
