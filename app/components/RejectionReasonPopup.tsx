'use client'

import { useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface RejectionReasonPopupProps {
  open: boolean
  onClose: () => void
  rejectionReason: string | null
  editHref: string
}

/**
 * RejectionReasonPopup — lightweight dialog (D-06) shown from the dashboard's
 * rejection-info icon button. Mirrors AuthModal.tsx's dialog pattern exactly
 * (backdrop + panel + close button, same durations/easing). Displays the
 * admin-authored rejection_reason as plain, escaped JSX text only — no raw-HTML
 * injection of any kind (T-63-04A) — and offers a single CTA that navigates
 * (never fetches — T-63-04B) to the edit/onboarding flow. Dismissing via
 * backdrop click, Escape, or the close button only closes the popup; it never
 * navigates or triggers a side effect.
 */
export default function RejectionReasonPopup({ open, onClose, rejectionReason, editHref }: RejectionReasonPopupProps) {
  const t = useTranslations('Business')

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  // Escape key handler — mirrors AuthModal's keydown-listener pattern, without
  // AuthModal's `!loading` guard since this popup has no async state.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, handleClose])

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center"
          aria-modal="true"
          role="dialog"
          aria-label={t('dashboardStatusRejectedTitle')}
        >
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className="absolute inset-0 bg-[rgba(0,0,0,0.40)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            className="relative glass rounded-2xl p-6 w-full max-w-sm mx-4"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {/* Close button */}
            <button
              onClick={handleClose}
              aria-label={t('previewClose')}
              className="glass-btn w-7 h-7 rounded-full flex items-center justify-center absolute top-4 right-4 text-[rgba(17,17,17,0.55)] hover:text-[#111111] [transition:color_150ms_var(--ease-out)]"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="flex flex-col gap-3 pr-4">
              <h2 className="text-xl font-bold text-[#111111]">{t('dashboardStatusRejectedTitle')}</h2>
              <p className="text-sm text-[rgba(17,17,17,0.6)]">
                {rejectionReason ? t('dashboardStatusRejectedBody', { reason: rejectionReason }) : t('dashboardStatusRejectedBodyNoReason')}
              </p>
              <a
                href={editHref}
                className="mt-2 bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm rounded-full h-10 px-6 flex items-center justify-center w-fit [transition:background-color_150ms_var(--ease-out)]"
              >
                {t('fixDetailsCta')}
              </a>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
