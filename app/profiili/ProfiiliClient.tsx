'use client'

import { useState, useEffect } from 'react'
import { User } from 'lucide-react'
import Link from 'next/link'
import AuthModal from '@/app/components/AuthModal'
import { createBrowserSupabase, subscribeToAuthUser } from '@/lib/supabaseSSR'
import { lajiKonfig } from '@/lib/lajit'

type AuthState = 'loading' | 'unauthenticated' | 'authenticated'

export default function ProfiiliClient() {
  const [authState, setAuthState] = useState<AuthState>('loading')
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [kotikaupunki, setKotikaupunki] = useState<string>('')
  const [userId, setUserId] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string>('')
  const [saved, setSaved] = useState(false)
  const [kiinnostukset, setKiinnostukset] = useState<string[]>([])
  const [savedKiinnostukset, setSavedKiinnostukset] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveKiinnostuksetError, setSaveKiinnostuksetError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createBrowserSupabase()

    async function loadProfile(uid: string) {
      const { data } = await supabase
        .from('profiles')
        .select('kotikaupunki, kiinnostukset')
        .eq('user_id', uid)
        .single()
      // PGRST116 (no row) is expected for new users — treat as empty string / empty array
      setKotikaupunki(data?.kotikaupunki ?? '')
      setKiinnostukset(data?.kiinnostukset ?? [])
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
        setKiinnostukset([])
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
      setSaveError(null)
      setTimeout(() => setSaved(false), 2500)
    } else {
      setSaveError('Tallennus epäonnistui. Yritä uudelleen.')
    }
  }

  function toggleKiinnostus(key: string) {
    setKiinnostukset(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  async function handleSaveKiinnostukset() {
    if (!userId) return
    const supabase = createBrowserSupabase()
    const { error } = await supabase
      .from('profiles')
      .upsert(
        { user_id: userId, kiinnostukset, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      )
    if (!error) {
      setSavedKiinnostukset(true)
      setSaveKiinnostuksetError(null)
      setTimeout(() => setSavedKiinnostukset(false), 2500)
    } else {
      setSaveKiinnostuksetError('Tallennus epäonnistui. Yritä uudelleen.')
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
        {saveError && <p className="text-sm text-red-600">{saveError}</p>}
      </div>
      <div className="glass rounded-2xl p-4 flex flex-col gap-3 mt-4">
        <label className="text-[10px] font-bold text-[#111111] uppercase tracking-widest">
          Kiinnostuksen kohteet
        </label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(lajiKonfig).map(([key, konfig]) => (
            <button
              key={key}
              type="button"
              onClick={() => toggleKiinnostus(key)}
              className={
                kiinnostukset.includes(key)
                  ? 'bg-[#111111] text-white font-bold text-[10px] rounded-full px-3 py-1.5 [transition:background-color_150ms_var(--ease-out)]'
                  : 'border border-[rgba(0,0,0,0.12)] text-[#111111] font-bold text-[10px] rounded-full px-3 py-1.5 bg-white [transition:background-color_150ms_var(--ease-out)]'
              }
            >
              {konfig.label}
            </button>
          ))}
        </div>
        <button
          onClick={handleSaveKiinnostukset}
          className="bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm px-5 py-2 rounded-full self-start [transition:background-color_150ms_var(--ease-out)]"
        >
          Tallenna
        </button>
        {savedKiinnostukset && <p className="text-sm text-green-700">Kiinnostukset tallennettu</p>}
        {saveKiinnostuksetError && <p className="text-sm text-red-600">{saveKiinnostuksetError}</p>}
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
