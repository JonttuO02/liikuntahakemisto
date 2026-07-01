import { NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { supabaseAdmin } from '@/lib/supabaseAdmin.server'
import { scrapeWebsite } from '@/lib/branding/scraper'
import { analyzeWithClaude } from '@/lib/branding/analyzer'
import { uploadLogo, uploadLogoCandidate, uploadGalleryImage } from '@/lib/branding/storage'
import { isUrlSafe } from '@/lib/branding/ssrfGuard'
import { captureHomepageScreenshot } from '@/lib/branding/screenshot'

// Required: sharp is a Node.js native binary — Edge Runtime is incompatible.
// Omitting this causes a build error or runtime crash on Vercel.
export const runtime = 'nodejs'

// Cap on gallery images actually fetched+converted+uploaded per analysis run — bounds
// the background pipeline's runtime/cost even when scrapeWebsite returns up to 15 URLs.
const MAX_GALLERY_UPLOADS = 8

// Internal soft deadline for the pipeline — chosen to fire just before Vercel Hobby's
// documented ~10s waitUntil kill, so runAnalysis can write a controlled 'failed' status
// instead of being silently terminated mid-write (63-UAT.md Gap 3).
const MAX_ANALYSIS_DURATION_MS = 8000

// Backstop staleness threshold used by the GET handler below: any row still 'analyzing'
// older than this is self-healed to 'failed', covering rows the internal guard above
// never got a chance to write (e.g. process killed before the internal deadline race fires).
const STALE_ANALYZING_MS = 12000

// Background pipeline: scrape → analyze → upload → UPSERT final result.
// NOT exported — module-internal only, invoked by runAnalysis (see below) via a deadline race.
// No try/catch of its own — errors propagate to the caller, which owns the failed-status UPSERT.
async function runAnalysisPipeline(url: string, businessAccountId: string, paikkaId: number): Promise<void> {
  // are the new multi-page shapes (SCRAP-06/SCRAP-08/SCRAP-09). The scraper's own `colors`
  // (theme-color meta + :root CSS vars only) is intentionally NOT used for the stored
  // `colors` column below — see step 6 comment.
  const { logoBuffers, labeledPages, imageUrls } = await scrapeWebsite(url)

  // 2. Capture optional homepage screenshot — fail-soft, never aborts the pipeline.
  let screenshot: Buffer | null = null
  try {
    screenshot = await captureHomepageScreenshot(url)
  } catch (err) {
    console.error('[analyze-website] screenshot capture error:', err)
    screenshot = null
  }

  // 3. Analyze — pass labeledPages (not a flat htmlSnippet) + optional screenshot;
  // result includes array-based logos/colors with source_page-attributed prices/hours.
  const result = await analyzeWithClaude(logoBuffers, labeledPages, screenshot)

  // 4. Upload logos. Primary logo_url kept via uploadLogo for backward compat (Phase 46
  // consumer + DiagonaalKortti rendering still read logo_url directly).
  const logoPublicUrl =
    result.logo_index >= 0 && result.logo_index < logoBuffers.length
      ? await uploadLogo(businessAccountId, paikkaId, logoBuffers[result.logo_index])
      : null

  // Upload each distinct logo candidate Claude identified concurrently, building
  // logo_candidates (D-12). Settling all uploads together lets one slow/failing candidate
  // not block the others; results are iterated in input order to preserve ordering.
  const logoCandidates: Array<{ url: string; type: string }> = []
  const logoUploadResults = await Promise.allSettled(
    result.logos
      .filter(logo => logo.index >= 0 && logo.index < logoBuffers.length)
      .map(async logo => {
        const candidateUrl = await uploadLogoCandidate(businessAccountId, paikkaId, logoBuffers[logo.index], logo.index)
        return { url: candidateUrl, type: logo.type }
      })
  )
  for (const settled of logoUploadResults) {
    if (settled.status === 'fulfilled') {
      logoCandidates.push(settled.value)
    } else {
      console.error('[analyze-website] logo candidate upload error:', settled.reason)
      // Skip this candidate — non-fatal
    }
  }

  // 5. Upload gallery images concurrently. Fetch+convert each scraped imageUrls entry through
  // the same SSRF-guarded fetch + sharp conversion idiom as logo candidates, then store via
  // uploadGalleryImage so the GET response only ever surfaces same-origin Supabase Storage
  // URLs (SEC-46-02). Capped at MAX_GALLERY_UPLOADS to bound pipeline runtime/cost. `idx` (the
  // array position within the slice) replaces the old mutable galleryIndex counter — a shared
  // counter would race under concurrent execution, so each callback throws on an unsafe URL or
  // failed fetch instead of silently `continue`-ing, so the settled results classify it correctly.
  const galleryUrls: string[] = []
  const sharp = (await import('sharp')).default
  const { fetchWithSsrfGuard } = await import('@/lib/branding/fetchSafe')
  const galleryUploadResults = await Promise.allSettled(
    imageUrls.slice(0, MAX_GALLERY_UPLOADS).map(async (imageUrl, idx) => {
      if (!isUrlSafe(imageUrl)) throw new Error(`Unsafe image URL: ${imageUrl}`)
      const imgRes = await fetchWithSsrfGuard(imageUrl, { signal: AbortSignal.timeout(5000) })
      if (!imgRes.ok) throw new Error(`Fetch failed (${imgRes.status}): ${imageUrl}`)
      const arrayBuffer = await imgRes.arrayBuffer()
      const pngBuffer = await sharp(Buffer.from(arrayBuffer))
        .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
        .png()
        .toBuffer()
      return uploadGalleryImage(businessAccountId, paikkaId, pngBuffer, idx)
    })
  )
  for (const settled of galleryUploadResults) {
    if (settled.status === 'fulfilled') {
      galleryUrls.push(settled.value)
    } else {
      console.error('[analyze-website] gallery image upload error:', settled.reason)
      // Skip this image — non-fatal
    }
  }

  // 6. UPSERT final result — website_url from Claude extraction; raw_analysis = full result
  //    (raw_analysis jsonb stores full BrandingAnalysisResult so Phase 46 can read
  //     prices and opening_hours without additional columns). Scoped by (business_account_id,
  //     paikka_id) per BRDDB-05 — prevents cross-venue overwrite.
  const { error: finalErr } = await supabaseAdmin
    .from('business_branding')
    .upsert(
      {
        business_account_id: businessAccountId,
        paikka_id: paikkaId,
        status: 'analyzed',
        logo_url: logoPublicUrl,
        logo_type: result.logos[0]?.type ?? 'unknown',
        logo_candidates: logoCandidates,
        // Use Claude's role-tagged, screenshot-derived colors (result.colors), NOT the
        // scraper's flat theme-color/CSS-var-only colors array. The latter is rarely
        // present on real sites (causing near-universal "couldn't find colours") and is
        // a plain string[] anyway — every consumer (AnalysoiSivusto, PATCH route,
        // BrandingResult type) expects Array<{hex, role}>.
        colors: result.colors,
        image_urls: galleryUrls,
        // A re-analysis (same paikka_id, "Analysoi uudelleen") must not leave a PRIOR run's
        // manual selections stuck in the row — selected_logo_url could point at a candidate
        // that no longer exists in the new logo_candidates, and a stale selected_*_color
        // would silently mask the new analysis's color candidates in AnalysoiSivusto's init
        // logic. Reset only the columns that actually exist in the schema — *_color_source
        // (background_color_source/accent_color_source) are PATCH-request-only fields, never
        // persisted as columns (confirmed: no migration creates them, and the PATCH route's
        // own updatePayload omits them) — including them here throws "column does not exist".
        selected_logo_url: null,
        selected_background_color: null,
        selected_accent_color: null,
        // WR-02: use Claude's URL only if same hostname as submitted — prevents
        // prompt injection from storing an attacker-controlled external URL
        website_url: (() => {
          try {
            if (!result.website_url) return url
            return new URL(result.website_url).hostname === new URL(url).hostname
              ? result.website_url
              : url
          } catch { return url }
        })(),
        raw_analysis: result,
        // AI-06: raw, allowlist-validated AI sport-category suggestion. Unconfirmed —
        // the user-confirmed value lives separately in onboarding_draft.laji (D-04).
        suggested_laji: result.suggested_laji,
        error_message: null,
        analyzed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'business_account_id,paikka_id' }
    )
  if (finalErr) throw new Error(`DB upsert: ${finalErr.message}`)
}

// runAnalysis: thin wrapper around runAnalysisPipeline. Races the pipeline against an
// internal soft deadline (MAX_ANALYSIS_DURATION_MS) so a slow analysis writes a controlled
// 'failed' status instead of being silently killed mid-flight by Vercel's waitUntil budget
// (63-UAT.md Gap 3). Vercel Hobby tier: waitUntil functions time out at ~10 seconds —
// MAX_ANALYSIS_DURATION_MS fires just before that, giving this catch block a chance to run.
async function runAnalysis(url: string, businessAccountId: string, paikkaId: number): Promise<void> {
  try {
    await Promise.race([
      runAnalysisPipeline(url, businessAccountId, paikkaId),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Analyysi aikakatkaistiin')), MAX_ANALYSIS_DURATION_MS)
      }),
    ])
  } catch (err) {
    console.error('[analyze-website] pipeline error:', err)
    await supabaseAdmin
      .from('business_branding')
      .upsert(
        {
          business_account_id: businessAccountId,
          paikka_id: paikkaId,
          website_url: url,
          status: 'failed',
          error_message: err instanceof Error ? err.message : 'Tuntematon virhe',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'business_account_id,paikka_id' }
      )
  }
}

