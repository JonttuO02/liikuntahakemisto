import type { Liikuntapaikka } from './types'

/**
 * isMembershipOnly — D-11 heuristic (UI-05)
 *
 * Palauttaa true jos ja vain jos kaikki kolme ehtoa täyttyvät:
 *   1. hinta_kuvaus on epätyhjä merkkijono
 *   2. hinta_kuvaus sisältää (case-insensitive) osajonon "jäsenyys"
 *   3. sekä hinta_min että hinta_max ovat null
 *
 * Pitfall 2: jos hinta_kuvaus on null tai tyhjä, palauttaa false
 * (ei ole vahvistavaa näyttöä jäsenyydestä).
 */
export function isMembershipOnly(
  p: Pick<Liikuntapaikka, 'hinta_kuvaus' | 'hinta_min' | 'hinta_max'>
): boolean {
  const kuvaus = p.hinta_kuvaus
  if (!kuvaus) return false
  if (!kuvaus.toLowerCase().includes('jäsenyys')) return false
  if (kuvaus.toLowerCase().includes('kertakäynti')) return false
  if (p.hinta_min !== null || p.hinta_max !== null) return false
  return true
}

/**
 * marqueePriceLines — UI-25 marquee guard (D-17/D-18)
 *
 * @deprecated Käytä flatPriceText + useOverflowMarquee DOM-mittaukseen.
 * Pidetään paikoillaan testien ja vanhan API-yhteensopivuuden vuoksi.
 */
export function marqueePriceLines(
  hintaKuvaus: string | null | undefined,
  membershipOnly: boolean
): string[] | null {
  if (membershipOnly) return null
  if (!hintaKuvaus) return null
  const lines = hintaKuvaus.split('\n').filter(l => l.trim().length > 0)
  return lines.length >= 2 ? lines : null
}

/**
 * flatPriceText — yhdistää hinta_kuvauksen rivit yhdelle riville (UI-25 v2)
 * @deprecated Käytä priceItemList + pill-layout.
 */
export function flatPriceText(
  hintaKuvaus: string | null | undefined,
  membershipOnly: boolean,
  hintaTeksti: string
): string | null {
  if (membershipOnly) return null
  if (hintaKuvaus) {
    const lines = hintaKuvaus.split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length > 0) return lines.join(' · ')
  }
  return hintaTeksti !== '' ? hintaTeksti : null
}

/**
 * priceItemList — palauttaa hintarivit taulukkona pill-layoutia varten.
 * Palauttaa null jos jäsenyyskokonaan tai ei hintatietoja.
 */
export function priceItemList(
  hintaKuvaus: string | null | undefined,
  membershipOnly: boolean,
  hintaTeksti: string
): string[] | null {
  if (membershipOnly) return null
  if (hintaKuvaus) {
    // Split by newline first, then by ", " within each line.
    // Finnish decimals use "," without space (e.g. "3,50 €"), so ", " safely
    // separates distinct price items without breaking decimal numbers.
    const items = hintaKuvaus
      .split('\n')
      .flatMap(line => line.trim().split(', '))
      .map(s => s.trim())
      .filter(Boolean)
    if (items.length > 0) return items
  }
  return hintaTeksti !== '' ? [hintaTeksti] : null
}
