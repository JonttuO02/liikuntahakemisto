'use client'

import { useId } from 'react'

// Icon paths sourced from lucide-react v1.16.0 (ISC license)
// SVG path strings migrated from lib/sportPins.ts with stroke="#374151" replaced
// by stroke="currentColor" for Phase 24 CSS color override compatibility (D-10).

const g = (content: string) =>
  `<g stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">${content}</g>`

const SPORT_ICONS: Record<string, string> = {
  padel: g(`<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>`),
  kuntosali: g(`<path d="M17.596 12.768a2 2 0 1 0 2.829-2.829l-1.768-1.767a2 2 0 0 0 2.828-2.829l-2.828-2.828a2 2 0 0 0-2.829 2.828l-1.767-1.768a2 2 0 1 0-2.829 2.829z"/><path d="M5.343 21.485a2 2 0 1 0 2.829-2.828l1.767 1.768a2 2 0 1 0 2.829-2.829l-6.364-6.364a2 2 0 1 0-2.829 2.829l1.768 1.767a2 2 0 0 0-2.828 2.829z"/><path d="m9.6 14.4 4.8-4.8"/>`),
  jooga: g(`<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>`),
  uinti: g(`<path d="M2 12q2.5 2 5 0t5 0 5 0 5 0"/><path d="M2 19q2.5 2 5 0t5 0 5 0 5 0"/><path d="M2 5q2.5 2 5 0t5 0 5 0 5 0"/>`),
  tennis: g(`<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>`),
  liikuntahalli: g(`<path d="M10 12h4"/><path d="M10 8h4"/><path d="M14 21v-3a2 2 0 0 0-4 0v3"/><path d="M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2"/><path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/>`),
  liikunta: g(`<path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/>`),
  fallback: g(`<circle cx="12" cy="12" r="4"/>`),
}

interface SportPinProps {
  laji: string
  animDelay?: number // 0–1, used as animation-delay multiplier; default 0
}

// Teardrop path — same geometry as original sportPins.ts (28×38 viewBox)
const PIN_PATH = 'M14 0C6.268 0 0 6.268 0 14c0 5.25 2.875 9.83 7.125 12.3L14 38l6.875-11.7C25.125 23.83 28 19.25 28 14 28 6.268 21.732 0 14 0Z'

export default function SportPin({ laji, animDelay }: SportPinProps) {
  // Unique gradient ID per instance — prevents cross-SVG url(#id) conflicts in HTML doc
  const gradId = useId().replace(/:/g, '-')

  return (
    <div style={{ position: 'relative', width: 28, height: 38, cursor: 'pointer' }}>
      <svg viewBox="0 0 28 38" width="28" height="38" style={{ display: 'block' }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#dbeafe" />
            <stop offset="100%" stopColor="#1e40af" />
          </linearGradient>
        </defs>
        {/* Teardrop body — blue gradient */}
        <path d={PIN_PATH} fill={`url(#${gradId})`} />
        {/* White circle — cx=14 cy=14 r=10 matches original */}
        <circle cx="14" cy="14" r="10" fill="white" />
        {/* Icon — translate to (5,5), scale 24→18 (×0.75); currentColor = #0284c7 */}
        {/* dangerouslySetInnerHTML is safe: SPORT_ICONS is a compile-time constant */}
        <g
          transform="translate(5,5) scale(0.75)"
          style={{ color: '#1e3a8a' }}
          dangerouslySetInnerHTML={{
            __html: SPORT_ICONS[laji.toLowerCase()] ?? SPORT_ICONS['fallback'],
          }}
        />
      </svg>

      {/* Orbit wrapper — zero-size, at white circle center (14,14), rotates glint around edge */}
      <div
        className="pin-orbit-wrapper"
        style={{ top: 14, left: 14, animationDelay: `${(animDelay ?? 0) * 4}s` }}
      >
        <div className="pin-glint" />
      </div>
    </div>
  )
}
