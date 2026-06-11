import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin.server'
import { sendAdminNotificationEmail } from '@/lib/email'

export async function POST(request: Request) {
  // Security: verify JWT from Authorization header before accepting any user data.
  // This prevents elevation-of-privilege (T-33-03-01): attacker cannot spoof business_account_id
  // because supabaseAdmin bypasses RLS. Verified user.id is used for INSERT — not body.user_id.
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

  // INSERT into business_paikka_links using verified user.id — never body.user_id.
  // Service role key bypasses RLS so the insert succeeds regardless of auth.uid().
  const { error: linkError } = await supabaseAdmin
    .from('business_paikka_links')
    .insert({
      business_account_id: user.id,
      paikka_id: paikkaId,
      link_type: 'claim',
      claim_status: 'pending',
    })

  if (linkError) {
    // PostgreSQL unique_violation (T-33-03-04): UNIQUE(paikka_id) constraint — venue already claimed.
    if (linkError.code === '23505') {
      return NextResponse.json({ error: 'Already claimed' }, { status: 409 })
    }
    return NextResponse.json(
      { error: 'Link insert failed', detail: linkError.message },
      { status: 500 }
    )
  }

  // Set is_claimed = true on liikuntapaikat as a denormalized public flag (D-07).
  // Allows "Jo hallittu" check in search results without RLS-protected business_paikka_links query.
  // Non-critical: if this UPDATE fails, the claim link still exists — log but do not rollback.
  const { error: updateError } = await supabaseAdmin
    .from('liikuntapaikat')
    .update({ is_claimed: true, business_managed: true })
    .eq('id', paikkaId)

  if (updateError) {
    console.error('[claim-paikka] is_claimed UPDATE failed (non-critical):', updateError.message)
  }

  // Non-critical: send admin notification — failure does not rollback the claim
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
    // Get link id for deep link in email
    const { data: link } = await supabaseAdmin
      .from('business_paikka_links')
      .select('id')
      .eq('business_account_id', user.id)
      .eq('paikka_id', paikkaId)
      .single()
    if (biz && paikka && link) {
      await sendAdminNotificationEmail({
        companyName: biz.company_name,
        venueName: paikka.nimi,
        linkType: 'claim',
        applicationId: link.id,
        submittedAt: new Date().toISOString(),
      })
    }
  } catch (emailErr) {
    console.error('[claim-paikka] Admin notification email failed (non-critical):', emailErr)
  }

  // Per D-11: do NOT change published status — claimed venue stays visible to users.
  return NextResponse.json({ ok: true })
}
