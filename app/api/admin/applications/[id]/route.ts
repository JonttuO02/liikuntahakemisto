import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin.server'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? ''
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const linkId = parseInt(params.id, 10)
  if (isNaN(linkId)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: link } = await supabaseAdmin
    .from('business_paikka_links')
    .select(`
      id, link_type, claim_status, created_at, rejection_reason,
      business_accounts(company_name, role_in_company, user_id),
      liikuntapaikat(id, nimi, osoite, kaupunki, laji, kuvaus, puhelin, varauslinkki, hinta_min, hinta_max, hinta_kuvaus, aukioloajat, image_url, photo_urls, logo_url, latitude, longitude)
    `)
    .eq('id', linkId)
    .maybeSingle()

  if (!link) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const businessUserId = (link.business_accounts as unknown as { user_id: string } | null)?.user_id
  let businessEmail: string | null = null
  if (businessUserId) {
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(businessUserId)
    businessEmail = authUser?.user?.email ?? null
  }

  return NextResponse.json({ ...link, businessEmail })
}
