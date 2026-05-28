'use client'

import { useState, useEffect } from 'react'
import { User } from 'lucide-react'
import Link from 'next/link'
import AuthModal from '@/app/components/AuthModal'
import { createBrowserSupabase, subscribeToAuthUser } from '@/lib/supabaseSSR'

type AuthState = 'loading' | 'unauthenticated' | 'authenticated'

export default function ProfiiliClient() {
  const [authState, setAuthState] = useState<AuthState>('loading')
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [kotikaupunki, setKotikaupunki] = useState<string>('')
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string>('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const supabase = createBrowserSupabase()

    async function loadProfile(uid: string) {
      const { data } = await supabase
        .from('profiles')
        .select('kotikaupunki')
        .eq('user_id', uid)
        .single()
      // PGRST116 (no row) is expected for new users — treat as empty string
      setKotikaupunki(data?.kotikaupunki ?? '')
    }

    return subscribeToAuthUser((user) => {
      if (user) {
        setAuthState('authenticated')
        setUserId(user.id)
        setUserEmail(user.email ?? '')
        loadProfile(user.id)
      } else {
        setAuthState('unauthenticated')
        setUserId(null)
        setKotikaupunki('')
      }
    })
  }, [])

  async function handleSave() {
    if (!userId) return
    const supabase = createBrowserSupabase()
    const trimmed = kotikaupunki.trim()
    const { error } = await supabase
      .from('profiles')
      .upsert(
        { user_id: userId, kotikaupunki: trimmed, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
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
          <User className="w-7 h-7 text-[rgba(17,17,17,0.35)]" />
        </div>
        <h1 className="font-serif text-2xl font-bold text-[#111111] mb-2 text-center">
          Profiili vaatii kirjautumisen
        </h1>
        <p className="text-[rgba(17,17,17,0.45)] text-center mb-8 max-w-xs text-sm">
          Kirjaudu sisään nähdäksesi ja muokataksesi profiiliasi.
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

  // Authenticated state — show profile form
  return (
    <div className="min-h-screen bg-white px-4 py-8 max-w-2xl mx-auto">
      <h1 className="font-serif text-2xl font-bold text-[#111111] mb-2">Profiili</h1>
      <p className="text-sm text-[rgba(17,17,17,0.45)] mb-6">{userEmail}</p>
      <div className="glass rounded-2xl p-4 flex flex-col gap-3">
        <label className="text-[10px] font-bold text-[#111111] uppercase tracking-widest">
          Kotipaikkakunta
        </label>
        <input
          type="text"
          value={kotikaupunki}
          onChange={e => setKotikaupunki(e.target.value)}
          placeholder="esim. Tampere"
          className="border border-[rgba(0,0,0,0.12)] rounded-xl px-3 py-2 text-sm text-[#111111] bg-white focus:outline-none focus:border-[rgba(0,0,0,0.3)]"
        />
        <button
          onClick={handleSave}
          className="bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm px-5 py-2 rounded-full self-start [transition:background-color_150ms_var(--ease-out)]"
        >
          Tallenna
        </button>
        {saved && <p className="text-sm text-green-700">Kotikaupunki tallennettu</p>}
      </div>
      <Link
        href="/"
        className="mt-8 inline-block text-sm text-[rgba(17,17,17,0.45)] hover:text-[#111111] [transition:color_150ms_var(--ease-out)] underline underline-offset-2"
      >
        Takaisin hakemistoon
      </Link>
    </div>
  )
}
