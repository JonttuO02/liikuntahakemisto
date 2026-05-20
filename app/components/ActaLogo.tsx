'use client'

import { motion } from 'framer-motion'

const EASE: [number, number, number, number] = [0.4, 0, 0.2, 1]
const DUR = 1.2

// ViewBox 280×60
// <  : tip x=8,  open x=36  (left side)
// >  : open x=244, tip x=272 (right side)
// ACTA: centered at x=140 between the chevrons

export default function ActaLogo() {
  return (
    <svg
      viewBox="0 0 280 60"
      role="img"
      aria-label="ACTA"
      style={{ height: 34, width: 'auto' }}
    >
      <title>ACTA</title>

      {/* < — starts with 20px gap (translateX +94), 1s delay, slides left */}
      <motion.g
        initial={{ x: 94 }}
        animate={{ x: 0 }}
        transition={{ duration: DUR, delay: 0.5, ease: EASE }}
      >
        <polyline
          points="36,6 8,30 36,54"
          fill="none"
          stroke="#111111"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </motion.g>

      {/* > — starts with 20px gap (translateX -94), 1s delay, slides right */}
      <motion.g
        initial={{ x: -94 }}
        animate={{ x: 0 }}
        transition={{ duration: DUR, delay: 0.5, ease: EASE }}
      >
        <polyline
          points="244,6 272,30 244,54"
          fill="none"
          stroke="#111111"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </motion.g>

      {/* ACTA — fades in 0.55s after chevrons start moving */}
      <motion.text
        x="140"
        y="44"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="40"
        fontWeight="400"
        letterSpacing="6"
        fill="#111111"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.65, delay: 1.05, ease: EASE }}
      >
        ACTA
      </motion.text>
    </svg>
  )
}
