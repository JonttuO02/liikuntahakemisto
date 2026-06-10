'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import type { Liikuntapaikka } from '@/lib/types'
import PaikkaKortti from '@/app/components/PaikkaKortti'
import DiagonaalKortti from '@/app/components/DiagonaalKortti'
import PaikkaSheet from '@/app/components/PaikkaSheet'

interface PreviewModalProps {
  paikka: Liikuntapaikka
  onClose: () => void
}

export default function PreviewModal({ paikka, onClose }: PreviewModalProps) {
  const t = useTranslations('Business')

  return (
    <AnimatePresence>
      <motion.div
        key="preview-modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 bg-black/50 overflow-y-auto"
        onClick={onClose}
      >
        <div className="min-h-full flex items-start justify-center py-8 px-4">
          <div
            className="glass rounded-2xl p-6 w-full max-w-xl mx-auto flex flex-col gap-6"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-[#111111]">{t('previewCta')}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label={t('previewClose')}
                className="text-sm text-[rgba(17,17,17,0.45)] hover:text-[#111111] transition-colors"
              >
                ×
              </button>
            </div>

            {/* Section: PaikkaKortti */}
            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[rgba(17,17,17,0.45)]">
                {t('previewLabelCard')}
              </p>
              <PaikkaKortti paikka={paikka} />
            </div>

            {/* Section: DiagonaalKortti */}
            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[rgba(17,17,17,0.45)]">
                {t('previewLabelDiag')}
              </p>
              <DiagonaalKortti paikka={paikka} />
            </div>

            {/* Section: PaikkaSheet */}
            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[rgba(17,17,17,0.45)]">
                {t('previewLabelSheet')}
              </p>
              <PaikkaSheet
                paikka={paikka}
                preview={true}
                todo={false}
                onClose={() => {}}
                onToggleTodo={() => {}}
              />
            </div>

            {/* Bottom close button */}
            <button
              type="button"
              onClick={onClose}
              className="border border-[rgba(0,0,0,0.12)] hover:border-[rgba(0,0,0,0.25)] rounded-full h-10 px-6 text-sm font-bold text-[#111111] w-full transition-colors"
            >
              {t('previewClose')}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
