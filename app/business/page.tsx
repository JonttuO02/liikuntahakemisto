'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { createBrowserSupabase } from '@/lib/supabaseSSR'
import ClaimSearchForm from '@/app/components/ClaimSearchForm'

export default function BusinessPage() {
  const t = useTranslations('Business')
  const [hasLinks, setHasLinks] = useState(false)
  const [venueName, setVenueName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkLinks() {
      const supabase = createBrowserSupabase()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
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
