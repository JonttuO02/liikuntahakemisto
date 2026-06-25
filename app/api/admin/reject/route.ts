import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin.server'
import { sendRejectionEmail } from '@/lib/email'

export async function POST(request: Request) {
  // Step 1: verify JWT
  const token = request.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Step 2: verify is_admin
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Step 3: parse link_id + rejection_reason
  let linkId: number
  let reason: string
  try {
    const body = await request.json()
    linkId = parseInt(body.link_id, 10)
    reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 1000) : ''
    if (isNaN(linkId) || !reason) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Step 4: fetch link to get paikka_id + business_account_id + claim_status
  const { data: link, error: linkFetchError } = await supabaseAdmin
    .from('business_paikka_links')
    .select('paikka_id, business_account_id, claim_status')
    .eq('id', linkId)
    .maybeSingle()
  if (linkFetchError || !link) {
    return NextResponse.json({ error: 'Link not found' }, { status: 404 })
  }

  // Step 4a: guard against rejecting a non-pending application
  if (link.claim_status !== 'pending') {
    return NextResponse.json({ error: 'Application is not pending' }, { status: 409 })
  }

  // Step 5: set claim_status = 'rejected' + save rejection_reason
  const { error: updateError } = await supabaseAdmin
    .from('business_paikka_links')
    .update({ claim_status: 'rejected', rejection_reason: reason })
    .eq('id', linkId)
  if (updateError) {
    return NextResponse.json({ error: 'Update failed', detail: updateError.message }, { status: 500 })
  }

  // Reset is_claimed so the venue can be claimed by another business (non-critical — log but don't rollback)
  const { error: resetError } = await supabaseAdmin
    .from('liikuntapaikat')
    .update({ is_claimed: false })
    .eq('id', link.paikka_id)
  if (resetError) {
    console.error('[admin/reject] is_claimed reset failed (non-critical):', resetError.message)
  }

  // Step 6: send rejection email to business (non-critical)
  try {
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(link.business_account_id)
    const { data: biz } = await supabaseAdmin
      .from('business_accounts')
      .select('companies(name)')
      .eq('user_id', link.business_account_id)
      .single<{ companies: { name: string } | null }>()
    const { data: paikka } = await supabaseAdmin
      .from('liikuntapaikat')
      .select('nimi')
      .eq('id', link.paikka_id)
      .single()
    if (authUser?.user?.email && biz?.companies && paikka) {
      await sendRejectionEmail(authUser.user.email, {
        companyName: biz.companies.name,
        venueName: paikka.nimi,
        reason,
      })
    }
  } catch (emailErr) {
    console.error('[admin/reject] Rejection email failed (non-critical):', emailErr)
  }

  return NextResponse.json({ ok: true })
}
