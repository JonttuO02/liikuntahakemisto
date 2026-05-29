'use client'

import { useRef, useEffect, useState } from 'react'
import { animate } from 'framer-motion'

const GRADIENTS = [
  { name: 'Fire',     start: '#FF7B00', end: '#E63946' },
  { name: 'Ocean',    start: '#00B4D8', end: '#0077B6' },
  { name: 'Neon',     start: '#C9F400', end: '#00D68F' },
  { name: 'Sunset',   start: '#FF6CA8', end: '#BE2ED6' },
  { name: 'Electric', start: '#7B2FFF', end: '#0055FF' },
]

interface AktiiviLogoProps {
  gradientIndex: number // 0–4, selects from GRADIENTS array
}

export default function AktiiviLogo({ gradientIndex }: AktiiviLogoProps) {
  const currIndex = Math.abs(gradientIndex) % 5
  const prevIndexRef = useRef<number>(currIndex)
  const [prevIndex, setPrevIndex] = useState<number>(currIndex)
  const rectRef = useRef<SVGRectElement>(null)

  useEffect(() => {
    if (currIndex === prevIndex) return

    const rect = rectRef.current
    if (!rect) return

    // Reset rect width to 0 immediately (no animation)
    rect.setAttribute('width', '0')

    // Animate rect width 0 → 1672 to reveal the new gradient
    // animate(element, keyframes, options) — Framer Motion imperative API
    const controls = animate(rect, { width: 1672 }, { duration: 0.55, ease: 'easeInOut' })

    // On completion: update prevIndex (swaps grad-prev colors) and reset clip rect
    controls.then(() => {
      prevIndexRef.current = currIndex
      setPrevIndex(currIndex)
      rect.setAttribute('width', '0')
    })

    return () => controls.cancel()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currIndex])

  const prev = GRADIENTS[prevIndex]
  const curr = GRADIENTS[currIndex]

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
      viewBox="0 0 1672 940"
      role="img"
      aria-label="AKTIIVI"
      style={{ height: 28, width: 'auto' }}
      preserveAspectRatio="xMidYMid meet"
    >
      <title>AKTIIVI</title>

      <defs>
        {/* Previous gradient — always full width, shown below */}
        <linearGradient
          id="grad-prev"
          gradientUnits="userSpaceOnUse"
          x1="155"
          y1="430"
          x2="1517"
          y2="430"
        >
          <stop offset="0%" stopColor={prev.start} />
          <stop offset="100%" stopColor={prev.end} />
        </linearGradient>

        {/* Current gradient — revealed by sweep clip animation */}
        <linearGradient
          id="grad-curr"
          gradientUnits="userSpaceOnUse"
          x1="155"
          y1="430"
          x2="1517"
          y2="430"
        >
          <stop offset="0%" stopColor={curr.start} />
          <stop offset="100%" stopColor={curr.end} />
        </linearGradient>

        {/* Sweep clip — rect width animated 0→1672 on gradient change */}
        <clipPath id="sweep-clip">
          <rect
            ref={rectRef}
            x="0"
            y="0"
            width={currIndex === prevIndex ? 1672 : 0}
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

      {/* Letter paths — Layer 1 (below): prev gradient, full width */}
      {letterPaths.map((d, i) => (
        <path
          key={`prev-${i}`}
          d={d}
          fill="none"
          stroke="url(#grad-prev)"
          strokeWidth={33}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}

      {/* Letter paths — Layer 2 (above): curr gradient, clipped by sweep */}
      <g clipPath="url(#sweep-clip)">
        {letterPaths.map((d, i) => (
          <path
            key={`curr-${i}`}
            d={d}
            fill="none"
            stroke="url(#grad-curr)"
            strokeWidth={33}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </g>
    </svg>
  )
}
