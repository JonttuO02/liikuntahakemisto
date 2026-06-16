// Server-only. Never import in client components.

import chromium from '@sparticuz/chromium'
import { chromium as playwrightChromium } from 'playwright-core'
import { isUrlSafe } from '@/lib/branding/ssrfGuard'

/**
 * Captures a full-page-viewport screenshot of the homepage ONLY (D-03/D-05).
 * Fail-soft: any error (missing Chromium binary on Hobby, navigation timeout,
 * etc.) is caught and logged; the function returns null rather than throwing
 * so the rest of the analysis pipeline continues without a screenshot (D-02:
 * the screenshot improves color extraction "in addition to", not "required").
 *
 * CR-04: Playwright's page.goto follows the target server's redirect chain
 * natively with no re-validation of intermediate/final hostnames, bypassing
 * the SSRF hardening applied to every other fetch path in this phase. Every
 * navigation/sub-resource request (including redirect hops) is routed
 * through isUrlSafe and aborted if it targets a private/internal address.
 */
export async function captureHomepageScreenshot(url: string): Promise<Buffer | null> {
  let browser
  try {
    browser = await playwrightChromium.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    })
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
    await page.route('**/*', (route) => {
      if (!isUrlSafe(route.request().url())) {
        return route.abort()
      }
      return route.continue()
    })
    await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 })
    const buffer = await page.screenshot({ type: 'png', fullPage: false })
    return buffer
  } catch (err) {
    console.error('[branding/screenshot] capture error:', err)
    return null
  } finally {
    await browser?.close()
  }
}
