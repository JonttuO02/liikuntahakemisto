'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { createBusinessBrowserClient } from '@/lib/supabase-business'

// ─── Shared class constants ───────────────────────────────────────────────────

const INPUT_CLASS =
  'flex-1 border border-[rgba(0,0,0,0.12)] focus:border-[rgba(0,0,0,0.25)] rounded-lg h-10 px-3 text-sm outline-none [transition:border-color_150ms_var(--ease-out)]'

const CTA_CLASS =
  'bg-[#111111] rounded-full h-10 w-full text-sm font-bold text-white hover:bg-[#333333] disabled:opacity-60 disabled:pointer-events-none [transition:background-color_150ms_var(--ease-out)]'

// ─── Component ────────────────────────────────────────────────────────────────

export default function ClaimSearchForm() {
  const t = useTranslations('Business')
  const router = useRouter()

  // Create form — only flow left (CLAIM-04): no search, no claim step.
  const [yritysNimi, setYritysNimi] = useState('')
  const [toimipisteNimi, setToimipisteNimi] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')

  // Shared
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ─── Handlers ─────────────────────────────────────────────────────────────

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!yritysNimi.trim()) {
      setError(t('errorNameRequired'))
      return
    }

    setLoading(true)
    setError(null)

    const { data: { session } } = await createBusinessBrowserClient().auth.getSession()
    const token = session?.access_token ?? ''

    try {
      const res = await fetch('/api/business/create-paikka', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          yritysNimi: yritysNimi.trim(),
          toimipisteNimi: toimipisteNimi.trim(),
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const trimmedUrl = websiteUrl.trim()
        if (trimmedUrl && data.paikka_id) {
          // Fire-and-forget AI analysis — result polled by onboarding page
          fetch('/api/business/analyze-website', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ url: trimmedUrl, paikka_id: data.paikka_id }),
          })
        }
        const params = new URLSearchParams()
        if (data.paikka_id) params.set('paikka_id', String(data.paikka_id))
        if (trimmedUrl) params.set('website_url', trimmedUrl)
        router.push(`/business/onboarding?${params.toString()}`)
        return
      }

      if (res.status === 409) {
        setError(t('errorVenueAlreadyTaken'))
      } else {
        setError(t('errorCreateFailed'))
      }
    } catch {
      setError(t('errorCreateFailed'))
    } finally {
      setLoading(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div aria-live="polite">
      <form onSubmit={handleCreate} className="flex flex-col gap-3">
        <input
          type="text"
          placeholder={t('yritysNimiPlaceholder')}
          aria-label={t('yritysNimiLabel')}
          className={INPUT_CLASS}
          value={yritysNimi}
          onChange={e => setYritysNimi(e.target.value)}
        />

        <input
          type="text"
          placeholder={t('toimipisteNimiPlaceholder')}
          aria-label={t('toimipisteNimiLabel')}
          className={INPUT_CLASS}
          value={toimipisteNimi}
          onChange={e => setToimipisteNimi(e.target.value)}
        />
        <p className="text-sm text-[rgba(17,17,17,0.45)]">{t('toimipisteNimiHelper')}</p>
        <input
          type="url"
          placeholder={t('websiteUrlPlaceholder')}
          aria-label={t('websiteUrlLabel')}
          className={INPUT_CLASS}
          value={websiteUrl}
          onChange={e => setWebsiteUrl(e.target.value)}
        />
        <p className="text-sm text-[rgba(17,17,17,0.45)]">{t('websiteUrlHelper')}</p>

        {/* Error block */}
        <AnimatePresence>
          {error && (
            <motion.div
              key="create-error"
              role="alert"
              aria-live="polite"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <p className="text-sm text-red-600">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Create CTA */}
        <button type="submit" className={CTA_CLASS} disabled={loading || !yritysNimi.trim()}>
          {loading ? t('creating') : t('createCta')}
        </button>
      </form>
    </div>
  )
}
