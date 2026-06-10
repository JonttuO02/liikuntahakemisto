import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabaseSSR'
import { supabaseAdmin } from '@/lib/supabaseAdmin.server'
import Image from 'next/image'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
function storageUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/business-media/${path}`
}

export default async function AdminDetailPage({ params }: { params: { id: string } }) {
  const cookieStore = cookies()
  const supabase = createServerSupabase(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!profile?.is_admin) notFound()

  const linkId = parseInt(params.id, 10)
  if (isNaN(linkId)) notFound()

  const { data: link } = await supabaseAdmin
    .from('business_paikka_links')
    .select(`
      id,
      link_type,
      claim_status,
      created_at,
      rejection_reason,
      business_accounts(company_name, role_in_company, user_id),
      liikuntapaikat(
        nimi, osoite, kaupunki, laji,
        kuvaus, puhelin, varauslinkki,
        hinta_kuvaus, aukioloajat,
        image_url, photo_urls
      )
    `)
    .eq('id', linkId)
    .maybeSingle()

  if (!link) notFound()

  const businessUserId = (link.business_accounts as { user_id: string } | null)?.user_id
  let businessEmail: string | null = null
  if (businessUserId) {
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(businessUserId)
    businessEmail = authUser?.user?.email ?? null
  }

  const paikka = link.liikuntapaikat as Record<string, unknown> | null
  const business = link.business_accounts as { company_name: string; role_in_company: string | null } | null
  const photoUrls: string[] = Array.isArray(paikka?.photo_urls)
    ? (paikka.photo_urls as string[]).map(storageUrl)
    : []

  return (
    <main className="min-h-screen bg-white px-4 py-16">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <a href="/admin" className="text-sm text-[rgba(17,17,17,0.45)] hover:text-[#111111] [transition:color_150ms]">
          ← Takaisin listaan
        </a>
        <h1 className="text-xl font-bold text-[#111111]">Hakemuksen tiedot</h1>

        <div className="glass rounded-2xl p-5 flex flex-col gap-3">
          <SectionLabel>Hakija</SectionLabel>
          <Field label="Yritys">{business?.company_name ?? '—'}</Field>
          <Field label="Rooli">{business?.role_in_company ?? '—'}</Field>
          <Field label="Sähköposti">{businessEmail ?? '—'}</Field>
          <Field label="Tyyppi">{link.link_type === 'claim' ? 'Haltuunotto' : 'Uusi paikka'}</Field>
          <Field label="Lähetetty">{new Date(link.created_at).toLocaleString('fi-FI')}</Field>
          <Field label="Tila">{link.claim_status}</Field>
        </div>

        <div className="glass rounded-2xl p-5 flex flex-col gap-3">
          <SectionLabel>Paikka</SectionLabel>
          <Field label="Nimi">{String(paikka?.nimi ?? '—')}</Field>
          <Field label="Osoite">{String(paikka?.osoite ?? '—')}</Field>
          <Field label="Kaupunki">{String(paikka?.kaupunki ?? '—')}</Field>
          <Field label="Laji">{String(paikka?.laji ?? '—')}</Field>
        </div>

        {photoUrls.length > 0 && (
          <div className="glass rounded-2xl p-5 flex flex-col gap-3">
            <SectionLabel>Kuvat</SectionLabel>
            <div className="flex flex-wrap gap-2">
              {photoUrls.map((url, i) => (
                <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden border border-[rgba(0,0,0,0.07)]">
                  <Image src={url} alt={`Kuva ${i + 1}`} fill className="object-cover" unoptimized />
                </div>
              ))}
            </div>
          </div>
        )}

        {paikka?.hinta_kuvaus && (
          <div className="glass rounded-2xl p-5 flex flex-col gap-3">
            <SectionLabel>Hinnasto</SectionLabel>
            <pre className="text-sm text-[#111111] whitespace-pre-wrap font-sans">{String(paikka.hinta_kuvaus)}</pre>
          </div>
        )}

        <div className="glass rounded-2xl p-5 flex flex-col gap-3">
          <SectionLabel>Yhteystiedot</SectionLabel>
          {paikka?.puhelin && <Field label="Puhelin">{String(paikka.puhelin)}</Field>}
          {paikka?.varauslinkki && <Field label="Website">{String(paikka.varauslinkki)}</Field>}
          {paikka?.kuvaus && <Field label="Kuvaus">{String(paikka.kuvaus)}</Field>}
        </div>
      </div>
    </main>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold uppercase tracking-widest text-[rgba(17,17,17,0.45)]">{children}</p>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <span className="text-sm text-[rgba(17,17,17,0.45)] shrink-0 w-24">{label}:</span>
      <span className="text-sm text-[#111111]">{children}</span>
    </div>
  )
}
