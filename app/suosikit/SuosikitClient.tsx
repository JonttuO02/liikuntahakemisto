'use client'

import { useState, useEffect } from 'react'
import { Heart } from 'lucide-react'
import Link from 'next/link'
import AuthModal from '@/app/components/AuthModal'
import { createBrowserSupabase, subscribeToAuthUser } from '@/lib/supabaseSSR'
import type { Liikuntapaikka } from '@/lib/types'

type AuthState = 'loading' | 'unauthenticated' | 'authenticated'
type SuosikkiRow = { liikuntapaikat: Liikuntapaikka | null }

export default function SuosikitClient() {
  const [authState, setAuthState] = useState<AuthState>('loading')
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [paikat, setPaikat] = useState<Liikuntapaikka[]>([])
  const [favLoading, setFavLoading] = useState(false)

  useEffect(() => {
    const supabase = createBrowserSupabase()

    async function loadFavorites(userId: string) {
      setFavLoading(true)
      const { data, error } = await supabase
        .from('suosikit')
        .select('paikka_id, liikuntapaikat(*)')
        .eq('user_id', userId)
      if (!error && data) {
        const rows = data as SuosikkiRow[]
        const places = rows
          .map(row => row.liikuntapaikat)
          .filter((p): p is Liikuntapaikka => p !== null)
        setPaikat(places)
      }
      setFavLoading(false)
    }

    return subscribeToAuthUser((user) => {
      if (user) {
        setAuthState('authenticated')
        loadFavorites(user.id)
      } else {
        setAuthState('unauthenticated')
        setPaikat([])
      }
    })
  }, [])

  // Still loading session from cookies
  if (authState === 'loading') {
    return <div className="min-h-screen bg-white" />
  }

  if (authState === 'unauthenticated') {
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

  // Authenticated state — show favorites list
  if (favLoading) {
    return <div className="min-h-screen bg-white" />
  }

  if (paikat.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 pb-16">
        <div className="glass w-16 h-16 rounded-2xl flex items-center justify-center mb-5">
          <Heart className="w-7 h-7 text-[rgba(17,17,17,0.35)]" />
        </div>
        <h1 className="font-serif text-2xl font-bold text-[#111111] mb-2 text-center">
          Ei vielä suosikkeja
        </h1>
        <p className="text-[rgba(17,17,17,0.45)] text-center mb-8 max-w-xs text-sm">
          Selaa hakemistoa ja lisää sydämellä.
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

  return (
    <div className="min-h-screen bg-white px-4 py-8 max-w-2xl mx-auto">
      <h1 className="font-serif text-2xl font-bold text-[#111111] mb-6">
        Suosikit
      </h1>
      <ul className="flex flex-col gap-3">
        {paikat.map(p => (
          <li key={p.id} className="glass rounded-2xl p-4 flex flex-col gap-1">
            <Link
              href={`/paikat/${p.id}`}
              className="font-bold text-sm text-[#111111] hover:underline"
            >
              {p.nimi}
            </Link>
            {p.osoite && (
              <p className="text-sm text-[rgba(17,17,17,0.45)]">{p.osoite}{p.kaupunki ? `, ${p.kaupunki}` : ''}</p>
            )}
          </li>
        ))}
      </ul>
      <Link
        href="/"
        className="mt-8 inline-block text-sm text-[rgba(17,17,17,0.45)] hover:text-[#111111] [transition:color_150ms_var(--ease-out)] underline underline-offset-2"
      >
        Takaisin hakemistoon
      </Link>
    </div>
  )
}
