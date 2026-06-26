'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createBusinessBrowserClient } from '@/lib/supabase-business'
import { useTranslations } from 'next-intl'
import SijaintiPicker from '@/app/components/SijaintiPicker'

interface StepSijaintiProps {
  paikkaId: number
  onNext: () => void
  onPrev: () => void
}

export default function StepSijainti({ paikkaId, onNext, onPrev }: StepSijaintiProps) {
  const t = useTranslations('Business')

  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [osoite, setOsoite] = useState('')
  const [kaupunki, setKaupunki] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleNext() {
    if (loading) return
    setLoading(true)
    setError(null)

    try {
      const supabase = createBusinessBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        setError(t('errorGeneric'))
        return
      }

      const res = await fetch('/api/business/update-paikka', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          paikka_id: paikkaId,
          section: 'sijainti',
          data: { osoite, kaupunki, latitude: lat, longitude: lng },
        }),
      })

      if (!res.ok) {
        setError(t('errorGeneric'))
        return
      }

      onNext()
    } catch {
      setError(t('errorGeneric'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass rounded-2xl p-6 w-full max-w-xl mx-auto">
      <div className="flex flex-col gap-6">
        <h2 className="text-xl font-bold text-[#111111]">{t('stepSijaintiHeading')}</h2>

        <SijaintiPicker
          onChange={({ lat: newLat, lng: newLng, address, city }) => {
            setLat(newLat)
            setLng(newLng)
            setOsoite(address)
            setKaupunki(city)
          }}
        />

        {/* Error block */}
        <AnimatePresence>
          {error && (
            <motion.p
              key="sijainti-error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              role="alert"
              aria-live="polite"
              className="text-sm text-red-600"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Footer */}
        <footer className="flex justify-between items-center pt-4 border-t border-[rgba(0,0,0,0.07)] mt-6">
          <button
            type="button"
            onClick={onPrev}
            disabled={loading}
            className="text-sm text-[rgba(17,17,17,0.45)] hover:text-[#111111] [transition:color_150ms_var(--ease-out)] flex items-center gap-1 disabled:opacity-60"
          >
            {t('prevCta')}
          </button>

          <motion.button
            type="button"
            onClick={handleNext}
            disabled={loading || lat === null}
            whileTap={{ scale: 0.95 }}
            className="bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm rounded-full h-10 px-6 [transition:background-color_150ms_var(--ease-out)] disabled:opacity-60 disabled:pointer-events-none"
          >
            {loading ? (
              <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block" />
            ) : (
              t('nextCta')
            )}
          </motion.button>
        </footer>
      </div>
    </div>
  )
}
