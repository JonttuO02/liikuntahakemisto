'use client'

/**
 * LivePreviewContext.tsx — shared live-preview state for the business wizard.
 *
 * The first React Context + reducer in app/lib (per Phase 51's D-discretion note:
 * "React Context + reducer scoped to the wizard tree is sufficient at this scale").
 *
 * Accumulates in-progress field values (hinnasto, aukioloajat, yhteystiedot, media_urls)
 * dispatched by step/tab components and derives a Liikuntapaikka-shaped preview object
 * plus brandColor/accentColor — by calling the existing buildDraftAsPaikka/buildBrandingPreview
 * builders unchanged. No Supabase calls, no network calls, no useEffect data-fetching —
 * purely synchronous derivation from props + dispatched state (LIVEPREV-04).
 */

import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react'
import { buildDraftAsPaikka, type OnboardingDraft, type PaikkaBase } from '@/lib/onboardingUtils'
import { type BrandingResult, buildBrandingPreview } from '@/lib/branding/brandingResult'
import type { Liikuntapaikka } from '@/lib/types'

// ─── State shape ──────────────────────────────────────────────────────────────

/**
 * PreviewDraft — reducer state shape. MUST mirror buildDraftAsPaikka's `draft`
 * input: media_urls/hinnasto/aukioloajat/yhteystiedot use the same field types
 * as OnboardingDraft, plus the required paikka_id.
 */
export type PreviewDraft = {
  paikka_id: number
  media_urls?: { logo: string | null; photos: string[] } | null
  hinnasto?: Array<{ kategoria: string; hinta: string; lisatieto?: string }> | null
  aukioloajat?: Record<string, { open: string; close: string }> | null
  yhteystiedot?: {
    puhelin?: string
    email?: string
    website?: string
    kuvaus?: string
  } | null
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export type LivePreviewAction =
  | { type: 'SET_HINNASTO'; payload: Array<{ kategoria: string; hinta: string; lisatieto?: string }> }
  | { type: 'SET_AUKIOLOAJAT'; payload: Record<string, { open: string; close: string }> }
  | { type: 'SET_YHTEYSTIEDOT'; payload: Partial<{ puhelin: string; email: string; website: string; kuvaus: string }> }
  | { type: 'SET_MEDIA'; payload: { logo?: string | null; photos?: string[] } }
  | { type: 'RESET'; payload: PreviewDraft }

function livePreviewReducer(state: PreviewDraft, action: LivePreviewAction): PreviewDraft {
  switch (action.type) {
    case 'SET_HINNASTO':
      return { ...state, hinnasto: action.payload }
    case 'SET_AUKIOLOAJAT':
      return { ...state, aukioloajat: action.payload }
    case 'SET_YHTEYSTIEDOT':
      return {
        ...state,
        yhteystiedot: { ...(state.yhteystiedot ?? {}), ...action.payload },
      }
    case 'SET_MEDIA':
      return {
        ...state,
        media_urls: {
          logo:
            action.payload.logo !== undefined
              ? action.payload.logo
              : state.media_urls?.logo ?? null,
          photos:
            action.payload.photos !== undefined
              ? action.payload.photos
              : state.media_urls?.photos ?? [],
        },
      }
    case 'RESET':
      return action.payload
    default:
      return state
  }
}

function buildInitialState(
  paikkaId: number | null,
  initialDraft?: Partial<OnboardingDraft> | null,
): PreviewDraft {
  return {
    paikka_id: paikkaId ?? initialDraft?.paikka_id ?? 0,
    media_urls: initialDraft?.media_urls ?? null,
    hinnasto: initialDraft?.hinnasto ?? null,
    aukioloajat: initialDraft?.aukioloajat ?? null,
    yhteystiedot: initialDraft?.yhteystiedot ?? null,
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

type LivePreviewContextValue = {
  livePreviewPaikka: Liikuntapaikka | null
  brandColor: string | undefined
  accentColor: string | undefined
  dispatch: Dispatch<LivePreviewAction>
}

const LivePreviewContext = createContext<LivePreviewContextValue | null>(null)

// ─── Provider ─────────────────────────────────────────────────────────────────

interface LivePreviewProviderProps {
  paikkaInfo: PaikkaBase | null
  paikkaId: number | null
  brandingData?: BrandingResult | null
  initialDraft?: Partial<OnboardingDraft> | null
  children: ReactNode
}

export function LivePreviewProvider({
  paikkaInfo,
  paikkaId,
  brandingData,
  initialDraft,
  children,
}: LivePreviewProviderProps) {
  const [state, dispatch] = useReducer(
    livePreviewReducer,
    buildInitialState(paikkaId, initialDraft),
  )

  // Derive livePreviewPaikka — replicate StepEsikatselu's draftAsPaikka derivation
  // exactly: brandingData path when present + paikka_id is numeric, else
  // buildDraftAsPaikka, else null.
  const livePreviewPaikka = useMemo<Liikuntapaikka | null>(() => {
    if (brandingData && paikkaInfo && typeof state.paikka_id === 'number') {
      return buildBrandingPreview(paikkaInfo, brandingData, state.paikka_id, state.media_urls?.logo)
    }
    if (paikkaInfo) {
      return buildDraftAsPaikka(state as OnboardingDraft, paikkaInfo)
    }
    return null
  }, [state, paikkaInfo, brandingData])

  // brandColor/accentColor — same sourcing as StepEsikatselu lines 51-61.
  const brandColor =
    brandingData?.selected_background_color ??
    brandingData?.colors?.find(c => c.role === 'background')?.hex ??
    undefined

  const accentColor =
    brandingData?.selected_accent_color ??
    brandingData?.colors?.find(c => c.role === 'accent')?.hex ??
    undefined

  const value = useMemo<LivePreviewContextValue>(
    () => ({ livePreviewPaikka, brandColor, accentColor, dispatch }),
    [livePreviewPaikka, brandColor, accentColor, dispatch],
  )

  return (
    <LivePreviewContext.Provider value={value}>
      {children}
    </LivePreviewContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useLivePreview(): LivePreviewContextValue {
  const ctx = useContext(LivePreviewContext)
  if (!ctx) {
    throw new Error('useLivePreview must be used within LivePreviewProvider')
  }
  return ctx
}
