import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin.server'

export async function POST(request: Request) {
  // D-02: Reject oversized bodies (64 KB cap — valid aukioloajat is ~200 bytes)
  const contentLength = request.headers.get('content-length')
  if (contentLength && parseInt(contentLength, 10) > 65536) {
    return NextResponse.json({ error: 'Request body too large' }, { status: 413 })
  }

  // Auth: verify JWT from Authorization header — mirrors register/route.ts exactly.
  // supabaseAdmin bypasses RLS, so we must verify ownership explicitly below.
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '') ?? ''
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse request body
  let paikka_id: number
  let section: string
  let data: unknown
  try {
    const body = await request.json()
    paikka_id = body.paikka_id
    section = body.section
    data = body.data
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Validate paikka_id is a positive integer
  if (!Number.isInteger(paikka_id) || paikka_id <= 0) {
    return NextResponse.json({ error: 'Invalid paikka_id' }, { status: 400 })
  }

  // E-01: Ownership check — any linked claimant (approved, pending, rejected) may save.
  const { data: linkRow, error: linkError } = await supabaseAdmin
    .from('business_paikka_links')
    .select('paikka_id, claim_status')
    .eq('business_account_id', user.id)
    .eq('paikka_id', paikka_id)
    .maybeSingle()

  if (linkError) {
    return NextResponse.json({ error: 'Ownership check failed', detail: linkError.message }, { status: 500 })
  }
  if (!linkRow) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Section-based field mapping — build updatePayload
  let updatePayload: Record<string, unknown>

  if (section === 'mediat') {
    const d = data as { logo_url?: string | null; photo_urls?: unknown }
    if (d.photo_urls !== undefined) {
      if (!Array.isArray(d.photo_urls) || d.photo_urls.length > 5) {
        return NextResponse.json({ error: 'photo_urls must be an array with max 5 items' }, { status: 400 })
      }
      // T-03: validate each item is a string (prevents non-string injection into photo_urls array)
      if (d.photo_urls.some(url => typeof url !== 'string')) {
        return NextResponse.json({ error: 'photo_urls items must be strings' }, { status: 400 })
      }
    }
    updatePayload = {
      logo_url: d.logo_url ?? null,
      photo_urls: d.photo_urls ?? [],
    }
  } else if (section === 'hinnasto') {
    const d = data as { hinta_min?: unknown; hinta_max?: unknown; hinta_kuvaus?: unknown }
    const hinta_min = d.hinta_min
    const hinta_max = d.hinta_max
    const hinta_kuvaus = d.hinta_kuvaus
    // Validate numeric types (null allowed)
    if (hinta_min !== undefined && hinta_min !== null && typeof hinta_min !== 'number') {
      return NextResponse.json({ error: 'hinta_min must be a number or null' }, { status: 400 })
    }
    if (hinta_max !== undefined && hinta_max !== null && typeof hinta_max !== 'number') {
      return NextResponse.json({ error: 'hinta_max must be a number or null' }, { status: 400 })
    }
    if (hinta_kuvaus !== undefined && hinta_kuvaus !== null && typeof hinta_kuvaus !== 'string') {
      return NextResponse.json({ error: 'hinta_kuvaus must be a string or null' }, { status: 400 })
    }
    updatePayload = {
      hinta_min: hinta_min ?? null,
      hinta_max: hinta_max ?? null,
      hinta_kuvaus: hinta_kuvaus ?? null,
    }
  } else if (section === 'aukioloajat') {
    // T-02: validate aukioloajat structure — must be an object whose values each
    // have { open: string, close: string } shape. Reject arrays and primitives.
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      return NextResponse.json({ error: 'aukioloajat must be an object' }, { status: 400 })
    }
    const entries = Object.entries(data as Record<string, unknown>)
    if (entries.length > 14) {
      return NextResponse.json({ error: 'aukioloajat has too many keys' }, { status: 400 })
    }
    const validated: Record<string, { open: string; close: string }> = {}
    for (const [key, val] of entries) {
      if (typeof val !== 'object' || val === null || Array.isArray(val)) {
        return NextResponse.json({ error: `aukioloajat.${key} must be an object` }, { status: 400 })
      }
      const entry = val as Record<string, unknown>
      if (typeof entry.open !== 'string' || typeof entry.close !== 'string') {
        return NextResponse.json({ error: `aukioloajat.${key} must have open and close string fields` }, { status: 400 })
      }
      validated[key] = { open: entry.open.slice(0, 10), close: entry.close.slice(0, 10) }
    }
    updatePayload = { aukioloajat: validated }
  } else if (section === 'yhteystiedot') {
    const d = data as { puhelin?: string; email?: string; varauslinkki?: string; kuvaus?: string }
    const puhelin = typeof d.puhelin === 'string' ? d.puhelin.trim() : undefined
    // T-04: Validate varauslinkki is http/https only — prevents javascript: XSS on public profile page.
    let varauslinkki: string | undefined
    if (typeof d.varauslinkki === 'string') {
      const trimmed = d.varauslinkki.trim()
      if (trimmed) {
        try {
          const parsed = new URL(trimmed)
          if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return NextResponse.json({ error: 'varauslinkki must use http or https' }, { status: 400 })
          }
          varauslinkki = trimmed
        } catch {
          return NextResponse.json({ error: 'varauslinkki must be a valid URL' }, { status: 400 })
        }
      }
    }
    // Cap kuvaus at 300 chars server-side
    const kuvaus = typeof d.kuvaus === 'string' ? d.kuvaus.trim().slice(0, 300) : undefined
    updatePayload = { puhelin, varauslinkki, kuvaus }
  } else if (section === 'sijainti') {
    // T-61-01 / T-61-02: Ownership already enforced above via business_paikka_links check.
    // Validate lat/lng: finite + within ±90/±180 range, mirroring create-paikka lines 47–53.
    const d = data as { osoite?: unknown; kaupunki?: unknown; latitude?: unknown; longitude?: unknown }
    const lat =
      typeof d.latitude === 'number' && Number.isFinite(d.latitude) && d.latitude >= -90 && d.latitude <= 90
        ? d.latitude
        : null
    const lng =
      typeof d.longitude === 'number' && Number.isFinite(d.longitude) && d.longitude >= -180 && d.longitude <= 180
        ? d.longitude
        : null
    if (lat === null || lng === null) {
      return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 })
    }
    updatePayload = {
      osoite: typeof d.osoite === 'string' ? d.osoite.trim().slice(0, 500) : null,
      kaupunki: typeof d.kaupunki === 'string' ? d.kaupunki.trim().slice(0, 500) : null,
      latitude: lat,
      longitude: lng,
    }
  } else {
    return NextResponse.json({ error: 'Invalid section' }, { status: 400 })
  }

  // Persist changes to liikuntapaikat
  const { error: updateError } = await supabaseAdmin
    .from('liikuntapaikat')
    .update(updatePayload)
    .eq('id', paikka_id)

  if (updateError) {
    return NextResponse.json(
      { error: 'Update failed', detail: updateError.message },
      { status: 500 }
    )
  }

  // D-07: Auto-resubmit-on-save — a successful section save on a previously
  // rejected venue flips claim_status back to pending, clearing rejection_reason.
  // The decision is derived from the server-side linkRow (never from the request
  // body) and the WHERE clause carries the same concurrency guard as
  // reapply/route.ts so only the first of two racing saves performs the flip.
  // Per D-15, the reapply cooldown check is deliberately NOT ported.
  if (linkRow.claim_status === 'rejected') {
    const { error: flipError } = await supabaseAdmin
      .from('business_paikka_links')
      .update({
        claim_status: 'pending',
        rejection_reason: null,
        submitted_at: new Date().toISOString(),
      })
      .eq('business_account_id', user.id)
      .eq('paikka_id', paikka_id)
      .eq('claim_status', 'rejected')

    if (flipError) {
      // Non-critical: the section save already succeeded and persisted above.
      // Log the flip failure without masking the 200 response.
      console.error('[update-paikka] Auto-resubmit flip failed (non-critical):', flipError.message)
    }
  }

  return NextResponse.json({ ok: true })
}
