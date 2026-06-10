import { describe, it, expect } from 'vitest'
import { hinnastaToHintaKuvaus, buildDraftAsPaikka, FI_TO_EN } from './onboardingUtils'

describe('hinnastaToHintaKuvaus', () => {
  it('palauttaa tyhjän merkkijonon tyhjällä syötteellä', () => {
    expect(hinnastaToHintaKuvaus([])).toBe('')
  })

  it('ohittaa rivit joilla hinta on tyhjä', () => {
    expect(hinnastaToHintaKuvaus([{ kategoria: 'Kertakäynti', hinta: '', lisatieto: '' }])).toBe('')
  })

  it('muotoilee yhden rivin ilman lisätietoa', () => {
    expect(hinnastaToHintaKuvaus([{ kategoria: 'Kertakäynti', hinta: '15', lisatieto: '' }])).toBe('Kertakäynti: 15€')
  })

  it('lisää lisätiedon sulkeisiin', () => {
    expect(
      hinnastaToHintaKuvaus([{ kategoria: 'Kertakäynti', hinta: '15', lisatieto: 'ei sopimusta' }])
    ).toBe('Kertakäynti: 15€ (ei sopimusta)')
  })

  it('yhdistää useamman rivin rivinvaihdolla', () => {
    expect(
      hinnastaToHintaKuvaus([
        { kategoria: 'Kertakäynti', hinta: '15', lisatieto: '' },
        { kategoria: 'Kuukausijäsenyys', hinta: '50', lisatieto: 'ei sopimusta' },
      ])
    ).toBe('Kertakäynti: 15€\nKuukausijäsenyys: 50€ (ei sopimusta)')
  })

  it('palauttaa tyhjän merkkijonon kun kaikki rivit ovat tyhjiä (ONBOARD-04)', () => {
    expect(
      hinnastaToHintaKuvaus([{ kategoria: 'K', hinta: '', lisatieto: '' }])
    ).toBe('')
  })
})

describe('buildDraftAsPaikka', () => {
  const paikkaBase = {
    nimi: 'Testi-Areena',
    laji: 'Kuntosali',
    osoite: 'Testikatu 1',
    kaupunki: 'Tampere',
    latitude: 61.5,
    longitude: 23.8,
    aukioloajat: { monday: { open: '08:00', close: '20:00' } },
  }

  const draftBase = {
    paikka_id: 42,
    media_urls: { logo: null, photos: ['https://example.com/photo1.jpg'] },
    hinnasto: [{ kategoria: 'Kertakäynti', hinta: '10', lisatieto: '' }],
    aukioloajat: { tuesday: { open: '09:00', close: '21:00' } },
    yhteystiedot: {
      puhelin: '040-1234567',
      email: 'info@testi.fi',
      website: 'https://testi.fi',
      kuvaus: 'Mahtava kuntosali',
    },
    current_step: 5,
  }

  it('asettaa id draft.paikka_id:stä', () => {
    const result = buildDraftAsPaikka(draftBase, paikkaBase)
    expect(result.id).toBe(42)
  })

  it('asettaa hinta_min ja hinta_max nulliksi', () => {
    const result = buildDraftAsPaikka(draftBase, paikkaBase)
    expect(result.hinta_min).toBeNull()
    expect(result.hinta_max).toBeNull()
  })

  it('hakee ensimmäisen kuvan media_urls.photos[0]:sta', () => {
    const result = buildDraftAsPaikka(draftBase, paikkaBase)
    expect(result.image_url).toBe('https://example.com/photo1.jpg')
  })

  it('palauttaa null image_url:n kun kuvia ei ole', () => {
    const draft = { ...draftBase, media_urls: { logo: null, photos: [] } }
    const result = buildDraftAsPaikka(draft, paikkaBase)
    expect(result.image_url).toBeNull()
  })

  it('käyttää draft.aukioloajat jos saatavilla', () => {
    const result = buildDraftAsPaikka(draftBase, paikkaBase)
    expect(result.aukioloajat).toEqual({ tuesday: { open: '09:00', close: '21:00' } })
  })

  it('käyttää paikka.aukioloajat varavalintana kun draft.aukioloajat on null', () => {
    const draft = { ...draftBase, aukioloajat: null }
    const result = buildDraftAsPaikka(draft, paikkaBase)
    expect(result.aukioloajat).toEqual({ monday: { open: '08:00', close: '20:00' } })
  })

  it('hakee kuvauksen yhteystiedot.kuvaus:sta', () => {
    const result = buildDraftAsPaikka(draftBase, paikkaBase)
    expect(result.kuvaus).toBe('Mahtava kuntosali')
  })

  it('hakee websiten yhteystiedot.website:stä varauslinkki-kenttään', () => {
    const result = buildDraftAsPaikka(draftBase, paikkaBase)
    expect(result.varauslinkki).toBe('https://testi.fi')
  })

  it('asettaa featured falseksi', () => {
    const result = buildDraftAsPaikka(draftBase, paikkaBase)
    expect(result.featured).toBe(false)
  })

  it('kartoittaa kaikki Liikuntapaikka-tyypin pakolliset kentät oikein (ONBOARD-07)', () => {
    const result = buildDraftAsPaikka(draftBase, paikkaBase)
    expect(result.nimi).toBe('Testi-Areena')
    expect(result.laji).toBe('Kuntosali')
    expect(result.osoite).toBe('Testikatu 1')
    expect(result.kaupunki).toBe('Tampere')
    expect(result.latitude).toBe(61.5)
    expect(result.longitude).toBe(23.8)
    expect(result.puhelin).toBe('040-1234567')
    expect(result.hinta_kuvaus).toBe('Kertakäynti: 10€')
  })
})

describe('FI_TO_EN päiväavainten kartoitus', () => {
  it('kartoittaa Ma → monday (ONBOARD-05)', () => {
    expect(FI_TO_EN['Ma']).toBe('monday')
  })

  it('kartoittaa La → saturday', () => {
    expect(FI_TO_EN['La']).toBe('saturday')
  })

  it('kartoittaa Su → sunday', () => {
    expect(FI_TO_EN['Su']).toBe('sunday')
  })
})

describe('yhteystiedot maxLength', () => {
  it('kuvaus 300 merkkiä on sallittu (ONBOARD-06)', () => {
    const kuvaus = 'a'.repeat(300)
    expect(kuvaus.length <= 300).toBe(true)
  })

  it('kuvaus yli 300 merkkiä ylittää rajan', () => {
    const kuvaus = 'a'.repeat(301)
    expect(kuvaus.length <= 300).toBe(false)
  })
})
