// Server-only. Never import in client components.
//
// Extracted verbatim from app/api/business/analyze-website/route.ts lines 106-133 (D-08/D-09).
// This is the shared SSRF validator: protocol allowlist + private-IP/IPv6-ULA/CGNAT blocklist.
// Hostname is checked as a string BEFORE DNS resolution — DNS rebinding (a hostname that
// resolves to a public IP at check-time but a private IP at fetch-time) is NOT caught here.
// This gap is carried forward as P45-DNS and is explicitly out of scope for this plan.

/**
 * Prepends https:// when `url` has no recognized protocol, so a bare domain (e.g. "gogo.fi",
 * typed without a scheme in the onboarding URL field, or saved before this normalization
 * existed) parses as a valid absolute URL instead of failing isUrlSafe with a generic
 * "new URL() threw" rejection. Does not affect URLs that already specify a protocol.
 */
export function normalizeWebsiteUrl(url: string): string {
  const trimmed = url.trim()
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

/**
 * Returns true if `url` is safe to fetch: protocol is http(s) and the hostname does not
 * fall into a known private/loopback/link-local/CGNAT range.
 */
export function isUrlSafe(url: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false
  }

  const hostname = parsed.hostname.toLowerCase()

  // CR-03: IPv4-mapped IPv6 literals (e.g. ::ffff:127.0.0.1, [::ffff:169.254.169.254])
  // bypass the dotted-decimal checks below because URL.hostname normalizes them to a
  // hex-colon form (e.g. [::ffff:7f00:1]) that never matches 127.0.0.1 / 192.168. / etc.
  // Decode the embedded dotted-decimal IPv4 portion (if present) and re-check it through
  // the same logic; otherwise reject the mapped-IPv6 form outright.
  const ipv4MappedMatch = /^\[?::ffff:(\d{1,3}(?:\.\d{1,3}){3})\]?$/.exec(hostname)
  if (ipv4MappedMatch) {
    return isUrlSafe(parsed.protocol + '//' + ipv4MappedMatch[1])
  }
  // Hex-encoded IPv4-mapped form (e.g. [::ffff:7f00:1]) with no dotted-decimal portion —
  // reject outright since we can't re-run it through the dotted-decimal checks below.
  if (/^\[?::ffff:[\da-f]+:[\da-f]+\]?$/.test(hostname)) {
    return false
  }

  const parts = hostname.split('.')
  const oct1 = parseInt(parts[0] ?? '', 10)
  const oct2 = parseInt(parts[1] ?? '', 10)
  // CR-03/WR-03: the fd/fc ULA prefix check must only apply to actual IPv6 literals
  // (bracketed or containing a colon) — otherwise legitimate domains like fcbank.com
  // or fdating.com are false-positived as private IPv6 addresses.
  const isIPv6Literal = hostname.startsWith('[') || hostname.includes(':')
  const isPrivate =
    hostname === 'localhost' ||
    hostname === '0.0.0.0' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '[::1]' ||   // bracketed form — this is the actual URL.hostname value
    hostname === '[::]' ||
    hostname === '169.254.169.254' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    (isIPv6Literal && (hostname.startsWith('fd') || hostname.startsWith('fc') || hostname.startsWith('[fd') || hostname.startsWith('[fc'))) ||   // IPv6 ULA fd00::/8, fc00::/8
    (oct1 === 172 && oct2 >= 16 && oct2 <= 31) ||   // 172.16.0.0/12
    (oct1 === 100 && oct2 >= 64 && oct2 <= 127)      // 100.64.0.0/10 (CGNAT/Tailscale)

  return !isPrivate
}
