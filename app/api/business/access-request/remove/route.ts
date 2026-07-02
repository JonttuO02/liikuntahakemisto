import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin.server'
// D-11: no email import — removal is silent, no notification is sent.

export async function POST(request: Request) {
  // Step 1: verify JWT — prevents spoofing business_account_id via body.
  // supabaseAdmin.auth.getUser validates the token server-side.
  const token = request.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Step 2: parse paikka_id + target_user_id from body.
  let paikkaId: number
  let targetUserId: string
  try {
    const body = await request.json()
    paikkaId = parseInt(body.paikka_id, 10)
    targetUserId = typeof body.target_user_id === 'string' ? body.target_user_id : ''
    if (isNaN(paikkaId) || !targetUserId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Step 3: ACCESS-07 hard self-removal block — enforced server-side FIRST,
  // before any DB access, independent of UI state (D-12/D-14, Pitfall 9).
  if (targetUserId === user.id) {
    return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 })
  }

  // Step 4: Venue-scoped owner-authorization check (Pitfall 8, mirrors
  // approve/route.ts exactly). The caller must be an approved owner of the
  // SPECIFIC venue (paikka_id) being managed, not just any owner in the
  // company — an owner of Venue A must not be able to remove a member from
  // Venue B.
  const { data: ownerLink } = await supabaseAdmin
    .from('business_paikka_links')
    .select('business_account_id')
    .eq('paikka_id', paikkaId)
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

  // Step 5: Concurrency-safe literal DELETE (Pitfall 4 — no 'removed' status
  // value exists in the claim_status CHECK constraint; an UPDATE would 500 at
  // runtime). The approval-publish trigger `set_business_managed_on_approval()`
  // fires only on UPDATE-to-approved, never on DELETE (Pitfall 5, verified),
  // so removing a sub-manager cannot unpublish the venue.
  const { error, count } = await supabaseAdmin
    .from('business_paikka_links')
    .delete({ count: 'exact' })
    .eq('business_account_id', targetUserId)
    .eq('paikka_id', paikkaId)
  if (error) {
    return NextResponse.json({ error: 'Delete failed', detail: error.message }, { status: 500 })
  }
  if (!count) {
    return NextResponse.json({ error: 'Member not found for this venue' }, { status: 404 })
  }

  // D-11: no email notification — silent removal.
  return NextResponse.json({ ok: true })
}
