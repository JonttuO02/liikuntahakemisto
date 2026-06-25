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

  // Step 2: parse request_id and optional reason from body.
  // reason is optional per ACCESS-05; trimmed and capped at 500 chars when provided.
  let requestId: number
  let reason: string | null = null
  try {
    const body = await request.json()
    requestId = parseInt(body.request_id, 10)
    if (isNaN(requestId)) {
      return NextResponse.json({ error: 'Missing request_id' }, { status: 400 })
    }
    if (typeof body.reason === 'string' && body.reason.trim().length > 0) {
      reason = body.reason.trim().slice(0, 500)
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
  // not just any owner in the company.
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
    .select('role')
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
  // Sets status='rejected' with optional rejection_reason. The WHERE status='pending'
  // filter ensures two concurrent rejects (or a reject racing an approve) cannot
  // both succeed: the second call sees 0 rows updated.
  const { error: updateError, count } = await supabaseAdmin
    .from('business_access_requests')
    .update(
      {
        status: 'rejected',
        rejection_reason: reason,
        updated_at: new Date().toISOString(),
      },
      { count: 'exact' }
    )
    .eq('id', requestId)
    .eq('status', 'pending')
  if (updateError) {
    return NextResponse.json({ error: 'Update failed', detail: updateError.message }, { status: 500 })
  }
  if (!count) {
    return NextResponse.json({ error: 'Access request already processed' }, { status: 409 })
  }

  // Step 7: NO access grant writes on rejection.
  // The requester's business_accounts.company_id and role remain unchanged (still
  // NULL if invite-link signup, per D-09a). No business_paikka_links row is inserted.

  // Step 8: Non-critical requester email — never blocks the 200 response (T-60-06).
  // reason is rendered by sendAccessRequestDecisionEmail only when truthy.
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
        approved: false,
        reason: reason ?? undefined,
      })
    }
  } catch (emailErr) {
    console.error('[access-request/reject] Decision email failed (non-critical):', emailErr)
  }

  return NextResponse.json({ ok: true })
}
