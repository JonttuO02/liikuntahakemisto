import { cookies } from 'next/headers'
import { getTranslations } from 'next-intl/server'
import { createServerSupabase } from '@/lib/supabaseSSR'
import ClaimSearchForm from '@/app/components/ClaimSearchForm'

export default async function BusinessPage() {
  const cookieStore = cookies()
  const supabase = createServerSupabase(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()
  const t = await getTranslations('Business')

  let hasLinks = false
  let venueName = ''

  if (user) {
    const { data: links } = await supabase
      .from('business_paikka_links')
      .select('paikka_id, liikuntapaikat(nimi)')
      .eq('business_account_id', user.id)
      .limit(1)

    if (links && links.length > 0) {
      hasLinks = true
      const firstLink = links[0] as unknown as { paikka_id: number; liikuntapaikat: { nimi: string } | null }
      venueName = firstLink.liikuntapaikat?.nimi ?? ''
    }
  }

  if (hasLinks) {
    return (
      <main className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-16">
        <div className="glass rounded-2xl p-6 w-full max-w-sm flex flex-col items-center gap-4 text-center">
          <h1 className="text-xl font-bold text-[#111111]">{t('pendingTitle')}</h1>
          <p className="text-sm text-[rgba(17,17,17,0.45)]">{t('pendingVenueLabel')}: {venueName}</p>
          <p className="text-sm text-[rgba(17,17,17,0.45)]">{t('pendingBody')}</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-16">
      <div className="glass rounded-2xl p-6 w-full max-w-md flex flex-col gap-4">
        <h1 className="text-xl font-bold text-[#111111]">{t('claimTitle')}</h1>
        <ClaimSearchForm />
      </div>
    </main>
  )
}
