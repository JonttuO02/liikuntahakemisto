import { describe, it, expect } from 'vitest'
import { isMembershipOnly, marqueePriceLines } from './priceUtils'

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

  it('palauttaa false kun hinta_kuvaus sisältää sekä "kertakäynti" että "jäsenyys" (ei pelkkä jäsenyys)', () => {
    expect(isMembershipOnly({ hinta_kuvaus: 'kertakäynti 8€, jäsenyys 50€/v', hinta_min: null, hinta_max: null })).toBe(false)
  })
})

describe('marqueePriceLines', () => {
  it('palauttaa taulukon kun 2+ ei-tyhjää riviä (Testi 1)', () => {
    expect(marqueePriceLines('8€/kerta\n50€/kk', false)).toEqual(['8€/kerta', '50€/kk'])
  })

  it('palauttaa null kun vain yksi rivi (Testi 2)', () => {
    expect(marqueePriceLines('8€/kerta', false)).toBeNull()
  })

  it('palauttaa null kun hinta_kuvaus on null (Testi 3)', () => {
    expect(marqueePriceLines(null, false)).toBeNull()
  })

  it('palauttaa null kun hinta_kuvaus on undefined (Testi 4)', () => {
    expect(marqueePriceLines(undefined, false)).toBeNull()
  })

  it('suodattaa tyhjät ja pelkät välilyönnit sisältävät rivit — 2 oikeaa riviä (Testi 5)', () => {
    expect(marqueePriceLines('8€/kerta\n\n50€/kk\n   ', false)).toEqual(['8€/kerta', '50€/kk'])
  })

  it('palauttaa null kun suodatuksen jälkeen jää vain 1 rivi (Testi 6)', () => {
    expect(marqueePriceLines('8€\n   ', false)).toBeNull()
  })

  it('palauttaa null kun membershipOnly=true vaikka rivejä olisi 2+ (Testi 7)', () => {
    expect(marqueePriceLines('8€/kerta\n50€/kk', true)).toBeNull()
  })
})
