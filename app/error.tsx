'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-indigo-50 flex flex-col items-center justify-center px-4 pb-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
        className="text-center max-w-sm"
      >
        <p className="text-5xl mb-4 select-none">⚠️</p>
        <h1 className="text-2xl font-bold text-indigo-950 mb-2">Jotain meni pieleen.</h1>
        <p className="text-gray-500 mb-8">Yritä uudelleen tai palaa etusivulle.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="bg-[#6366F1] hover:bg-indigo-600 text-white font-semibold px-6 py-2.5 rounded-full [transition:background-color_150ms_var(--ease-out)]"
          >
            Yritä uudelleen
          </button>
          <Link
            href="/"
            className="border border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-medium px-6 py-2.5 rounded-full [transition:background-color_150ms_var(--ease-out)]"
          >
            Palaa etusivulle
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
