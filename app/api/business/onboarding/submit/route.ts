import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin.server'
import { hinnastaToHintaKuvaus } from '@/lib/onboardingUtils'
import { sendAdminNotificationEmail } from '@/lib/email'

export async function POST(request: Request) {
  // Security: verify JWT from Authorization header before any mutation.
  // This prevents T-34-05-01 (Elevation of Privilege): only the verified business owner
  // can trigger the draft → liikuntapaikat atomic commit.
  // supabaseAdmin bypasses RLS, so we must verify identity from the token first.
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '') ?? ''
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Step 1: Fetch draft with joined paikka data needed for liikuntapaikat update.
  // We join to get nimi, laji, osoite, kaupunki for the preview — not strictly needed here
  // but included for consistency with the draft shape used by StepEsikatselu.
  const { data: draft, error: draftError } = await supabaseAdmin
    .from('onboarding_draft')
    .select('*, liikuntapaikat(nimi, osoite, kaupunki, laji, latitude, longitude, aukioloajat)')
    .eq('business_account_id', user.id)
    .maybeSingle()  // returns null when no row, not a PGRST116 error

  if (draftError || !draft) {
    return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
  }

  // Step 2: SECURITY CHECK (T-34-05-01) — verify business_paikka_links ownership.
  // The business must own the venue before we update liikuntapaikat.
  // supabaseAdmin bypasses RLS, so this explicit ownership check is mandatory.
  const { data: link, error: linkError } = await supabaseAdmin
    .from('business_paikka_links')
    .select('id, link_type')
    .eq('business_account_id', user.id)
    .eq('paikka_id', draft.paikka_id)
    .maybeSingle()

  if (linkError || !link) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Step 3: Build hinta_kuvaus from draft.hinnasto JSONB.
  // hinnastaToHintaKuvaus produces the newline-separated format that priceItemList() in
  // lib/priceUtils.ts expects for display in PaikkaKortti / DiagonaalKortti.
  const hintaKuvaus = hinnastaToHintaKuvaus(draft.hinnasto ?? [])

  // Step 4: Update liikuntapaikat with all business-supplied data from the draft.
  // CRITICAL: if this update fails, we return 500 WITHOUT deleting the draft —
  // the draft is preserved so the user can retry without losing their work.

  // Validate varauslinkki: only accept http/https URLs to prevent XSS via javascript: scheme (WR-06).
  const rawWebsite = draft.yhteystiedot?.website?.trim() ?? null
  let varauslinkki: string | null = null
  if (rawWebsite) {
    try {
      const u = new URL(rawWebsite)
      if (u.protocol === 'https:' || u.protocol === 'http:') {
        varauslinkki = rawWebsite
      }
    } catch { /* invalid URL — leave null */ }
  }

  const { error: updateError } = await supabaseAdmin
    .from('liikuntapaikat')
    .update({
      hinta_kuvaus: hintaKuvaus,
      aukioloajat: draft.aukioloajat ?? null,
      kuvaus: draft.yhteystiedot?.kuvaus?.trim() ?? null,
      puhelin: draft.yhteystiedot?.puhelin?.trim() ?? null,
      varauslinkki,
      image_url: draft.media_urls?.photos?.[0] ?? null,
      photo_urls: draft.media_urls?.photos ?? null,
      logo_url: draft.media_urls?.logo ?? null,
      business_managed: true,
    })
    .eq('id', draft.paikka_id)

  if (updateError) {
    // Draft intentionally NOT deleted — preserved for retry.
    return NextResponse.json({ error: 'Update failed', detail: updateError.message }, { status: 500 })
  }

  // Step 5a: Reset claim_status to 'pending' so the admin sees a fresh actionable item
  // with all venue data filled in. This handles the case where the admin acted on the
  // initial claim/create submission before onboarding was complete (premature approval).
  // Non-critical: failure does not block onboarding completion.
  const { error: claimStatusError } = await supabaseAdmin
    .from('business_paikka_links')
    .update({ claim_status: 'pending' })
    .eq('business_account_id', user.id)
    .eq('paikka_id', draft.paikka_id)

  if (claimStatusError) {
    console.error('[onboarding/submit] claim_status reset to pending failed (non-critical):', claimStatusError.message)
  }

  // Step 6: Delete the draft now that liikuntapaikat is updated (D-06).
  // Only reached after Step 4 succeeded — draft is not deleted on error paths.
  const { error: deleteError } = await supabaseAdmin
    .from('onboarding_draft')
    .delete()
    .eq('business_account_id', user.id)
    .eq('paikka_id', draft.paikka_id)

  if (deleteError) {
    console.error('[onboarding/submit] Draft DELETE failed (non-critical):', deleteError.message)
  }

  // Non-critical: send admin notification — failure does not rollback the onboarding submit
  try {
    const { data: biz } = await supabaseAdmin
      .from('business_accounts')
      .select('company_name')
      .eq('user_id', user.id)
      .single()
    const { data: paikka } = await supabaseAdmin
      .from('liikuntapaikat')
      .select('nimi')
      .eq('id', draft.paikka_id)
      .single()
    if (biz && paikka && link) {
      await sendAdminNotificationEmail({
        companyName: biz.company_name,
        venueName: paikka.nimi,
        linkType: link.link_type as 'claim' | 'created',
        applicationId: link.id,
        submittedAt: new Date().toISOString(),
      })
    }
  } catch (emailErr) {
    console.error('[onboarding/submit] Admin notification email failed (non-critical):', emailErr)
  }

  return NextResponse.json({ ok: true })
}
