'use client'

import { useId } from 'react'
import { SPORT_ICONS } from '@/lib/sportIcons'

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
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#1e40af" />
          </linearGradient>
        </defs>
        {/* Teardrop body — blue gradient */}
        <path d={PIN_PATH} fill={`url(#${gradId})`} />
        {/* White circle — cx=14 cy=14 r=10 matches original */}
        <circle cx="14" cy="14" r="10" fill="white" />
        {/* Icon — fills white circle fully; cx=14 cy=14 r=10 → usable area x=4..24 y=4..24 */}
        <image
          href={SPORT_ICONS[laji.toLowerCase()] ?? SPORT_ICONS['fallback']}
          x="4"
          y="4"
          width="20"
          height="20"
        />
      </svg>

      {/* Arc sweep — conic-gradient ring that orbits the white circle edge */}
      <div
        className="pin-arc"
        style={{ animationDelay: `${(animDelay ?? 0) * 4}s` }}
      />
    </div>
  )
}
