/**
 * Resolves the display name for a review author.
 *
 * Returns 'Anonyymi' when:
 * - isAnonymous is true (T-15-02 mitigation — anonymous always wins, never leaks user_id or email)
 * - reviewerName is null, undefined, or empty string (fallback for missing name)
 *
 * Returns reviewerName when isAnonymous is false and the name is a non-empty string.
 */
export function resolveDisplayName(
  isAnonymous: boolean,
  reviewerName: string | null | undefined
): string {
  if (isAnonymous) return 'Anonyymi'
  if (!reviewerName) return 'Anonyymi'
  return reviewerName
}

/**
 * Computes the arithmetic mean of an array of star ratings.
 *
 * Returns null when the array is empty (no reviews — no average to display).
 * Returns the raw average without rounding — callers round at render time (D-05).
 *
 * @param ratings - Array of rating values (1–5)
 * @returns number | null — raw average, or null for an empty array
 */
export function computeAvgRating(ratings: number[]): number | null {
  if (ratings.length === 0) return null
  return ratings.reduce((sum, r) => sum + r, 0) / ratings.length
}
