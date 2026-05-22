import type { Liikuntapaikka } from './types'

/**
 * deriveKaupungit — D-21 dedup helper (DATA-07)
 *
 * Palauttaa kaupunkilistan muodossa: ['Kaikki', ...aakkostetut uniikit kaupungit]
 *
 * Pitfall 6: null, undefined, tyhjä merkkijono ja pelkkä välilyönti suodatetaan pois.
 * "Kaikki"-sentinel deduplikoidaan siten, että DB-rivi jolla on arvo "Kaikki"
 * ei tuota tuplamerkintää — lopullinen lista sisältää "Kaikki" vain kerran indeksissä 0.
 */
export function deriveKaupungit(
  paikat: Array<Pick<Liikuntapaikka, 'kaupunki'>>
): string[] {
  const unique = new Set<string>()

  for (const p of paikat) {
    const k = p.kaupunki
    if (k && k.trim().length > 0) {
      unique.add(k)
    }
  }

  // Poista sentinel-arvo joukosta (dedup "Kaikki" vs. DB-literal "Kaikki")
  unique.delete('Kaikki')

  const sorted = Array.from(unique).sort((a, b) =>
    a.localeCompare(b, 'fi', { sensitivity: 'base' })
  )

  return ['Kaikki', ...sorted]
}