export async function POST(request: Request) {
  // Security: verify JWT from Authorization header before any mutation (T-45-04-01).
  // supabaseAdmin bypasses RLS, so we must verify identity from the token first.
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '') ?? ''
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse request body — url and paikka_id are required
  let url: string
  let paikkaId: number
  try {
    const body = await request.json()
    url = body?.url
    paikkaId = Number(body?.paikka_id)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'url is required' }, { status: 400 })
  }
  if (!Number.isInteger(paikkaId) || paikkaId <= 0) {
    return NextResponse.json({ error: 'paikka_id is required' }, { status: 400 })
  }

  // SSRF guard (T-47-13): shared validator — protocol allowlist + private-IP/IPv6-ULA/CGNAT
  // blocklist. Note: hostname is checked BEFORE DNS resolution — DNS rebinding is an accepted
  // limitation (P45-DNS).
  if (!isUrlSafe(url)) {
    return NextResponse.json({ error: 'Invalid or private URL' }, { status: 400 })
  }

  // CR-04: verify caller has a business account — prevents cost abuse from consumer accounts
  const { data: bizAccount } = await supabaseAdmin
    .from('business_accounts')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!bizAccount) {
    return NextResponse.json({ error: 'Business account required' }, { status: 403 })
  }

  // T-47-11 (corrected, Phase 48 Task 0): IDOR mitigation — verify the caller owns paikkaId
  // before triggering analysis or writing any branding row for that venue. Ownership-only,
  // matching save-step/submit — onboarding venues sit at claim_status='pending' for the
  // entire onboarding flow (claim-paikka/create-paikka create the link 'pending'; submit
  // resets it back to 'pending'). An 'approved' filter here 403s every first-time onboarding
  // business and makes the 'preview' phase (and all Phase 48 UI) unreachable.
  const { data: ownershipLink } = await supabaseAdmin
    .from('business_paikka_links')
    .select('id')
    .eq('business_account_id', user.id)
    .eq('paikka_id', paikkaId)
    .maybeSingle()
  if (!ownershipLink) {
    return NextResponse.json({ error: 'You do not own this venue' }, { status: 403 })
  }

  // UPSERT status='analyzing' before fire-and-forget so GET returns 'analyzing' immediately (D-15).
  // Scoped by (business_account_id, paikka_id) per BRDDB-05.
  const { error: upsertError } = await supabaseAdmin
    .from('business_branding')
    .upsert(
      {
        business_account_id: user.id,
        paikka_id: paikkaId,
        website_url: url,
        status: 'analyzing',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'business_account_id,paikka_id' }
    )
  if (upsertError) {
    return NextResponse.json({ error: 'DB error', detail: upsertError.message }, { status: 500 })
  }

  // Fire-and-forget: waitUntil keeps the pipeline running after response is sent (D-04, D-05).
  waitUntil(runAnalysis(url, user.id, paikkaId))
  return NextResponse.json({ ok: true })
}

