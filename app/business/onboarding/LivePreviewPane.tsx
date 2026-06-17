'use client'

/**
 * LivePreviewPane.tsx — the stacked CalloutCard/DiagonaalKortti preview column.
 *
 * Pure presentation: reads `useLivePreview()` (Phase 51 Plan 01's shared context) and
 * renders the two-card stack used both as the desktop split-view sidebar (Plan 03) and
 * the mobile preview-side content (Plan 03/04). Holds no data state of its own.
 *
 * Mirrors StepEsikatselu.tsx's existing two-card stack exactly (latitude/longitude `?? 0`
 * shim included), minus the third profile-preview section (LIVEPREV-04 explicitly
 * excludes it) and minus the 8-second timeout/error branch (live preview has placeholder
 * data and no network call — per 51-UI-SPEC.md's Error-state row).
 */

import { useTranslations } from 'next-intl'
import { useLivePreview } from '@/lib/livePreview/LivePreviewContext'
import CalloutCard from '@/app/components/CalloutCard'
import DiagonaalKortti from '@/app/components/DiagonaalKortti'

export default function LivePreviewPane() {
  const { livePreviewPaikka, brandColor, accentColor } = useLivePreview()
  const t = useTranslations('Business')

  if (!livePreviewPaikka) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-6 h-6 rounded-full border-2 border-[rgba(17,17,17,0.12)] border-t-[#111111] animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[rgba(17,17,17,0.45)]">
          {t('previewLabelCallout')}
        </span>
        <CalloutCard
          p={{
            ...livePreviewPaikka,
            latitude: livePreviewPaikka.latitude ?? 0,
            longitude: livePreviewPaikka.longitude ?? 0,
          }}
          brandColor={brandColor}
          accentColor={accentColor}
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[rgba(17,17,17,0.45)]">
          {t('previewLabelDiag')}
        </span>
        <DiagonaalKortti paikka={livePreviewPaikka} brandColor={brandColor} accentColor={accentColor} />
      </div>
    </div>
  )
}
