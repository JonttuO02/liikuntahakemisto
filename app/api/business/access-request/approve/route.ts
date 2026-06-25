import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin.server'
import { sendAccessRequestDecisionEmail } from '@/lib/email'

export async function POST(request: Request) {
  // Step 1: verify JWT — prevents spoofing business_account_id via body.
  // supabaseAdmin.auth.getUser validates the token server-side.
  const token = request.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Step 2: parse request_id from body
  let requestId: number
  try {
    const body = await request.json()
    requestId = parseInt(body.request_id, 10)
    if (isNaN(requestId)) {
      return NextResponse.json({ error: 'Missing request_id' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Step 3: fetch the access request row
  const { data: row, error: rowFetchError } = await supabaseAdmin
    .from('business_access_requests')
    .select('id, requester_id, paikka_id, status')
    .eq('id', requestId)
    .maybeSingle()
  if (rowFetchError || !row) {
    return NextResponse.json({ error: 'Access request not found' }, { status: 404 })
  }

  // Step 4: Venue-scoped owner-authorization check (T-60-11, Assumption A3, D-04).
  // The caller must be an approved owner of the SPECIFIC venue in this request,
  // not just any owner in the company. Do NOT allow a company-wide role='owner'
  // to approve a request for a venue they don't manage.
  const { data: ownerLink } = await supabaseAdmin
    .from('business_paikka_links')
    .select('business_account_id')
    .eq('paikka_id', row.paikka_id)
    .eq('claim_status', 'approved')
    .eq('business_account_id', user.id)
    .maybeSingle()

  if (!ownerLink) {
    return NextResponse.json({ error: 'Forbidden: not an approved owner of this venue' }, { status: 403 })
  }

  // Also verify the caller has role='owner' (not just any member with an approved link).
  const { data: callerAccount } = await supabaseAdmin
    .from('business_accounts')
    .select('role, company_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (callerAccount?.role !== 'owner') {
    return NextResponse.json({ error: 'Forbidden: owner role required' }, { status: 403 })
  }

  // Step 5: non-pending guard (fast-path before the atomic update)
  if (row.status !== 'pending') {
    return NextResponse.json({ error: 'Access request is not pending' }, { status: 409 })
  }

  // Step 6: Atomic transition — T-60-03 concurrency guard.
  // Filtering on status='pending' in the WHERE clause means two concurrent
  // approvals can only succeed once: the second call sees 0 rows updated.
  const { error: updateError, count } = await supabaseAdmin
    .from('business_access_requests')
    .update({ status: 'approved', updated_at: new Date().toISOString() }, { count: 'exact' })
    .eq('id', requestId)
    .eq('status', 'pending')
  if (updateError) {
    return NextResponse.json({ error: 'Update failed', detail: updateError.message }, { status: 500 })
  }
  if (!count) {
    return NextResponse.json({ error: 'Access request already processed' }, { status: 409 })
  }

  // Step 7: Grant venue-scoped access via supabaseAdmin (T-60-12, D-04, D-05, Pitfall 3).
  // All writes bypass RLS — the RLS INSERT policy "Requester inserts own access request"
  // uses auth.uid() = business_account_id, which would reject an on-behalf-of insert.
  // The inviting venue's company_id comes from the approver's own account (same company).
  const requesterCompanyId = callerAccount.company_id

  // 7a: Set the requester's company_id and role='member' on their business_accounts row.
  const { error: memberUpdateError } = await supabaseAdmin
    .from('business_accounts')
    .update({ company_id: requesterCompanyId, role: 'member' })
    .eq('user_id', row.requester_id)
  if (memberUpdateError) {
    return NextResponse.json({ error: 'Member grant failed', detail: memberUpdateError.message }, { status: 500 })
  }

  // 7b: Insert (or upsert) a business_paikka_links row granting the requester
  // access to exactly the requested venue (D-04: venue-only, not company-wide).
  // Uses upsert in case a prior rejected link row already exists for this
  // (business_account_id, paikka_id) pair (composite UNIQUE after Phase 59).
  const { error: linkError } = await supabaseAdmin
    .from('business_paikka_links')
    .upsert(
      {
        business_account_id: row.requester_id,
        paikka_id: row.paikka_id,
        claim_status: 'approved',
        link_type: 'claim',
      },
      { onConflict: 'business_account_id,paikka_id' }
    )
  if (linkError) {
    return NextResponse.json({ error: 'Venue link grant failed', detail: linkError.message }, { status: 500 })
  }

  // Step 8: Non-critical requester email — never blocks the 200 response (T-60-06).
  try {
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(row.requester_id)
    const { data: paikka } = await supabaseAdmin
      .from('liikuntapaikat')
      .select('nimi')
      .eq('id', row.paikka_id)
      .single()
    if (authUser?.user?.email && paikka) {
      await sendAccessRequestDecisionEmail(authUser.user.email, {
        venueName: paikka.nimi,
        approved: true,
      })
    }
  } catch (emailErr) {
    console.error('[access-request/approve] Decision email failed (non-critical):', emailErr)
  }

  return NextResponse.json({ ok: true })
}
