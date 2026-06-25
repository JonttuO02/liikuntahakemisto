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
  let invite: boolean
  try {
    const body = await request.json()
    invite = body.invite === true

    company_name = typeof body.company_name === 'string'
      ? body.company_name.trim().slice(0, 200)
      : ''

    // company_name is required only in the default (non-invite) path.
    // Invite-link employees join an existing company — they don't name a new one.
    if (!invite && !company_name) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    role_in_company = typeof body.role_in_company === 'string'
      ? body.role_in_company.trim().slice(0, 100) || null
      : null
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // --- INVITE-LINK PATH (D-09a) ---
  // When invite === true, the employee was brought in via a shareable invite link
  // for a specific venue. We do NOT auto-create a company for them — company_id
  // stays NULL until the access-request approval (Plan 04) sets it to the inviting
  // venue's company. role is 'member' (not 'owner') because they are joining an
  // existing company, not founding one.
  if (invite) {
    const { error: accountError } = await supabaseAdmin
      .from('business_accounts')
      .insert({ user_id: user.id, company_id: null, role: 'member', role_in_company })

    if (accountError) {
      return NextResponse.json(
        { error: 'business_accounts insert failed', detail: accountError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  }

  // --- DEFAULT PATH (unchanged) ---
  // Every standard signup becomes the owner of its own new company.
  // companies.name is the single source of truth (D-05; business_accounts no
  // longer has a company_name column).

  // Step 1 of 2: INSERT into companies. Forward-going equivalent of Plan 01's
  // backfill — every new signup becomes the owner of its own new company.
  const { data: newCompany, error: companyError } = await supabaseAdmin
    .from('companies')
    .insert({ name: company_name })
    .select('id')
    .single()

  if (companyError || !newCompany) {
    return NextResponse.json(
      { error: 'companies insert failed', detail: companyError?.message },
      { status: 500 }
    )
  }

  const newCompanyId: number = newCompany.id

  // Step 2 of 2: INSERT into business_accounts using verified user.id — never
  // body.user_id. role: 'owner' is the new enum column (forward-going
  // equivalent of D-09); role_in_company is the existing free-text field and
  // is distinct from role — both are set.
  const { error } = await supabaseAdmin
    .from('business_accounts')
    .insert({ user_id: user.id, company_id: newCompanyId, role: 'owner', role_in_company })

  if (error) {
    // Rollback: delete the just-created companies row so a retry doesn't leave
    // an orphan (mirrors create-paikka's insert-then-rollback pattern). Do NOT
    // delete the auth user here. A transient DB error (connectivity,
    // constraint violation other than duplicate user_id) should not destroy
    // the user's newly-created account. The auth user remains valid so the
    // client can retry the registration. Dangling auth users without a
    // business_accounts row can be cleaned up by a scheduled maintenance job.
    const { error: rollbackError } = await supabaseAdmin.from('companies').delete().eq('id', newCompanyId)
    if (rollbackError) {
      console.error('[register] CRITICAL: rollback delete failed, orphaned companies row id=' + newCompanyId, rollbackError.message)
    }
    return NextResponse.json(
      { error: 'business_accounts insert failed', detail: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}
