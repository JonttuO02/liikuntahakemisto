'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { createBusinessBrowserClient } from '@/lib/supabase-business'
import { changeLocaleAction } from '@/app/actions/locale'

interface Props {
  companyName: string
  email: string
  contactPhone: string
  userId: string
}

export default function BusinessProfiiliClient({ companyName, email, contactPhone, userId }: Props) {
  const [phone, setPhone] = useState(contactPhone)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const t = useTranslations('Business')
  const locale = useLocale()
  const router = useRouter()

  async function handleSave() {
    const { error } = await createBusinessBrowserClient()
      .from('business_accounts')
      .update({ contact_phone: phone.trim() })
      .eq('user_id', userId)
    if (!error) {
      setSaved(true)
      setSaveError(null)
      setTimeout(() => setSaved(false), 2500)
    } else {
      setSaveError(t('profileSaveError'))
    }
  }

  async function handleSignOut() {
    try {
      await createBusinessBrowserClient().auth.signOut()
    } finally {
      router.push('/business/kirjaudu')
    }
  }

  function toggle() {
    const next = locale === 'fi' ? 'en' : 'fi'
    startTransition(async () => {
      await changeLocaleAction(next)
      router.refresh()
    })
  }

  return (
    <main className="min-h-screen bg-white pt-16 px-4 pb-24">
      <div className="max-w-2xl mx-auto flex flex-col gap-4 py-8">
        <h1 className="text-xl font-bold text-[#111111]">{t('profileTitle')}</h1>

        {/* Section 1 — Read-only account info */}
        <div className="glass rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-[#111111] uppercase tracking-widest">
              {t('profileCompanyName')}
            </span>
            <span className="text-sm font-bold text-[#111111]">{companyName}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-[#111111] uppercase tracking-widest">
              {t('profileEmail')}
            </span>
            <span className="text-sm text-[rgba(17,17,17,0.45)]">{email}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-[#111111] uppercase tracking-widest">
              {t('profileAccountType')}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest bg-green-100 text-green-700 rounded-full px-2 py-0.5 self-start">
              {t('profileAccountType')}
            </span>
          </div>
        </div>

        {/* Section 2 — Editable phone */}
        <div className="glass rounded-2xl p-4 flex flex-col gap-3">
          <label className="text-[10px] font-bold text-[#111111] uppercase tracking-widest">
            {t('profilePhone')}
          </label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder={t('profilePhonePlaceholder')}
            className="border border-[rgba(0,0,0,0.12)] rounded-xl px-3 py-2 text-sm text-[#111111] bg-white focus:outline-none focus:border-[rgba(0,0,0,0.3)]"
          />
          <button
            onClick={handleSave}
            className="bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm px-5 py-2 rounded-full self-start [transition:background-color_150ms_var(--ease-out)]"
          >
            {t('profileSave')}
          </button>
          {saved && <p className="text-sm text-green-700">{t('profileSaved')}</p>}
          {saveError && <p className="text-sm text-red-600">{saveError}</p>}
        </div>

        {/* Section 3 — Language toggle */}
        <div className="glass rounded-2xl p-4 flex flex-col gap-3">
          <label className="text-[10px] font-bold text-[#111111] uppercase tracking-widest">
            {t('profileLanguage')}
          </label>
          <button
            onClick={toggle}
            disabled={isPending}
            className="bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm px-5 py-2 rounded-full self-start [transition:background-color_150ms_var(--ease-out)] disabled:opacity-60"
          >
            {locale === 'fi' ? 'English' : 'Suomi'}
          </button>
        </div>

        {/* Section 4 — Sign out */}
        <div>
          <button
            onClick={handleSignOut}
            className="border border-[rgba(0,0,0,0.12)] text-[#111111] font-bold text-sm px-5 py-2 rounded-full"
          >
            {t('profileSignOut')}
          </button>
        </div>
      </div>
    </main>
  )
}
