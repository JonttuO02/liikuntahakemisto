// Server-only. Never import in client components.
// Caller (route.ts) must validate url protocol and block private IP ranges before calling scrapeWebsite

import sharp from 'sharp'

export interface ScrapeResult {
  logoUrls: string[]       // raw image URLs (up to 5)
  logoBuffers: Buffer[]    // fetched + sharp-converted PNG buffers (parallel index to logoUrls)
  colors: string[]         // hex colors from theme-color meta + :root CSS variables
  htmlSnippet: string      // html.slice(0, 8000)
}

/**
 * Internal helper: converts any image buffer to PNG (max 512px).
 * Returns null if conversion fails (e.g. invalid SVG favicon — Pitfall 8).
 */
async function toPngBase64(buffer: Buffer): Promise<Buffer | null> {
  try {
    const pngBuffer = await sharp(buffer)
      .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer()
    return pngBuffer
  } catch (err) {
    console.error('[branding/scraper] toPngBase64 error:', err)
    return null
  }
}

/**
 * Scrapes a website URL and returns branding-relevant data.
 *
 * Steps:
 *  1. Fetch HTML with 10s timeout and Mozilla User-Agent
 *  2. Parse <meta name="theme-color"> hex value
 *  3. Fetch up to 3 stylesheet links in parallel (5s timeout each)
 *  4. Extract :root CSS hex variables from each stylesheet
 *  5. Collect logo candidates (favicon → og:image → img[*=logo])
 *  6. Fetch + convert each logo candidate to PNG via sharp
 *  7. Return ScrapeResult
 */
export async function scrapeWebsite(url: string): Promise<ScrapeResult> {
  // 1. Fetch HTML
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AktiiviBot/1.0)' },
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`Sivua ei saatu ladattua: ${url}`)
  const html = await res.text()

  // WR-01: Reject oversized responses before loading into memory
  if (html.length > 5 * 1024 * 1024) throw new Error('Response too large (>5MB)')

  const colors: string[] = []

  // 2. Parse theme-color meta tag
  const themeColorRegex = /<meta\s+name=["']theme-color["']\s+content=["'](#[0-9a-fA-F]{3,6})["']/i
  const themeColorMatch = html.match(themeColorRegex)
  if (themeColorMatch?.[1]) {
    colors.push(themeColorMatch[1])
  }

  // 3. Parse stylesheet links (max 3)
  const cssLinkRegex = /<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+\.css[^"']*)["']/gi
  const cssUrls: string[] = []
  let cssMatch: RegExpExecArray | null
  while ((cssMatch = cssLinkRegex.exec(html)) !== null && cssUrls.length < 3) {
    try {
      const absoluteUrl = new URL(cssMatch[1], url).href
      cssUrls.push(absoluteUrl)
    } catch {
      // skip malformed URLs
    }
  }

  // Fetch all CSS files in parallel
  const cssResults = await Promise.all(
    cssUrls.map(async (cssUrl) => {
      try {
        const r = await fetch(cssUrl, { signal: AbortSignal.timeout(5000) })
        return r.ok ? await r.text() : ''
      } catch {
        return ''
      }
    })
  )

  // 4. Extract :root hex vars from each CSS text
  // CR-05: regex must be re-created per CSS file — a shared /g regex retains lastIndex
  // across files and silently drops matches from the 2nd and 3rd stylesheet.
  for (const cssText of cssResults) {
    const rootVarRegex = /--[\w-]+\s*:\s*(#[0-9a-fA-F]{3,6})\b/g
    let match: RegExpExecArray | null
    while ((match = rootVarRegex.exec(cssText)) !== null) {
      colors.push(match[1])
    }
  }

  // Deduplicate colors
  const uniqueColors = Array.from(new Set(colors))

  // 5. Collect logo candidates in priority order
  const logoCandidates: string[] = []

  // a. Favicon: <link rel="icon"> or <link rel="shortcut icon">
  const faviconRegex = /<link[^>]+rel=["'](?:shortcut icon|icon)["'][^>]+href=["']([^"']+)["']/i
  const faviconMatch = html.match(faviconRegex)
  if (faviconMatch?.[1]) {
    try {
      logoCandidates.push(new URL(faviconMatch[1], url).href)
    } catch {
      // skip
    }
  }
  // Fallback: /favicon.ico
  if (logoCandidates.length === 0) {
    try {
      logoCandidates.push(new URL('/favicon.ico', url).href)
    } catch {
      // skip
    }
  }

  // b. og:image
  const ogImageRegex = /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i
  const ogImageMatch = html.match(ogImageRegex)
  if (ogImageMatch?.[1]) {
    try {
      const ogUrl = new URL(ogImageMatch[1], url).href
      if (!logoCandidates.includes(ogUrl)) {
        logoCandidates.push(ogUrl)
      }
    } catch {
      // skip
    }
  }

  // c. img elements with "logo" in src, alt, or class
  const imgTagRegex = /<img[^>]+>/gi
  let imgMatch: RegExpExecArray | null
  while ((imgMatch = imgTagRegex.exec(html)) !== null && logoCandidates.length < 10) {
    const tag = imgMatch[0]
    const srcMatch = /\bsrc=["']([^"']+)["']/i.exec(tag)
    const altMatch = /\balt=["']([^"']*)["']/i.exec(tag)
    const classMatch = /\bclass=["']([^"']*)["']/i.exec(tag)

    const src = srcMatch?.[1] ?? ''
    const alt = altMatch?.[1] ?? ''
    const cls = classMatch?.[1] ?? ''

    if (
      /logo/i.test(src) ||
      /logo/i.test(alt) ||
      /logo/i.test(cls)
    ) {
      if (src) {
        try {
          const absUrl = new URL(src, url).href
          if (!logoCandidates.includes(absUrl)) {
            logoCandidates.push(absUrl)
          }
        } catch {
          // skip
        }
      }
    }
  }

  // Deduplicate and take first 5
  const uniqueCandidates = Array.from(new Set(logoCandidates)).slice(0, 5)

  // 6. Fetch each logo candidate and convert to PNG
  const logoUrls: string[] = []
  const logoBuffers: Buffer[] = []

  for (const candidateUrl of uniqueCandidates) {
    try {
      const imgRes = await fetch(candidateUrl, { signal: AbortSignal.timeout(5000) })
      if (!imgRes.ok) continue

      const arrayBuffer = await imgRes.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      const pngBuffer = await toPngBase64(buffer)
      if (pngBuffer === null) {
        // Skip candidates that fail sharp conversion (Pitfall 8)
        continue
      }

      logoUrls.push(candidateUrl)
      logoBuffers.push(pngBuffer)
    } catch (err) {
      console.error('[branding/scraper] logo fetch error:', err)
      // Skip this candidate
    }
  }

  // 7. Return ScrapeResult
  // CR-03 partial: strip HTML comments and script/style blocks to reduce prompt injection surface
  const strippedHtml = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
  return {
    logoUrls,
    logoBuffers,
    colors: uniqueColors,
    htmlSnippet: strippedHtml.slice(0, 8000),
  }
}
