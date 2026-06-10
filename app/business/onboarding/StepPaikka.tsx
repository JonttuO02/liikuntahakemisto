'use client'

import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'

interface StepPaikkaProps {
  paikkaInfo: {
    nimi: string
    osoite: string | null
    kaupunki: string | null
  } | null
  paikkaId: number | null
  onNext: () => void
}

export default function StepPaikka({ paikkaInfo, paikkaId, onNext }: StepPaikkaProps) {
  const t = useTranslations('Business')

  return (
    <div className="glass rounded-2xl p-6 w-full max-w-xl mx-auto">
      <div className="flex flex-col gap-6">
        <h2 className="text-xl font-bold text-[#111111]">{t('stepPlaceName')}</h2>

        {/* Venue info */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[rgba(17,17,17,0.45)]">
            {t('selectedVenueLabel')}
          </span>

          {paikkaInfo === null ? (
            <div className="flex items-center justify-center py-4">
              <div className="w-6 h-6 rounded-full border-2 border-[rgba(17,17,17,0.12)] border-t-[#111111] animate-spin" />
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <span className="text-sm font-bold text-[#111111]">{paikkaInfo.nimi}</span>
              {(paikkaInfo.osoite || paikkaInfo.kaupunki) && (
                <span className="text-sm text-[rgba(17,17,17,0.45)]">
                  {[paikkaInfo.osoite, paikkaInfo.kaupunki].filter(Boolean).join(', ')}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="flex justify-between items-center pt-4 border-t border-[rgba(0,0,0,0.07)]">
          {/* No back button on step 1 */}
          <div />

          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={onNext}
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
