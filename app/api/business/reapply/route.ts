import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin.server'
import { sendAdminNotificationEmail } from '@/lib/email'

export async function POST(request: Request) {
  // Security: verify JWT from Authorization header before accepting any user data.
  // Prevents elevation-of-privilege: attacker cannot spoof business_account_id
  // because supabaseAdmin bypasses RLS. Verified user.id is used for UPDATE — not body.user_id.
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

  // Find the existing rejected row for this user + venue combination
  const { data: rejectedLink, error: findError } = await supabaseAdmin
    .from('business_paikka_links')
    .select('id')
    .eq('business_account_id', user.id)
    .eq('paikka_id', paikkaId)
    .eq('claim_status', 'rejected')
    .maybeSingle()

  if (findError) {
    return NextResponse.json(
      { error: 'Lookup failed', detail: findError.message },
      { status: 500 }
    )
  }

  if (!rejectedLink) {
    return NextResponse.json({ error: 'No rejected application found' }, { status: 404 })
  }

  // UPDATE the found row: reset claim_status to pending and clear rejection_reason
  const { error: updateError } = await supabaseAdmin
    .from('business_paikka_links')
    .update({ claim_status: 'pending', rejection_reason: null })
    .eq('id', rejectedLink.id)

  if (updateError) {
    return NextResponse.json(
      { error: 'Update failed', detail: updateError.message },
      { status: 500 }
    )
  }

  // Non-critical: send admin notification — failure does not rollback the reapply
  try {
    const { data: biz } = await supabaseAdmin
      .from('business_accounts')
      .select('company_name')
      .eq('user_id', user.id)
      .single()
    const { data: paikka } = await supabaseAdmin
      .from('liikuntapaikat')
      .select('nimi')
      .eq('id', paikkaId)
      .single()
    if (biz && paikka) {
      await sendAdminNotificationEmail({
        companyName: biz.company_name,
        venueName: paikka.nimi,
        linkType: 'claim',
        applicationId: rejectedLink.id,
        submittedAt: new Date().toISOString(),
      })
    }
  } catch (emailErr) {
    console.error('[reapply] Admin notification email failed (non-critical):', emailErr)
  }

  return NextResponse.json({ ok: true })
}
