'use client'

import Link from 'next/link'

export default function NavBar() {
  return (
    <header className="sticky top-0 z-40 bg-[#4F46E5] shadow-sm">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-white font-bold text-lg tracking-tight"
        >
          <svg className="w-5 h-5 text-indigo-200 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>Liikuntahakemisto</span>
        </Link>

        <Link
          href="/"
          aria-label="Haku"
          className="text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 [transition:color_150ms_var(--ease-out),background-color_150ms_var(--ease-out)]"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </Link>
      </div>
    </header>
  )
}
