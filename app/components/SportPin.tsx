'use client'

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

export default function SportPin({ laji, animDelay }: SportPinProps) {
  return (
    <div style={{ position: 'relative', width: 32, height: 32, cursor: 'pointer' }}>
      {/* A: Pin body — white circle with blue border */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: 'white',
          border: '2.5px solid #0284c7',
          boxShadow: '0 2px 8px rgba(2,132,199,0.28)',
        }}
      />

      {/* B: Sport icon SVG — uses currentColor for Phase 24 override compatibility */}
      <div
        style={{
          position: 'absolute',
          top: 6,
          left: 6,
          width: 20,
          height: 20,
          color: '#0284c7',
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          // dangerouslySetInnerHTML is safe: SPORT_ICONS is a compile-time constant, not user input
          dangerouslySetInnerHTML={{
            __html: SPORT_ICONS[laji.toLowerCase()] ?? SPORT_ICONS['fallback'],
          }}
        />
      </div>

      {/* C: Orbit wrapper — zero-size, centered, rotates to carry glint dot around edge */}
      <div
        className="pin-orbit-wrapper"
        style={{ animationDelay: `${(animDelay ?? 0) * 4}s` }}
      >
        <div className="pin-glint" />
      </div>
    </div>
  )
}
