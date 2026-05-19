'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

const ACTIVE   = 'text-indigo-600'
const INACTIVE = 'text-gray-400'

/* ── Icons ──────────────────────────────────────────────────────── */

function HomeIcon({ active }: { active: boolean }) {
  return active ? (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
    </svg>
  ) : (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )
}

function MapIcon({ active }: { active: boolean }) {
  return active ? (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
    </svg>
  ) : (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function ListIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor"
      strokeWidth={active ? 2.2 : 1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  )
}

function HeartIcon({ active }: { active: boolean }) {
  return active ? (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  ) : (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  )
}

/* ── Component ──────────────────────────────────────────────────── */

export default function BottomNav() {
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const nakyma = searchParams.get('nakyma')

  const isKoti     = pathname === '/' && !nakyma
  const isKartta   = pathname === '/' && nakyma === 'kartta'
  const isLista    = pathname === '/' && nakyma === 'lista'
  const isSuosikit = pathname === '/suosikit'

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 shadow-lg">
      <div className="grid grid-cols-4 h-16">

        <Link
          href="/"
          className={`flex flex-col items-center justify-center gap-1 [transition:color_150ms_var(--ease-out)] ${isKoti ? ACTIVE : INACTIVE}`}
        >
          <HomeIcon active={isKoti} />
          <span className="text-[10px] font-semibold">Koti</span>
        </Link>

        <Link
          href="/?nakyma=kartta"
          className={`flex flex-col items-center justify-center gap-1 [transition:color_150ms_var(--ease-out)] ${isKartta ? ACTIVE : INACTIVE}`}
        >
          <MapIcon active={isKartta} />
          <span className="text-[10px] font-semibold">Kartta</span>
        </Link>

        <Link
          href="/?nakyma=lista"
          className={`flex flex-col items-center justify-center gap-1 [transition:color_150ms_var(--ease-out)] ${isLista ? ACTIVE : INACTIVE}`}
        >
          <ListIcon active={isLista} />
          <span className="text-[10px] font-semibold">Lista</span>
        </Link>

        <Link
          href="/suosikit"
          className={`flex flex-col items-center justify-center gap-1 [transition:color_150ms_var(--ease-out)] ${isSuosikit ? ACTIVE : INACTIVE}`}
        >
          <HeartIcon active={isSuosikit} />
          <span className="text-[10px] font-semibold">Suosikit</span>
        </Link>

      </div>
    </nav>
  )
}
