// Server-only. Never import in client components.

import chromium from '@sparticuz/chromium'
import { chromium as playwrightChromium } from 'playwright-core'

/**
 * Captures a full-page-viewport screenshot of the homepage ONLY (D-03/D-05).
 * Fail-soft: any error (missing Chromium binary on Hobby, navigation timeout,
 * etc.) is caught and logged; the function returns null rather than throwing
 * so the rest of the analysis pipeline continues without a screenshot (D-02:
 * the screenshot improves color extraction "in addition to", not "required").
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
