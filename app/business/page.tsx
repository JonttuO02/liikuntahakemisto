'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createBrowserSupabase } from '@/lib/supabaseSSR'
import ClaimSearchForm from '@/app/components/ClaimSearchForm'

export default function BusinessPage() {
  const t = useTranslations('Business')
  const router = useRouter()
  const [hasLinks, setHasLinks] = useState(false)
  const [venueName, setVenueName] = useState('')
  const [loading, setLoading] = useState(true)
  const [isNotBusinessAccount, setIsNotBusinessAccount] = useState(false)

  useEffect(() => {
    async function checkLinks() {
      const supabase = createBrowserSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data: account } = await supabase
        .from('business_accounts')
        .select('onboarding_completed')
        .eq('user_id', user.id)
        .maybeSingle()

      // Guard: authenticated user with no business_accounts row is a consumer, not a business.
      // Show a registration prompt rather than the venue claim form (WR-05).
      if (!account) {
        setIsNotBusinessAccount(true)
        setLoading(false)
        return
      }

      if (!account.onboarding_completed) {
        router.push('/business/onboarding')
        return
      }

      const { data: links } = await supabase
        .from('business_paikka_links')
        .select('paikka_id, liikuntapaikat(nimi)')
        .eq('business_account_id', user.id)
        .limit(1)
      if (links && links.length > 0) {
        setHasLinks(true)
        const first = links[0] as unknown as { paikka_id: number; liikuntapaikat: { nimi: string } | null }
        setVenueName(first.liikuntapaikat?.nimi ?? '')
      }
      setLoading(false)
    }
    checkLinks()
  }, [])

  if (loading) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-[rgba(17,17,17,0.12)] border-t-[#111111] animate-spin" />
      </main>
    )
  }

  if (isNotBusinessAccount) {
    return (
      <main className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-16">
        <div className="glass rounded-2xl p-6 w-full max-w-sm flex flex-col items-center gap-4 text-center">
          <h1 className="text-xl font-bold text-[#111111]">{t('registerTitle')}</h1>
          <p className="text-sm text-[rgba(17,17,17,0.45)]">{t('errorGeneric')}</p>
          <a
            href="/business/rekisteroidy"
            className="bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm rounded-full h-10 px-6 flex items-center [transition:background-color_150ms_var(--ease-out)]"
          >
            {t('registerCta')}
          </a>
        </div>
      </main>
    )
  }

  if (hasLinks) {
    return (
      <main className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-16">
        <div className="glass rounded-2xl p-6 w-full max-w-sm flex flex-col items-center gap-4 text-center">
          <h1 className="text-xl font-bold text-[#111111]">{t('pendingTitle')}</h1>
          <p className="text-sm text-[rgba(17,17,17,0.45)]">{t('pendingVenueLabel')}: {venueName}</p>
          <p className="text-sm text-[rgba(17,17,17,0.45)]">{t('pendingBody')}</p>
          <a
            href="/"
            className="bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm rounded-full h-10 px-6 flex items-center [transition:background-color_150ms_var(--ease-out)]"
          >
            {t('backToHome')}
          </a>
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
