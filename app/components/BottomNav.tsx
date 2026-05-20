'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Home, List, Heart } from 'lucide-react'

const ACTIVE   = 'text-[#111111]'
const INACTIVE = 'text-[rgba(17,17,17,0.4)]'

export default function BottomNav() {
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const nakyma = searchParams.get('nakyma')

  const isKoti     = pathname === '/' && !nakyma
  const isLista    = pathname === '/' && nakyma === 'lista'
  const isSuosikit = pathname === '/suosikit'

  return (
    <nav className="glass-nav sm:hidden fixed bottom-0 left-0 right-0 z-50">
      <div className="grid grid-cols-3 h-16">

        <Link
          href="/"
          className={`flex flex-col items-center justify-center gap-1 [transition:color_150ms_var(--ease-out)] ${isKoti ? ACTIVE : INACTIVE}`}
        >
          <Home className="w-5 h-5" strokeWidth={isKoti ? 2.2 : 1.8} />
          <span className="text-[10px] font-semibold">Koti</span>
        </Link>

        <Link
          href="/?nakyma=lista"
          className={`flex flex-col items-center justify-center gap-1 [transition:color_150ms_var(--ease-out)] ${isLista ? ACTIVE : INACTIVE}`}
        >
          <List className="w-5 h-5" strokeWidth={isLista ? 2.2 : 1.8} />
          <span className="text-[10px] font-semibold">Lista</span>
        </Link>

        <Link
          href="/suosikit"
          className={`flex flex-col items-center justify-center gap-1 [transition:color_150ms_var(--ease-out)] ${isSuosikit ? ACTIVE : INACTIVE}`}
        >
          <Heart className="w-5 h-5" strokeWidth={isSuosikit ? 2.2 : 1.8} fill={isSuosikit ? 'currentColor' : 'none'} />
          <span className="text-[10px] font-semibold">Suosikit</span>
        </Link>

      </div>
    </nav>
  )
}
