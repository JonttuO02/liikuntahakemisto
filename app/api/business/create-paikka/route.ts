import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin.server'
import { sendAdminNotificationEmail } from '@/lib/email'

export async function POST(request: Request) {
  // Security: verify JWT from Authorization header before accepting any user data.
  // This prevents elevation-of-privilege (T-33-03-02): attacker cannot spoof business_account_id
  // because supabaseAdmin bypasses RLS. Verified user.id is used for INSERT — not body.user_id.
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '') ?? ''
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify caller has a business_accounts row — prevents confusing FK errors for non-business users
  const { data: bizAccount } = await supabaseAdmin
    .from('business_accounts')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!bizAccount) {
    return NextResponse.json({ error: 'No business account' }, { status: 403 })
  }

  // Parse and validate request body (T-33-03-03: trim + slice prevents oversized inserts)
  let nimi: string
  let osoite: string
  let kaupunki: string
  let latitude: number | null
  let longitude: number | null
  try {
    const body = await request.json()
    nimi = typeof body.nimi === 'string' ? body.nimi.trim().slice(0, 500) : ''
    osoite = typeof body.osoite === 'string' ? body.osoite.trim().slice(0, 500) : ''
    kaupunki = typeof body.kaupunki === 'string' ? body.kaupunki.trim().slice(0, 500) : ''

    // SIJAINTI-03: allowlist parse only latitude/longitude — never read place_id,
    // formatted_address, or any other Places/Geocoding field from the body, and
    // never spread ...body into the insert. Reject (not coerce) non-finite or
    // out-of-range values; coordinates are mandatory for newly created venues.
    latitude =
      typeof body.latitude === 'number' && Number.isFinite(body.latitude) && body.latitude >= -90 && body.latitude <= 90
        ? body.latitude
        : null
    longitude =
      typeof body.longitude === 'number' && Number.isFinite(body.longitude) && body.longitude >= -180 && body.longitude <= 180
        ? body.longitude
        : null

    if (!nimi || !osoite || !kaupunki || latitude === null || longitude === null) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Step 1 of 3: INSERT into liikuntapaikat.
  // published=false: new venue hidden from users until admin approves (D-09, T-33-03-05).
  // business_managed is set to true by the approval trigger (PUB-01) when claim_status='approved'.
  const { data: newPaikka, error: paikkaError } = await supabaseAdmin
    .from('liikuntapaikat')
    .insert({ nimi, osoite, kaupunki, latitude, longitude, laji: 'Muu', published: false })
    .select('id')
    .single()

  if (paikkaError || !newPaikka) {
    return NextResponse.json(
      { error: 'Insert failed', detail: paikkaError?.message },
      { status: 500 }
    )
  }

  const newPaikkaId: number = newPaikka.id

  // Step 2 of 3: INSERT into business_paikka_links using verified user.id — never body.user_id.
  // Service role key bypasses RLS so the insert succeeds regardless of auth.uid().
  const { error: linkError } = await supabaseAdmin
    .from('business_paikka_links')
    .insert({
      business_account_id: user.id,
      paikka_id: newPaikkaId,
      link_type: 'created',
      claim_status: 'pending',
    })

  if (linkError) {
    // Atomicity rollback (D-10): delete the orphaned liikuntapaikat row so user can retry.
    await supabaseAdmin.from('liikuntapaikat').delete().eq('id', newPaikkaId)
    return NextResponse.json(
      { error: 'Link insert failed', detail: linkError.message },
      { status: 500 }
    )
  }

  // Step 3 of 3: Set is_claimed = true as a denormalized public flag (D-07).
  // Allows "Jo hallittu" check in search results without RLS-protected business_paikka_links query.
  // Non-critical: if this UPDATE fails, the link still exists — log but do not rollback.
  const { error: updateError } = await supabaseAdmin
    .from('liikuntapaikat')
    .update({ is_claimed: true })
    .eq('id', newPaikkaId)

  if (updateError) {
    console.error('[create-paikka] is_claimed UPDATE failed (non-critical):', updateError.message)
  }

  // Non-critical: send admin notification — failure does not rollback the create
  try {
    const { data: biz } = await supabaseAdmin
      .from('business_accounts')
      .select('company_name')
      .eq('user_id', user.id)
      .single()
    const { data: paikka } = await supabaseAdmin
      .from('liikuntapaikat')
      .select('nimi')
      .eq('id', newPaikkaId)
      .single()
    // Get link id for deep link in email
    const { data: link } = await supabaseAdmin
      .from('business_paikka_links')
      .select('id')
      .eq('business_account_id', user.id)
      .eq('paikka_id', newPaikkaId)
      .single()
    if (biz && paikka && link) {
      await sendAdminNotificationEmail({
        companyName: biz.company_name,
        venueName: paikka.nimi,
        linkType: 'created',
        applicationId: link.id,
        submittedAt: new Date().toISOString(),
      })
    }
  } catch (emailErr) {
    console.error('[create-paikka] Admin notification email failed (non-critical):', emailErr)
  }

  // Return paikka_id for Phase 34 onboarding wizard to redirect user to onboarding flow.
  return NextResponse.json({ ok: true, paikka_id: newPaikkaId })
}
