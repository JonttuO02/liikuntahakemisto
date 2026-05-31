/**
 * Builds the sport interests (kiinnostukset) context string for the AI saasuositus prompt.
 *
 * Returns a non-empty string only when the user has selected at least one sport interest.
 * Sport keys are used as-is (the AI understands Finnish sport names directly).
 * The returned string has a leading space — it is appended directly to the prompt,
 * matching the buildReissuKonteksti convention.
 *
 * Returns '' when:
 * - kiinnostukset is undefined or null
 * - kiinnostukset is an empty array
 */
export function buildKiinnostuksetKonteksti(
  kiinnostukset: string[] | undefined | null
): string {
  if (!kiinnostukset || kiinnostukset.length === 0) return ''
  return ` Käyttäjä on kiinnostunut lajeista: ${kiinnostukset.join(', ')}.`
}
