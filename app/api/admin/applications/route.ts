import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin.server'

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? ''
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data } = await supabaseAdmin
    .from('business_paikka_links')
    .select(`
      id, paikka_id, link_type, claim_status, created_at,
      business_accounts(company_name, role_in_company, user_id),
      liikuntapaikat(nimi, osoite, kaupunki)
    `)
    .eq('claim_status', 'pending')
    .order('created_at', { ascending: true })

  return NextResponse.json(data ?? [])
}
