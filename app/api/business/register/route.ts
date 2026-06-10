import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin.server'

export async function POST(request: Request) {
  // Security: verify JWT from Authorization header before accepting any user data.
  // This prevents elevation-of-privilege: attacker cannot POST an arbitrary user_id
  // because supabaseAdmin bypasses RLS. Verified user.id is used for INSERT — not body.user_id.
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '') ?? ''
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse and validate request body
  let company_name: string
  let role_in_company: string | null
  try {
    const body = await request.json()
    company_name = typeof body.company_name === 'string'
      ? body.company_name.trim().slice(0, 200)
      : ''
    if (!company_name) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }
    role_in_company = typeof body.role_in_company === 'string'
      ? body.role_in_company.trim().slice(0, 100) || null
      : null
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Insert into business_accounts using verified user.id — never body.user_id
  const { error } = await supabaseAdmin
    .from('business_accounts')
    .insert({ user_id: user.id, company_name, role_in_company })

  if (error) {
    // Atomicity rollback (D-10): delete the orphaned auth user so the user can retry
    await supabaseAdmin.auth.admin.deleteUser(user.id)
    return NextResponse.json(
      { error: 'business_accounts insert failed', detail: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}
