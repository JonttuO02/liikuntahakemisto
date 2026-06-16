// Server-only. Never import in client components.
//
// Wraps fetch() with redirect: 'manual' and re-validates every redirect Location header
// against isUrlSafe before following it (D-09/D-10). Closes the SSRF-via-redirect vector:
// a legitimate-looking URL can 3xx-redirect to a private IP, bypassing an entry-only check.

import { isUrlSafe } from './ssrfGuard'

const MAX_REDIRECT_HOPS = 2

/**
 * Fetches `url`, re-validating every redirect hop against isUrlSafe before following it.
 * Throws if the URL (or any redirect target) is unsafe, if a 3xx response has no Location
 * header, or if more than MAX_REDIRECT_HOPS redirects occur.
 */
export async function fetchWithSsrfGuard(
  url: string,
  init: RequestInit = {}
): Promise<Response> {
  let currentUrl = url

  for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop++) {
    if (!isUrlSafe(currentUrl)) {
      throw new Error(`SSRF guard rejected URL: ${currentUrl}`)
    }

    const res = await fetch(currentUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AktiiviBot/1.0)' },
      ...init,
      redirect: 'manual',
    })

    // Assumption A1 (RESEARCH.md): Node's undici-based fetch exposes status/headers.get('location')
    // for same-process manual redirects, unlike browser fetch's opaque redirect semantics.
    // This should be smoke-tested against the deployed Vercel Node runtime before relying on
    // it in production — see 47-RESEARCH.md Pattern 2 / Assumption A1.
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location')
      if (!location) throw new Error('Redirect with no Location header')
      currentUrl = new URL(location, currentUrl).href
      continue // loop re-validates currentUrl at top before next fetch
    }

    return res
  }

  throw new Error(`Exceeded ${MAX_REDIRECT_HOPS} redirect hops`)
}
