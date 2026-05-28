/**
 * Builds the "reissussa" (traveling) context string for the AI saasuositus prompt.
 *
 * Returns a non-empty string only when the user is visiting a city that differs
 * from their home city (kotikaupunki). The comparison is case-insensitive and
 * whitespace-trimmed. The returned string has a leading space — it is appended
 * directly to the prompt.
 *
 * Returns '' when:
 * - kotikaupunki is undefined, null, or empty/whitespace-only
 * - kotikaupunki equals kaupunki (case-insensitive, trimmed)
 */
export function buildReissuKonteksti(
  kotikaupunki: string | undefined,
  kaupunki: string
): string {
  if (!kotikaupunki || kotikaupunki.trim() === '') return ''
  if (kotikaupunki.trim().toLowerCase() === kaupunki.trim().toLowerCase()) return ''
  return ` Käyttäjä vierailee ${kaupunki}ssa — hänen kotikaupunkinsa on ${kotikaupunki}.`
}
