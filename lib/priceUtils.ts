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
