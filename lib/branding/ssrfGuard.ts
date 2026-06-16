// Server-only. Never import in client components.
//
// Extracted verbatim from app/api/business/analyze-website/route.ts lines 106-133 (D-08/D-09).
// This is the shared SSRF validator: protocol allowlist + private-IP/IPv6-ULA/CGNAT blocklist.
// Hostname is checked as a string BEFORE DNS resolution — DNS rebinding (a hostname that
// resolves to a public IP at check-time but a private IP at fetch-time) is NOT caught here.
// This gap is carried forward as P45-DNS and is explicitly out of scope for this plan.

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
  const parts = hostname.split('.')
  const oct1 = parseInt(parts[0] ?? '', 10)
  const oct2 = parseInt(parts[1] ?? '', 10)
  const isPrivate =
    hostname === 'localhost' ||
    hostname === '0.0.0.0' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '[::]' ||
    hostname === '169.254.169.254' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('fd') ||   // IPv6 ULA fd00::/8
    hostname.startsWith('fc') ||   // IPv6 ULA fc00::/8
    (oct1 === 172 && oct2 >= 16 && oct2 <= 31) ||   // 172.16.0.0/12
    (oct1 === 100 && oct2 >= 64 && oct2 <= 127)      // 100.64.0.0/10 (CGNAT/Tailscale)

  return !isPrivate
}
