'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { createBusinessBrowserClient } from '@/lib/supabase-business'
import SijaintiPicker from './SijaintiPicker'

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
  const [createOsoite, setCreateOsoite] = useState('')
  const [createKaupunki, setCreateKaupunki] = useState('')
  const [createLat, setCreateLat] = useState<number | null>(null)
  const [createLng, setCreateLng] = useState<number | null>(null)

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
    if (!createOsoite.trim()) {
      setError(t('errorAddressRequired'))
      return
    }
    if (createLat === null || createLng === null) {
      setError(t('sijaintiPakollinen'))
      return
    }
    if (!createKaupunki.trim()) {
      setError(t('sijaintiVirhe'))
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
          osoite: createOsoite.trim(),
          kaupunki: createKaupunki.trim(),
          latitude: createLat,
          longitude: createLng,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        router.push(`/business/onboarding${data.paikka_id ? `?paikka_id=${data.paikka_id}` : ''}`)
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

        <h3 className="text-sm font-bold text-[#111111]">
          {t('sijaintiLabel')}
        </h3>

        <SijaintiPicker
          onChange={({ lat, lng, address, city }) => {
            setCreateLat(lat)
            setCreateLng(lng)
            setCreateOsoite(address)
            setCreateKaupunki(city)
          }}
        />

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
        <button type="submit" className={CTA_CLASS} disabled={loading || createLat === null}>
          {loading ? t('creating') : t('createCta')}
        </button>
      </form>
    </div>
  )
}
