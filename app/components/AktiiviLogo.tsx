'use client'

import { useRef, useEffect } from 'react'
import { animate } from 'framer-motion'

export default function AktiiviLogo() {
  const rectRef = useRef<SVGRectElement>(null)

  useEffect(() => {
    const rect = rectRef.current
    if (!rect) return

    let cancelled = false
    let currentControls: ReturnType<typeof animate> | null = null

    function wait(ms: number): Promise<void> {
      return new Promise((resolve) => {
        const id = setTimeout(() => {
          if (!cancelled) resolve()
        }, ms)
        // Store timeout id for potential cancellation — cleared by cancelled flag
        void id
      })
    }

    async function runLoop() {
      while (!cancelled) {
        // Step (a): reset rect width to 0 — letters hidden
        rect!.setAttribute('width', '0')

        // Step (b): sweep reveal 0 → 1672 over 0.6s
        if (cancelled) break
        currentControls = animate(rect!, { width: 1672 }, { duration: 0.6, ease: 'easeInOut' })
        await currentControls

        if (cancelled) break

        // Step (c): letters visible for 1s
        await wait(1000)

        if (cancelled) break

        // Step (d): collapse 1672 → 0 over 0.4s
        currentControls = animate(rect!, { width: 0 }, { duration: 0.4, ease: 'easeInOut' })
        await currentControls

        if (cancelled) break

        // Step (e): pause 3s before repeat
        await wait(3000)
      }
    }

    runLoop()

    return () => {
      cancelled = true
      if (currentControls) currentControls.cancel()
    }
  }, [])

  // Letter paths (A, K, T, I, I, V, I) — strokeWidth 33
  const letterPaths = [
    'M285 506 L370 356 L456 506',
    'M531 356 L531 506',
    'M663 356 L575 431 L663 506',
    'M711 356 L866 356 M788 356 L788 506',
    'M945 356 L945 506',
    'M1042 356 L1042 506',
    'M1124 356 L1201 506 L1277 356',
    'M1351 356 L1351 506',
  ]

  return (
    <svg
      viewBox="100 200 1480 580"
      role="img"
      aria-label="AKTIIVI"
      style={{ height: 32, width: 'auto' }}
      preserveAspectRatio="xMidYMid meet"
    >
      <title>AKTIIVI</title>

      <defs>
        {/* Blue gradient — sporty sky-to-ocean sweep */}
        <linearGradient
          id="grad-blue"
          gradientUnits="userSpaceOnUse"
          x1="155"
          y1="430"
          x2="1517"
          y2="430"
        >
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>

        {/* Sweep clip — rect width animated 0→1672 to reveal letters */}
        <clipPath id="sweep-clip">
          <rect
            ref={rectRef}
            x="0"
            y="0"
            width="0"
            height="940"
          />
        </clipPath>
      </defs>

      {/* Decorative paths: arc + wave — always #111111 */}
      <path
        d="M215 332 C 320 248 545 235 836 235 C 1127 235 1352 248 1457 332"
        fill="none"
        stroke="#111111"
        strokeWidth={37}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M155 490 L531.4 703.5 Q601 743 665.2 695.2 L784.7 606.2 Q836 568 887.3 606.2 L1006.8 695.2 Q1071 743 1140.6 703.5 L1517 490"
        fill="none"
        stroke="#111111"
        strokeWidth={37}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Letter paths — blue gradient, revealed by sweep clip */}
      <g clipPath="url(#sweep-clip)">
        {letterPaths.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke="url(#grad-blue)"
            strokeWidth={33}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </g>
    </svg>
  )
}
