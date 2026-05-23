'use client'

import { useState } from 'react'
import { Heart } from 'lucide-react'
import Link from 'next/link'
import AuthModal from '@/app/components/AuthModal'

interface SuosikitClientProps {
  userEmail: string | null
}

export default function SuosikitClient({ userEmail }: SuosikitClientProps) {
  const [authModalOpen, setAuthModalOpen] = useState(false)

  if (!userEmail) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 pb-16">
        <div className="glass w-16 h-16 rounded-2xl flex items-center justify-center mb-5">
          <Heart className="w-7 h-7 text-[rgba(17,17,17,0.35)]" />
        </div>
        <h1 className="font-serif text-2xl font-bold text-[#111111] mb-2 text-center">
          Suosikit vaativat kirjautumisen
        </h1>
        <p className="text-[rgba(17,17,17,0.45)] text-center mb-8 max-w-xs text-sm">
          Tallenna liikuntapaikkoja suosikeiksi ja löydä ne helposti uudelleen.
        </p>
        <button
          onClick={() => setAuthModalOpen(true)}
          className="bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm px-6 py-2.5 rounded-full [transition:background-color_150ms_var(--ease-out)]"
        >
          Kirjaudu sisään
        </button>
        <Link
          href="/"
          className="mt-4 text-sm text-[rgba(17,17,17,0.45)] hover:text-[#111111] [transition:color_150ms_var(--ease-out)] underline underline-offset-2"
        >
          Takaisin hakemistoon
        </Link>
        <AuthModal
          open={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 pb-16">
      <div className="glass w-16 h-16 rounded-2xl flex items-center justify-center mb-5">
        <Heart className="w-7 h-7 text-[rgba(17,17,17,0.35)]" />
      </div>
      <h1 className="font-serif text-2xl font-bold text-[#111111] mb-2 text-center">
        Suosikit
      </h1>
      <p className="text-[rgba(17,17,17,0.45)] text-center mb-8 max-w-xs text-sm">
        Et ole vielä tallentanut suosikkeja. Selaa hakemistoa ja lisää sydämellä.
      </p>
      <Link
        href="/"
        className="bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm px-6 py-2.5 rounded-full [transition:background-color_150ms_var(--ease-out)]"
      >
        Selaa hakemistoa
      </Link>
    </div>
  )
}
