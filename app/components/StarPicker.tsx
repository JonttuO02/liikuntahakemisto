'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

const STARS = [1, 2, 3, 4, 5] as const

export default function StarPicker({
  value,
  onChange,
}: {
  value: number
  onChange: (n: number) => void
}) {
  const [hovered, setHovered] = useState(0)
  const display = hovered || value

  return (
    <div
      className="flex gap-1"
      role="group"
      aria-label="Tähtiarvosana"
      onMouseLeave={() => setHovered(0)}
    >
      {STARS.map((n) => (
        <motion.button
          key={n}
          type="button"
          aria-label={`${n} tähteä`}
          whileTap={{ scale: 0.95, transition: { duration: 0.12, ease: 'easeOut' } }}
          onMouseEnter={() => setHovered(n)}
          onFocus={() => setHovered(n)}
          onClick={() => onChange(n)}
          className="text-2xl leading-none focus:outline-none"
        >
          <span className={n <= display ? 'text-amber-400' : 'text-[rgba(17,17,17,0.2)]'}>
            ★
          </span>
        </motion.button>
      ))}
    </div>
  )
}
