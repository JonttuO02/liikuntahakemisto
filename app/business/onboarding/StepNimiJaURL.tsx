'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'

interface StepNimiJaURLProps {
  paikkaInfo: { nimi: string } | null
  paikkaId: number | null
  onNext: (websiteUrl: string | null) => void
}

const inputClass =
  'border border-[rgba(0,0,0,0.12)] rounded-lg h-10 px-3 text-sm text-[#111111] placeholder:text-[rgba(17,17,17,0.35)] bg-white focus:outline-none focus:border-[rgba(0,0,0,0.25)] disabled:opacity-60 w-full [transition:border-color_150ms_var(--ease-out)]'

export default function StepNimiJaURL({ paikkaInfo, paikkaId, onNext }: StepNimiJaURLProps) {
  const t = useTranslations('Business')
  const [websiteUrl, setWebsiteUrl] = useState('')

  return (
    <div className="glass rounded-2xl p-6 w-full max-w-xl mx-auto">
      <div className="flex flex-col gap-6">
        <h2 className="text-xl font-bold text-[#111111]">{t('stepNimiJaURLHeading')}</h2>

        {/* Venue name block (read-only) */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[rgba(17,17,17,0.45)]">
            {t('selectedVenueLabel')}
          </span>

          {paikkaInfo === null ? (
            <div className="flex items-center justify-center py-4">
              <div className="w-6 h-6 rounded-full border-2 border-[rgba(17,17,17,0.12)] border-t-[#111111] animate-spin" />
            </div>
          ) : (
            <span className="text-sm font-bold text-[#111111]">{paikkaInfo.nimi}</span>
          )}
        </div>

        {/* Website URL input */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[rgba(17,17,17,0.45)]">
            {t('stepNimiJaURLWebsiteLabel')}
          </span>
          <input
            type="url"
            placeholder={t('stepNimiJaURLWebsitePlaceholder')}
            value={websiteUrl}
            onChange={e => setWebsiteUrl(e.target.value)}
            disabled={paikkaId === null}
            className={inputClass}
          />
          <p className="text-sm text-[rgba(17,17,17,0.45)]">
            {t('stepNimiJaURLWebsiteHint')}
          </p>
        </div>

        {/* Footer */}
        <footer className="flex justify-between items-center pt-4 border-t border-[rgba(0,0,0,0.07)]">
          {/* No back button — first pre-phase */}
          <div />

          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={() => onNext(websiteUrl.trim() || null)}
            disabled={paikkaId === null}
            className="bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm rounded-full h-10 px-6 [transition:background-color_150ms_var(--ease-out)] disabled:opacity-60 disabled:pointer-events-none"
          >
            {t('nextCta')}
          </motion.button>
        </footer>
      </div>
    </div>
  )
}