export async function GET(request: Request) {
  // Security: same JWT verification as POST (T-45-04-04) — user can only read their own row.
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '') ?? ''
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const paikkaId = Number(new URL(request.url).searchParams.get('paikka_id'))
  if (!Number.isInteger(paikkaId) || paikkaId <= 0) {
    return NextResponse.json({ error: 'paikka_id is required' }, { status: 400 })
  }

  // Fetch current branding status for this (business_account_id, paikka_id) pair (BRDDB-05).
  // .maybeSingle() returns null (not PGRST116 error) when no row exists.
  // updated_at is fetched only for the staleness self-heal check below — stripped from the
  // response before returning since it is not part of the client-facing BrandingResult shape.
  const { data, error } = await supabaseAdmin
    .from('business_branding')
    .select('status, logo_url, colors, logo_type, logo_candidates, image_urls, selected_logo_url, selected_background_color, selected_accent_color, raw_analysis, error_message, analyzed_at, suggested_laji, updated_at')
    .eq('business_account_id', user.id)
    .eq('paikka_id', paikkaId)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Staleness self-heal: a row stuck at 'analyzing' for longer than STALE_ANALYZING_MS means
  // the background pipeline was killed before it could write its own controlled 'failed'
  // status (e.g. process killed before runAnalysis's internal deadline race fired) — flip it to
  // 'failed' now so no venue can be stuck at 'analyzing' forever (63-UAT.md Gap 3). The trailing
  // status filter is a lightweight best-effort guard against clobbering a write that completed
  // in the same instant — not strict concurrency-critical, since only status/error_message
  // are at stake (T-63-07-01).
  if (data?.status === 'analyzing' && Date.now() - new Date(data.updated_at).getTime() > STALE_ANALYZING_MS) {
    await supabaseAdmin
      .from('business_branding')
      .update({
        status: 'failed',
        error_message: 'Analyysi aikakatkaistiin',
        updated_at: new Date().toISOString(),
      })
      .eq('business_account_id', user.id)
      .eq('paikka_id', paikkaId)
      .eq('status', 'analyzing')
    data.status = 'failed'
    data.error_message = 'Analyysi aikakatkaistiin'
  }

  // SEC-46-02: strip logo_url if it doesn't point to our own Supabase Storage,
  // preventing a compromised analysis pipeline from surfacing arbitrary image origins.
  if (data?.logo_url) {
    const storageBase = process.env.NEXT_PUBLIC_SUPABASE_URL + '/storage/v1/'
    if (!data.logo_url.startsWith(storageBase)) {
      data.logo_url = null
    }
  }

  // updated_at was only fetched for the staleness check above — not part of BrandingResult.
  if (data) delete (data as { updated_at?: string }).updated_at

  // null data = no branding row yet = pending state (D-06)
  return NextResponse.json(data ?? { status: 'pending' })
}
