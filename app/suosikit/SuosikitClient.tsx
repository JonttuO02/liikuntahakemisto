'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bookmark, BookmarkCheck } from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import DiagonaalKortti from '@/app/components/DiagonaalKortti'
import AuthModal from '@/app/components/AuthModal'
import { createBrowserSupabase, subscribeToAuthUser } from '@/lib/supabaseSSR'
import type { Liikuntapaikka } from '@/lib/types'

type AuthState = 'loading' | 'unauthenticated' | 'authenticated'
type SuosikkiRow = { liikuntapaikat: Liikuntapaikka | null }

export default function SuosikitClient() {
  const router = useRouter()
  const [authState, setAuthState] = useState<AuthState>('loading')
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [paikat, setPaikat] = useState<Liikuntapaikka[]>([])
  const [favLoading, setFavLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const supabase = createBrowserSupabase()

    async function loadFavorites(uid: string) {
      if (cancelled) return
      setFavLoading(true)
      const { data, error } = await supabase
        .from('suosikit')
        .select('paikka_id, liikuntapaikat(*)')
        .eq('user_id', uid)
      if (cancelled) return
      if (!error && data) {
        const rows = data as unknown as SuosikkiRow[]
        const places = rows
          .map(row => row.liikuntapaikat)
          .filter((p): p is Liikuntapaikka => p !== null)
        setPaikat(places)
      }
      setFavLoading(false)
    }

    const unsub = subscribeToAuthUser((user) => {
      if (user) {
        setAuthState('authenticated')
        setUserId(user.id)
        loadFavorites(user.id)
      } else {
        setAuthState('unauthenticated')
        setUserId(null)
        setPaikat([])
      }
    })

    return () => { cancelled = true; unsub() }
  }, [])

  async function removeTodo(paikkaId: number) {
    if (!userId) return
    const removed = paikat.find(p => p.id === paikkaId)
    setPaikat(prev => prev.filter(p => p.id !== paikkaId))

    const supabase = createBrowserSupabase()
    const { error } = await supabase
      .from('suosikit')
      .delete()
      .eq('user_id', userId)
      .eq('paikka_id', paikkaId)

    if (error) {
      console.error('[SuosikitClient] delete error:', error)
      if (removed) setPaikat(prev => prev.find(p => p.id === paikkaId) ? prev : [...prev, removed])
    }
  }

  // Still loading session from cookies
  if (authState === 'loading') {
    return <div className="min-h-screen bg-white" />
  }

  if (authState === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 pb-16">
        <div className="glass w-16 h-16 rounded-2xl flex items-center justify-center mb-5">
          <Bookmark className="w-7 h-7 text-[rgba(17,17,17,0.35)]" />
        </div>
        <h1 className="font-serif text-2xl font-bold text-[#111111] mb-2 text-center">
          TO DO -lista vaatii kirjautumisen
        </h1>
        <p className="text-[rgba(17,17,17,0.45)] text-center mb-8 max-w-xs text-sm">
          Tallenna liikuntapaikkoja TO DO -listalle ja löydä ne helposti uudelleen.
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

  // Authenticated state — loading favorites
  if (favLoading) {
    return <div className="min-h-screen bg-white" />
  }

  if (paikat.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 pb-16">
        <div className="glass w-16 h-16 rounded-2xl flex items-center justify-center mb-5">
          <Bookmark className="w-7 h-7 text-[rgba(17,17,17,0.35)]" />
        </div>
        <h1 className="font-serif text-2xl font-bold text-[#111111] mb-2 text-center">
          Ei vielä TO DO -paikkoja
        </h1>
        <p className="text-[rgba(17,17,17,0.45)] text-center mb-8 max-w-xs text-sm">
          Selaa hakemistoa ja lisää kirjanmerkillä.
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
        TO DO -lista
      </h1>
      <ul className="flex flex-col gap-3">
        {paikat.map(p => (
          <li key={p.id} className="flex flex-row items-start gap-2">
            <div className="flex-1 min-w-0">
              <DiagonaalKortti
                paikka={p}
                onShowMap={(place) => router.push('/?id=' + place.id)}
              />
            </div>
            <motion.button
              whileTap={{ scale: 0.85, transition: { duration: 0.12, ease: 'easeOut' } }}
              onClick={() => removeTodo(p.id)}
              className="glass-btn w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-2"
              aria-label="Poista TO DO -listalta"
            >
              <BookmarkCheck className="w-4 h-4 fill-[#111111] text-[#111111]" />
            </motion.button>
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
