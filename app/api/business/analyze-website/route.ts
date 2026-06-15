import { NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { supabaseAdmin } from '@/lib/supabaseAdmin.server'
import { scrapeWebsite } from '@/lib/branding/scraper'
import { analyzeWithClaude } from '@/lib/branding/analyzer'
import { uploadLogo } from '@/lib/branding/storage'

// Required: sharp is a Node.js native binary — Edge Runtime is incompatible.
// Omitting this causes a build error or runtime crash on Vercel.
export const runtime = 'nodejs'

// Background pipeline: scrape → analyze → upload → UPSERT final result.
// NOT exported — module-internal only, triggered via waitUntil.
//
// Vercel Hobby tier: waitUntil functions time out at 10 seconds.
// If the pipeline times out mid-execution, the catch block will NOT run —
// status stays 'analyzing' indefinitely. This is an accepted limitation
// (per RESEARCH.md Open Question Q2). Phase 46 shows "still processing"
// when it sees status='analyzing'. No additional code needed here.
async function runAnalysis(url: string, businessAccountId: string): Promise<void> {
  try {
    // 1. Scrape — logoBuffers are PNG Buffer[] (parallel to logoUrls)
    const { logoUrls: _logoUrls, logoBuffers, colors, htmlSnippet } = await scrapeWebsite(url)

    // 2. Analyze — pass logoBuffers (not logoUrls); result includes prices/opening_hours/website_url
    const result = await analyzeWithClaude(logoBuffers, htmlSnippet)

    // 3. Upload logo — upload the Buffer at the chosen index (-1 = no suitable logo)
    const logoPublicUrl =
      result.logo_index >= 0 && result.logo_index < logoBuffers.length
        ? await uploadLogo(businessAccountId, logoBuffers[result.logo_index])
        : null

    // 4. UPSERT final result — website_url from Claude extraction; raw_analysis = full result
    //    (raw_analysis jsonb stores full BrandingAnalysisResult so Phase 46 can read
    //     prices and opening_hours without additional columns)
    await supabaseAdmin
      .from('business_branding')
      .upsert(
        {
          business_account_id: businessAccountId,
          status: 'analyzed',
          logo_url: logoPublicUrl,
          logo_type: result.logo_type,
          colors: result.colors,
          website_url: result.website_url,
          raw_analysis: result,
          analyzed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'business_account_id' }
      )
  } catch (err) {
    console.error('[analyze-website] pipeline error:', err)
    await supabaseAdmin
      .from('business_branding')
      .upsert(
        {
          business_account_id: businessAccountId,
          website_url: url,
          status: 'failed',
          error_message: err instanceof Error ? err.message : 'Tuntematon virhe',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'business_account_id' }
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

  // Parse request body — url is required
  let url: string
  try {
    const body = await request.json()
    url = body?.url
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'url is required' }, { status: 400 })
  }

  // SSRF guard (T-45-04-SSRF): validate protocol and block private IP ranges.
  // This check runs BEFORE any fetch — prevents SSRF to localhost, AWS metadata, etc.
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return NextResponse.json({ error: 'Invalid URL protocol' }, { status: 400 })
    }
    const hostname = parsed.hostname.toLowerCase()
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname === '169.254.169.254'
    ) {
      return NextResponse.json({ error: 'Private addresses not allowed' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  // UPSERT status='analyzing' before fire-and-forget so GET returns 'analyzing' immediately (D-15).
  const { error: upsertError } = await supabaseAdmin
    .from('business_branding')
    .upsert(
      {
        business_account_id: user.id,
        website_url: url,
        status: 'analyzing',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'business_account_id' }
    )
  if (upsertError) {
    return NextResponse.json({ error: 'DB error', detail: upsertError.message }, { status: 500 })
  }

  // Fire-and-forget: waitUntil keeps the pipeline running after response is sent (D-04, D-05).
  waitUntil(runAnalysis(url, user.id))
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

  // Fetch current branding status for this business account.
  // .maybeSingle() returns null (not PGRST116 error) when no row exists.
  const { data, error } = await supabaseAdmin
    .from('business_branding')
    .select('status, logo_url, colors, logo_type, raw_analysis, error_message, analyzed_at')
    .eq('business_account_id', user.id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // null data = no branding row yet = pending state (D-06)
  return NextResponse.json(data ?? { status: 'pending' })
}
