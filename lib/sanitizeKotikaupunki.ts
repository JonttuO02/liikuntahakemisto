/**
 * Sanitizes a kotikaupunki (home city) value from user input before inserting
 * it into an AI prompt. Uses the same character allowlist as suosikit names.
 *
 * Returns undefined when:
 * - Input is falsy/blank
 * - After stripping and trimming, the value is empty
 *
 * Returns the sanitized string otherwise (max 80 chars, trimmed).
 */
export function sanitizeKotikaupunki(value: string): string | undefined {
  if (!value || !value.trim()) return undefined
  const sanitized = value
    .replace(/[^\w\sÄäÖöÅå\-,.'()&]/g, '')
    .slice(0, 80)
    .trim()
  return sanitized || undefined
}
