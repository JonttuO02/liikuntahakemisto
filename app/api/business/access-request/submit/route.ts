import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin.server'
import { sendAccessRequestNotificationEmail } from '@/lib/email'

export async function POST(request: Request) {
  // Security: verify JWT from Authorization header before accepting any user data.
  // Prevents elevation-of-privilege: attacker cannot spoof requester_id
  // because supabaseAdmin bypasses RLS. Verified user.id is used for INSERT — not body.requester_id.
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '') ?? ''
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse and validate request body
  let paikkaId: number
  try {
    const body = await request.json()
    const parsed = parseInt(body.paikka_id, 10)
    if (isNaN(parsed)) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    paikkaId = parsed
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // D-09 guard: block if the requester already belongs to a company.
  // If no business_accounts row exists at all, the user hasn't registered yet — also blocked.
  // If company_id IS NOT NULL, the account is already tied to a company; switching companies
  // is not a supported flow (D-09 from CONTEXT.md).
  const { data: account, error: accountError } = await supabaseAdmin
    .from('business_accounts')
    .select('company_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (accountError) {
    return NextResponse.json(
      { error: 'Lookup failed', detail: accountError.message },
      { status: 500 }
    )
  }

  if (!account) {
    // No business_accounts row — user must register (via invite link) before submitting
    return NextResponse.json(
      { error: 'Ei rekisteröitynyttä yritystiliä. Rekisteröidy ensin kutsulinkin kautta.' },
      { status: 400 }
    )
  }

  if (account.company_id !== null) {
    // D-09: account already has a company — cannot request access to another venue's company
    return NextResponse.json(
      { error: 'Tilisi on jo liitetty toiseen yritykseen. Ota yhteyttä päähallitsijaan, jos tarvitset pääsyn tähän paikkaan.' },
      { status: 400 }
    )
  }

  // D-10 guard: verify that the target venue has an approved owner.
  // If no approved business_paikka_links row exists for this paikka_id, the invite link
  // is invalid or the venue has no current owner — reject without creating an orphan row.
  const { data: ownerLink, error: ownerLinkError } = await supabaseAdmin
    .from('business_paikka_links')
    .select('id')
    .eq('paikka_id', paikkaId)
    .eq('claim_status', 'approved')
    .maybeSingle()

  if (ownerLinkError) {
    return NextResponse.json(
      { error: 'Lookup failed', detail: ownerLinkError.message },
      { status: 500 }
    )
  }

  if (!ownerLink) {
    // D-10: no approved owner for this venue — link is invalid or venue has no current owner
    return NextResponse.json(
      { error: 'Tämä kutsulinkki ei ole voimassa. Pyydä uutta linkkiä paikan päähallitsijalta.' },
      { status: 400 }
    )
  }

  // D-08 idempotent insert: insert the access request. If a unique constraint violation
  // (23505) occurs, a pending request already exists for this (requester_id, paikka_id) pair
  // — re-fetch the existing row and return it as a success rather than erroring.
  // The partial UNIQUE index covers (requester_id, paikka_id) WHERE status = 'pending'.
  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('business_access_requests')
    .insert({ requester_id: user.id, paikka_id: paikkaId })
    .select()
    .single()

  if (insertError?.code === '23505') {
    // Duplicate pending request — idempotent: return existing row as success
    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('business_access_requests')
      .select()
      .eq('requester_id', user.id)
      .eq('paikka_id', paikkaId)
      .eq('status', 'pending')
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Insert failed', detail: insertError.message },
        { status: 500 }
      )
    }

    // Idempotent duplicate path: return existing pending request (no re-send email)
    return NextResponse.json({ ok: true, request: existing })
  }

  if (insertError) {
    return NextResponse.json(
      { error: 'Insert failed', detail: insertError.message },
      { status: 500 }
    )
  }

  // Non-critical owner-notification email: resolve the venue's approved owner and send
  // a notification. Failure here does NOT roll back the insert or block the 200 response.
  // Owner lookup is venue-scoped (Pitfall 5 from PATTERNS.md): join business_paikka_links
  // (paikka_id + claim_status='approved') to business_accounts (role='owner') — never
  // company-wide, since D-04 grants venue-specific access only.
  try {
    // Resolve the venue name for the email
    const { data: paikka } = await supabaseAdmin
      .from('liikuntapaikat')
      .select('nimi')
      .eq('id', paikkaId)
      .single()

    // Resolve the approved owner's user_id: find the business_accounts row that is both
    // the owner (role='owner') AND has an approved paikka_link for this specific venue.
    // Pitfall 5: do NOT look up all owners for the company — scope strictly by paikka_id.
    const { data: ownerAccount } = await supabaseAdmin
      .from('business_paikka_links')
      .select('business_account_id')
      .eq('paikka_id', paikkaId)
      .eq('claim_status', 'approved')
      .maybeSingle()

    if (ownerAccount?.business_account_id && paikka) {
      // Resolve owner's auth email via admin API
      const { data: ownerAuthData } = await supabaseAdmin.auth.admin.getUserById(
        ownerAccount.business_account_id
      )
      const ownerEmail = ownerAuthData?.user?.email

      // Resolve requester's display name: use email as fallback identifier
      const { data: requesterAuthData } = await supabaseAdmin.auth.admin.getUserById(user.id)
      const requesterName =
        requesterAuthData?.user?.user_metadata?.full_name ??
        requesterAuthData?.user?.email ??
        user.id

      if (ownerEmail) {
        await sendAccessRequestNotificationEmail(ownerEmail, {
          requesterName: String(requesterName),
          venueName: paikka.nimi,
          requestId: inserted.id,
        })
      }
    }
  } catch (emailErr) {
    console.error('[access-request/submit] Owner notification email failed (non-critical):', emailErr)
  }

  return NextResponse.json({ ok: true, request: inserted })
}
