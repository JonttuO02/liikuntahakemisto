import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin.server'

export async function POST(request: Request) {
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

  // Ownership check: verify the authenticated user owns this paikka
  const { data: linkRow, error: linkError } = await supabaseAdmin
    .from('business_paikka_links')
    .select('paikka_id')
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
    // Accept data as a JSONB-compatible object (Record of day keys to { open, close })
    updatePayload = { aukioloajat: data }
  } else if (section === 'yhteystiedot') {
    const d = data as { puhelin?: string; varauslinkki?: string; kuvaus?: string }
    const puhelin = typeof d.puhelin === 'string' ? d.puhelin.trim() : undefined
    const varauslinkki = typeof d.varauslinkki === 'string' ? d.varauslinkki.trim() : undefined
    // Cap kuvaus at 300 chars server-side
    const kuvaus = typeof d.kuvaus === 'string' ? d.kuvaus.trim().slice(0, 300) : undefined
    updatePayload = { puhelin, varauslinkki, kuvaus }
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

  return NextResponse.json({ ok: true })
}
