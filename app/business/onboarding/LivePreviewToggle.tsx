'use client'

/**
 * LivePreviewToggle.tsx — the mobile Muokkaa/Esikatselu segmented control.
 *
 * Below the `lg:` split-view breakpoint (Plan 03), this control switches the wizard's
 * content area between the form (edit) and the live preview (CalloutCard/DiagonaalKortti
 * stack rendered by LivePreviewPane). Pure presentation — holds no view-state of its own;
 * the parent owns `activeView` and resets it to 'edit' on every step/tab change (D-08).
 *
 * Exact JSX contract: 51-UI-SPEC.md lines 127-149.
 */

import { motion } from 'framer-motion'
import { Pencil, Eye } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface LivePreviewToggleProps {
  activeView: 'edit' | 'preview'
  onChange: (view: 'edit' | 'preview') => void
}

export default function LivePreviewToggle({ activeView, onChange }: LivePreviewToggleProps) {
  const t = useTranslations('Business')

  return (
    <div className="glass rounded-full p-1 flex w-full max-w-xl mx-auto mb-4">
      <motion.button
        type="button"
        whileTap={{ scale: 0.95 }}
        onClick={() => onChange('edit')}
        className={`flex-1 h-9 rounded-full text-sm font-bold flex items-center justify-center gap-1.5 [transition:background-color_150ms_var(--ease-out),color_150ms_var(--ease-out)] ${
          activeView === 'edit' ? 'bg-[#111111] text-white' : 'text-[rgba(17,17,17,0.45)]'
        }`}
      >
        <Pencil className="w-3.5 h-3.5" />
        {t('previewToggleEdit')}
      </motion.button>
      <motion.button
        type="button"
        whileTap={{ scale: 0.95 }}
        onClick={() => onChange('preview')}
        className={`flex-1 h-9 rounded-full text-sm font-bold flex items-center justify-center gap-1.5 [transition:background-color_150ms_var(--ease-out),color_150ms_var(--ease-out)] ${
          activeView === 'preview' ? 'bg-[#111111] text-white' : 'text-[rgba(17,17,17,0.45)]'
        }`}
      >
        <Eye className="w-3.5 h-3.5" />
        {t('previewToggleLive')}
      </motion.button>
    </div>
  )
}
