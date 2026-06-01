'use client'

import { useRef, useEffect } from 'react'
import { animate } from 'framer-motion'

const FEATHER = 150
const WINDOW  = 460
const SPAN    = FEATHER + WINDOW + FEATHER  // 760

export default function AktiiviLogo() {
  const gradRef = useRef<SVGLinearGradientElement>(null)

  useEffect(() => {
    const grad = gradRef.current as SVGLinearGradientElement
    if (!gradRef.current) return

    let cancelled = false
    let anim: ReturnType<typeof animate> | null = null

    function wait(ms: number): Promise<void> {
      return new Promise(resolve => {
        setTimeout(() => { if (!cancelled) resolve() }, ms)
      })
    }

    async function runLoop() {
      while (!cancelled) {
        grad.setAttribute('gradientTransform', `translate(${-SPAN}, 0)`)
        if (cancelled) break

        anim = animate(-SPAN, 1672, {
          duration: 2.6,
          ease: 'easeInOut',
          onUpdate: (v) => {
            if (!cancelled) grad.setAttribute('gradientTransform', `translate(${v}, 0)`)
          },
        })
        await anim

        if (cancelled) break
        await wait(2000)
      }
    }

    runLoop()
    return () => { cancelled = true; anim?.cancel() }
  }, [])

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

  const lineProps = {
    fill: 'none',
    strokeWidth: 33,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  return (
    // viewBox trimmed to actual content bounds (removes empty padding)
    <svg
      viewBox="120 215 1440 555"
      role="img"
      aria-label="AKTIIVI"
      style={{ width: '100%', height: 'auto', display: 'block' }}
      preserveAspectRatio="xMidYMid meet"
    >
      <title>AKTIIVI</title>

      <defs>
        {/* Blue spotlight gradient */}
        <linearGradient id="aktv-grad-blue" gradientUnits="userSpaceOnUse" x1="285" y1="430" x2="1351" y2="430">
          <stop offset="0%"   stopColor="#38bdf8" />
          <stop offset="45%"  stopColor="#2563eb" />
          <stop offset="100%" stopColor="#1e40af" />
        </linearGradient>

        {/* Sliding window gradient — black pad extends outside, white = show blue */}
        <linearGradient
          ref={gradRef}
          id="aktv-window-grad"
          gradientUnits="userSpaceOnUse"
          x1="0" y1="0" x2={SPAN} y2="0"
          gradientTransform={`translate(${-SPAN}, 0)`}
        >
          <stop offset="0%"                                              stopColor="black" />
          <stop offset={`${(FEATHER / SPAN * 100).toFixed(1)}%`}        stopColor="white" />
          <stop offset={`${((FEATHER + WINDOW) / SPAN * 100).toFixed(1)}%`} stopColor="white" />
          <stop offset="100%"                                            stopColor="black" />
        </linearGradient>

        <mask id="aktv-window-mask">
          <rect x="-800" y="0" width="4000" height="940" fill="url(#aktv-window-grad)" />
        </mask>
      </defs>

      {/* Decorative arc + wave — always visible in gray */}
      <path d="M215 332 C 320 248 545 235 836 235 C 1127 235 1352 248 1457 332"
        fill="none" stroke="rgba(17,17,17,0.3)" strokeWidth={37} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M155 490 L531.4 703.5 Q601 743 665.2 695.2 L784.7 606.2 Q836 568 887.3 606.2 L1006.8 695.2 Q1071 743 1140.6 703.5 L1517 490"
        fill="none" stroke="rgba(17,17,17,0.3)" strokeWidth={37} strokeLinecap="round" strokeLinejoin="round" />

      {/* Gray base layer — always visible */}
      <g>
        {letterPaths.map((d, i) => (
          <path key={i} d={d} stroke="rgba(17,17,17,0.3)" {...lineProps} />
        ))}
      </g>

      {/* Blue overlay — only where the window passes */}
      <g mask="url(#aktv-window-mask)">
        {letterPaths.map((d, i) => (
          <path key={i} d={d} stroke="url(#aktv-grad-blue)" {...lineProps} />
        ))}
      </g>
    </svg>
  )
}
