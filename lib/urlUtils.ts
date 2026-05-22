/**
 * isSafeUrl — CR-02 security fix
 *
 * Returns true only when the URL has an http or https scheme.
 * Rejects javascript:, data:, and other potentially dangerous schemes.
 * Returns false for null, empty string, and malformed URLs.
 */
export function isSafeUrl(url: string | null | undefined): url is string {
  if (!url) return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}
