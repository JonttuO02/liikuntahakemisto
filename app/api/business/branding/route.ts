import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin.server'

const MAX_GALLERY_SELECTION = 5
const HEX_RE = /^#[0-9a-fA-F]{6}$/

type ColorSource = 'ai' | 'custom'

type BrandingPatchBody = {
  paikka_id?: unknown
  selected_logo_url?: string
  selected_background_color?: string
  background_color_source?: ColorSource
  selected_accent_color?: string
  accent_color_source?: ColorSource
  image_urls?: string[]
}

type StoredBrandingRow = {
  logo_candidates: Array<{ url: string; type: string }> | null
  colors: Array<{ hex: string; role: string }> | null
  image_urls: string[] | null
}

/**
 * Validates a single color field against either the stored AI-extracted candidate
 * list (when source is 'ai') or a well-formed #rrggbb hex (when source is 'custom',
 * or omitted — custom is the default per D-09).
 *
 * Returns an error message string on failure, or null on success.
 */
function validateColorField(
  hex: string,
  source: ColorSource | undefined,
  storedColors: Array<{ hex: string; role: string }> | null,
): string | null {
  if (source === 'ai') {
    const isMember = (storedColors ?? []).some(c => c.hex.toLowerCase() === hex.toLowerCase())
    if (!isMember) return 'Color is not among the analyzed candidates'
    return null
  }
  // 'custom' (or omitted — defaults to custom per D-09)
  if (!HEX_RE.test(hex)) return 'Anna värikoodi muodossa #rrggbb'
  return null
}

export async function PATCH(request: Request) {
  // Auth: copied verbatim from save-step's JWT pattern. Verified user.id is used for
  // all DB scoping below — never a body-supplied business_account_id.
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '') ?? ''
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse and validate request body.
  let paikkaId: number
  let body: BrandingPatchBody
  try {
    body = await request.json()
    const parsed = parseInt(body.paikka_id as string, 10)
    if (isNaN(parsed) || parsed < 1) {
      return NextResponse.json({ error: 'Missing or invalid paikka_id' }, { status: 400 })
    }
    paikkaId = parsed
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const {
    selected_logo_url,
    selected_background_color,
    background_color_source,
    selected_accent_color,
    accent_color_source,
    image_urls,
  } = body

  if (image_urls !== undefined && (!Array.isArray(image_urls) || image_urls.length > MAX_GALLERY_SELECTION)) {
    return NextResponse.json({ error: 'Valitse enintään 5 kuvaa' }, { status: 400 })
  }

  const hasAnySelection =
    selected_logo_url !== undefined ||
    selected_background_color !== undefined ||
    selected_accent_color !== undefined ||
    image_urls !== undefined
  if (!hasAnySelection) {
    return NextResponse.json({ error: 'No selection fields provided' }, { status: 400 })
  }

  // Ownership check — ownership-only — onboarding venues are claim_status='pending'; the
  // approved-only variant in D-08/T-47-11 was a stale assumption corrected in Task 0
  // (analyze-website POST). Matches save-step/submit/analyze-website-POST exactly.
  const { data: link } = await supabaseAdmin
    .from('business_paikka_links')
    .select('id')
    .eq('business_account_id', user.id)
    .eq('paikka_id', paikkaId)
    .maybeSingle()
  if (!link) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Membership validation (D-08 part 2) — fetch the business's own stored analysis
  // candidates so submitted selections can be checked against them.
  const { data: brandingRow } = await supabaseAdmin
    .from('business_branding')
    .select('logo_candidates, colors, image_urls')
    .eq('business_account_id', user.id)
    .eq('paikka_id', paikkaId)
    .maybeSingle<StoredBrandingRow>()
  if (!brandingRow) {
    return NextResponse.json({ error: 'No branding analysis found for this venue' }, { status: 404 })
  }

  // LOGO (T-48-13, the load-bearing control): submitted selected_logo_url MUST match a
  // logo_candidates[].url entry on this business's OWN stored row. This is the only
  // server-side gate before the validated value flows (via Plan 03) into media_urls.logo
  // and onward to liikuntapaikat.logo_url at submit — an unvalidated client logo URL must
  // never reach that path.
  if (selected_logo_url !== undefined) {
    const isMember = (brandingRow.logo_candidates ?? []).some(c => c.url === selected_logo_url)
    if (!isMember) {
      return NextResponse.json({ error: 'Logo is not among the analyzed candidates' }, { status: 400 })
    }
  }

  if (selected_background_color !== undefined) {
    const err = validateColorField(selected_background_color, background_color_source, brandingRow.colors)
    if (err) return NextResponse.json({ error: err }, { status: 400 })
  }

  if (selected_accent_color !== undefined) {
    const err = validateColorField(selected_accent_color, accent_color_source, brandingRow.colors)
    if (err) return NextResponse.json({ error: err }, { status: 400 })
  }

  // GALLERY (D-08/D-05): every submitted URL must exist in the stored image_urls —
  // prevents injecting arbitrary URLs into the gallery selection.
  if (image_urls !== undefined) {
    const storedSet = new Set(brandingRow.image_urls ?? [])
    const allMembers = image_urls.every(url => storedSet.has(url))
    if (!allMembers) {
      return NextResponse.json({ error: 'Image is not among the analyzed candidates' }, { status: 400 })
    }
  }

  // UPDATE only — never upsert. Existence of the row was already confirmed above (the
  // brandingRow fetch 404s if missing), so this only ever needs to touch an existing row.
  // upsert() was the original implementation, but Postgres validates NOT NULL constraints
  // (e.g. business_branding.website_url, no default) for the INSERT half of an
  // "INSERT ... ON CONFLICT DO UPDATE" statement unconditionally, before conflict detection
  // even runs — so upsert() failed with a website_url NOT NULL violation on every call,
  // including updates to an already-existing row, since website_url is never part of this
  // endpoint's payload (63-06/63-07 UAT: brand colors never actually persisted).
  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (selected_logo_url !== undefined) updatePayload.selected_logo_url = selected_logo_url
  if (selected_background_color !== undefined) updatePayload.selected_background_color = selected_background_color
  if (selected_accent_color !== undefined) updatePayload.selected_accent_color = selected_accent_color
  if (image_urls !== undefined) updatePayload.image_urls = image_urls

  const { error: updateError } = await supabaseAdmin
    .from('business_branding')
    .update(updatePayload)
    .eq('business_account_id', user.id)
    .eq('paikka_id', paikkaId)

  if (updateError) {
    return NextResponse.json({ error: 'Update failed', detail: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
