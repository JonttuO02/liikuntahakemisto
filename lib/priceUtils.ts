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
 * Palauttaa hinta_kuvauksen ei-tyhjät rivit taulukkona, kun rivejä on 2 tai enemmän
 * ja kohde ei ole pelkästään jäsenyys. Muussa tapauksessa palauttaa null.
 *
 * Logiikka:
 *   1. Jos membershipOnly on true, palauttaa null (jäsenyyskohteessa ei marqueeta)
 *   2. Jos hintaKuvaus on falsy (null/undefined/tyhjä), palauttaa null
 *   3. Jakaa merkkijonon rivinvaihdoilla, suodattaa pois vain välilyöntejä
 *      sisältävät rivit (l.trim().length > 0)
 *   4. Palauttaa taulukon vain jos suodatettujen rivien määrä on >= 2, muuten null
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
