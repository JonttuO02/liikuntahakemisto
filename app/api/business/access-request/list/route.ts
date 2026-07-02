import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin.server'

// Read-only endpoint: RLS SELECT on business_accounts/business_paikka_links is
// self-scoped only, so cross-account identity resolution MUST go through
// supabaseAdmin (service role) rather than the anon browser client (D-07, D-09,
// T-64-01/T-64-04 Information Disclosure mitigation).

type TeamMemberRow = {
  business_account_id: string
  claim_status: string
  business_accounts: { role: string; display_name: string | null } | null
}

type PendingRequestRow = {
  id: number
  requester_id: string
  created_at: string
}

async function resolveIdentity(
  id: string,
  displayNameFromDb: string | null | undefined,
  authDataById: Map<string, { email: string | null; full_name: string | null }>
) {
  const authData = authDataById.get(id)
  const name = displayNameFromDb ?? authData?.full_name ?? authData?.email ?? id
  const email = authData?.email ?? null
  return { name, email }
}

export async function GET(request: Request) {
  // Step 1: verify JWT — never trust a caller-supplied user id.
  const token = request.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Step 2: parse paikka_id from the query string.
  const url = new URL(request.url)
  const paikkaId = parseInt(url.searchParams.get('paikka_id') ?? '', 10)
  if (isNaN(paikkaId)) {
    return NextResponse.json({ error: 'Missing paikka_id' }, { status: 400 })
  }

  // Step 3: venue-scoped owner authorization (mirrors approve/route.ts lines 40-61).
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

  const { data: callerAccount } = await supabaseAdmin
    .from('business_accounts')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (callerAccount?.role !== 'owner') {
    return NextResponse.json({ error: 'Forbidden: owner role required' }, { status: 403 })
  }

  // Step 4: pending access requests for this venue.
  const { data: pendingRequestsRaw } = await supabaseAdmin
    .from('business_access_requests')
    .select('id, requester_id, created_at')
    .eq('paikka_id', paikkaId)
    .eq('status', 'pending')
  const pendingRequests = (pendingRequestsRaw ?? []) as PendingRequestRow[]

  // Step 5: current approved team members for this venue, joined to business_accounts
  // for role + display_name.
  const { data: teamMembersRaw } = await supabaseAdmin
    .from('business_paikka_links')
    .select('business_account_id, claim_status, business_accounts(role, display_name)')
    .eq('paikka_id', paikkaId)
    .eq('claim_status', 'approved')
  const teamMembers = (teamMembersRaw ?? []) as unknown as TeamMemberRow[]

  // Step 6: identity resolution — de-duplicate getUserById calls for ids that
  // appear in both lists.
  const uniqueIds = Array.from(
    new Set([...pendingRequests.map(r => r.requester_id), ...teamMembers.map(m => m.business_account_id)])
  )
  const authDataById = new Map<string, { email: string | null; full_name: string | null }>()
  await Promise.all(
    uniqueIds.map(async id => {
      const { data: authData } = await supabaseAdmin.auth.admin.getUserById(id)
      authDataById.set(id, {
        email: authData?.user?.email ?? null,
        full_name: (authData?.user?.user_metadata?.full_name as string | undefined) ?? null,
      })
    })
  )

  const pendingRequestsResponse = await Promise.all(
    pendingRequests.map(async r => {
      const { name, email } = await resolveIdentity(r.requester_id, undefined, authDataById)
      return { id: r.id, requesterId: r.requester_id, name, email }
    })
  )

  const teamMembersResponse = await Promise.all(
    teamMembers.map(async m => {
      const { name, email } = await resolveIdentity(
        m.business_account_id,
        m.business_accounts?.display_name,
        authDataById
      )
      return {
        userId: m.business_account_id,
        name,
        email,
        role: m.business_accounts?.role ?? null,
        isSelf: m.business_account_id === user.id,
      }
    })
  )

  return NextResponse.json({ pendingRequests: pendingRequestsResponse, teamMembers: teamMembersResponse })
}
