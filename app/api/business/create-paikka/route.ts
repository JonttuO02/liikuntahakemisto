import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin.server'
import { sendAdminNotificationEmail } from '@/lib/email'
import { normalizeNimi } from '@/lib/normalizeNimi'

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

  // Parse and validate request body (T-33-03-03 / T-56-02: normalizeNimi caps
  // name fields at 200 chars; osoite/kaupunki keep the existing 500-char slice)
  let yritysNimi: string
  let toimipisteNimi: string
  let osoite: string
  let kaupunki: string
  let latitude: number | null
  let longitude: number | null
  try {
    const body = await request.json()
    yritysNimi = typeof body.yritysNimi === 'string' ? normalizeNimi(body.yritysNimi) : ''
    toimipisteNimi = typeof body.toimipisteNimi === 'string' ? normalizeNimi(body.toimipisteNimi) : ''
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

    // toimipisteNimi, osoite, kaupunki, and coordinates are all optional at creation
    // (ONBOARD-18/20): venue is created from name alone; location is collected in a later step.
    if (!yritysNimi) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // D-06/D-07/D-08: combined company+branch name, no trailing-space artifact
  // when toimipisteNimi is empty. Re-cap after concatenation: each field is
  // capped at 200 by normalizeNimi, but the combined value (200 + 1 + 200 =
  // 401) must be re-capped to stay within the same 200-char display bound.
  const nimi = (toimipisteNimi ? `${yritysNimi} ${toimipisteNimi}` : yritysNimi).slice(0, 200)

  // Step 1 of 4: INSERT into liikuntapaikat.
  // published=false: new venue hidden from users until admin approves (D-09, T-33-03-05).
  // business_managed is set to true by the approval trigger (PUB-01) when claim_status='approved'.
  const { data: newPaikka, error: paikkaError } = await supabaseAdmin
    .from('liikuntapaikat')
    .insert({ nimi, osoite: osoite || null, kaupunki: kaupunki || null, latitude, longitude, laji: 'Muu', published: false })
    .select('id')
    .single()

  if (paikkaError || !newPaikka) {
    return NextResponse.json(
      { error: 'Insert failed', detail: paikkaError?.message },
      { status: 500 }
    )
  }

  const newPaikkaId: number = newPaikka.id

  // Step 2 of 4: INSERT into business_paikka_links using verified user.id — never body.user_id.
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
    // PostgreSQL unique_violation (D-11, T-56-03): originally UNIQUE(paikka_id)
    // ("venue already linked"). Phase 59 widened this to a composite
    // UNIQUE(business_account_id, paikka_id), so for THIS route (which always
    // inserts a brand-new paikka_id immediately above) this branch is now
    // effectively unreachable in normal operation — kept as defensive
    // cleanup matching the generic error path below, not as a real conflict
    // path. tests/api/create-paikka.test.ts exercises it by mocking the
    // error code directly, not via real constraint behavior.
    if (linkError.code === '23505') {
      const { error: rollbackError } = await supabaseAdmin.from('liikuntapaikat').delete().eq('id', newPaikkaId)
      if (rollbackError) {
        console.error('[create-paikka] CRITICAL: rollback delete failed, orphaned row id=' + newPaikkaId, rollbackError.message)
      }
      return NextResponse.json({ error: 'Already claimed' }, { status: 409 })
    }
    // Atomicity rollback (D-10): delete the orphaned liikuntapaikat row so user can retry.
    const { error: rollbackError } = await supabaseAdmin.from('liikuntapaikat').delete().eq('id', newPaikkaId)
    if (rollbackError) {
      console.error('[create-paikka] CRITICAL: rollback delete failed, orphaned row id=' + newPaikkaId, rollbackError.message)
    }
    return NextResponse.json(
      { error: 'Link insert failed', detail: linkError.message },
      { status: 500 }
    )
  }

  // Step 3 of 4: write yritysNimi to companies.name via the caller's company_id (D-05/D-07).
  // Identity comes from the verified user.id, never the request body (T-56-01).
  // Two-step write: look up company_id from business_accounts, then update companies.name.
  // Non-critical: consistent with the is_claimed/email log-don't-rollback pattern below.
  const { data: companyLookup, error: companyLookupError } = await supabaseAdmin
    .from('business_accounts')
    .select('company_id')
    .eq('user_id', user.id)
    .single()

  if (companyLookupError || !companyLookup) {
    console.error('[create-paikka] company_id lookup failed (non-critical):', companyLookupError?.message)
  } else {
    const { error: companyUpdateError } = await supabaseAdmin
      .from('companies')
      .update({ name: yritysNimi })
      .eq('id', companyLookup.company_id)

    if (companyUpdateError) {
      console.error('[create-paikka] companies.name UPDATE failed (non-critical):', companyUpdateError.message)
    }
  }

  // Step 4 of 4: Set is_claimed = true as a denormalized public flag (D-07).
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
      .select('companies(name)')
      .eq('user_id', user.id)
      .single<{ companies: { name: string } | null }>()
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
    if (biz?.companies && paikka && link) {
      await sendAdminNotificationEmail({
        companyName: biz.companies.name,
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
