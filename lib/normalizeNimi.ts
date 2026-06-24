/**
 * Normalizes a yritysNimi/toimipisteNimi value by trimming, collapsing
 * internal whitespace, and capping max length. Does NOT transform casing —
 * preserves the user's exact casing (avoids mangling stylized names like
 * "CrossFit" or Finnish company suffixes like "Oy"/"Ay").
 *
 * Forward-only (D-04): apply only to new writes, never backfill existing data.
 *
 * Returns an empty string for falsy/blank input — callers that require the
 * field test truthiness (e.g. `if (!yritysNimi)`), so this never returns
 * undefined.
 */
export function normalizeNimi(value: string): string {
  if (!value) return ''
  return value.trim().replace(/\s+/g, ' ').slice(0, 200)
}
