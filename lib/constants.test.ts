import { describe, it, expect } from 'vitest'
import { TAMPERE, SUOMI_KAUPUNGIT } from './constants'

describe('TAMPERE', () => {
  it('is unchanged with lat 61.4978 and lng 23.761', () => {
    expect(TAMPERE.lat).toBe(61.4978)
    expect(TAMPERE.lng).toBe(23.761)
  })
})

describe('SUOMI_KAUPUNGIT', () => {
  it('exports exactly 25 cities', () => {
    expect(SUOMI_KAUPUNGIT).toHaveLength(25)
  })

  it('starts with Helsinki as the first city', () => {
    expect(SUOMI_KAUPUNGIT[0].nimi).toBe('Helsinki')
  })

  it('ends with Kouvola as the last city', () => {
    expect(SUOMI_KAUPUNGIT[24].nimi).toBe('Kouvola')
  })

  it('has Tampere with correct coordinates matching TAMPERE constant', () => {
    const tampere = SUOMI_KAUPUNGIT.find(c => c.nimi === 'Tampere')
    expect(tampere).toBeDefined()
    expect(tampere!.lat).toBe(61.4978)
    expect(tampere!.lng).toBe(23.7610)
  })

  it('has Helsinki with correct coordinates', () => {
    const helsinki = SUOMI_KAUPUNGIT.find(c => c.nimi === 'Helsinki')
    expect(helsinki).toBeDefined()
    expect(helsinki!.lat).toBe(60.1699)
    expect(helsinki!.lng).toBe(24.9384)
  })

  it('every city has nimi, lat, and lng fields', () => {
    for (const city of SUOMI_KAUPUNGIT) {
      expect(typeof city.nimi).toBe('string')
      expect(typeof city.lat).toBe('number')
      expect(typeof city.lng).toBe('number')
    }
  })
})
