'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabase } from '@/lib/supabaseSSR'

interface AuthModalProps {
  open: boolean
  onClose: () => void
  pendingPaikkaId?: number | null
  onSuccess?: (paikkaId: number | null) => void
}

type Mode = 'signin' | 'signup'

function mapError(message: string): string {
  if (message.includes('Invalid login credentials') || message.includes('invalid_credentials')) {
    return 'Virheellinen sähköposti tai salasana.'
  }
  if (message.includes('User already registered') || message.includes('already been registered') || message.includes('already exists')) {
    return 'Sähköpostiosoite on jo käytössä.'
  }
  if (message.includes('Password should be at least') || message.includes('password') && message.includes('6')) {
    return 'Salasanan on oltava vähintään 6 merkkiä.'
  }
  return 'Jokin meni pieleen. Yritä uudelleen.'
}

export default function AuthModal({ open, onClose, pendingPaikkaId, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Reset form when modal opens/closes or mode changes
  useEffect(() => {
    if (!open) {
      setEmail('')
      setPassword('')
      setError(null)
      setLoading(false)
      setMode('signin')
    }
  }, [open])

  useEffect(() => {
    setError(null)
  }, [mode])

  const handleClose = useCallback(() => {
    if (!loading) onClose()
  }, [loading, onClose])

  // Escape key handler
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, handleClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    setError(null)
    setLoading(true)

    const supabase = createBrowserSupabase()

    try {
      if (mode === 'signin') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password })
        if (err) {
          setError(mapError(err.message))
          return
        }
      } else {
        const { data, error: err } = await supabase.auth.signUp({ email, password })
        if (err) {
          setError(mapError(err.message))
          return
        }
        if (!data.session) {
          // Email confirmation required — show info message instead of calling onSuccess
          setError('Tarkista sähköpostisi ja vahvista tili.')
          return
        }
      }

      // Success
      onSuccess?.(pendingPaikkaId ?? null)
      onClose()
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleOAuth() {
    if (loading) return
    setError(null)
    const supabase = createBrowserSupabase()
    // Note: Google OAuth requires the following manual setup:
    // 1. Add {SUPABASE_PROJECT_URL}/auth/v1/callback to Google Cloud Console as an authorized redirect URI
    // 2. Add the app's origin to Supabase Auth → URL Configuration → Redirect URLs
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) setError('Google-kirjautuminen epäonnistui. Yritä uudelleen.')
  }

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center"
          aria-modal="true"
          role="dialog"
          aria-label={mode === 'signin' ? 'Kirjaudu sisään' : 'Luo tili'}
        >
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className="absolute inset-0 bg-[rgba(0,0,0,0.40)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            className="relative glass rounded-2xl p-6 w-full max-w-sm mx-4 mb-0 sm:mb-0"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {/* Close button */}
            <button
              onClick={handleClose}
              disabled={loading}
              aria-label="Sulje"
              className="glass-btn w-7 h-7 rounded-full flex items-center justify-center absolute top-4 right-4 text-[rgba(17,17,17,0.55)] hover:text-[#111111] [transition:color_150ms_var(--ease-out)]"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="flex flex-col gap-4">
              {/* Heading */}
              <h2 className="text-xl font-bold text-[#111111] pr-8">
                {mode === 'signin' ? 'Kirjaudu sisään' : 'Luo tili'}
              </h2>

              {/* Google OAuth */}
              <button
                type="button"
                onClick={handleGoogleOAuth}
                disabled={loading}
                className="glass-btn rounded-full px-4 h-10 w-full flex items-center justify-center gap-3 text-sm font-bold text-[#111111] disabled:opacity-60 disabled:pointer-events-none"
              >
                {/* Google G SVG */}
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4" />
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853" />
                  <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05" />
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335" />
                </svg>
                Jatka Googlella
              </button>

              {/* Separator */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-[rgba(0,0,0,0.07)]" />
                <span className="text-[10px] font-bold text-[rgba(17,17,17,0.35)] uppercase tracking-widest">TAI</span>
                <div className="flex-1 h-px bg-[rgba(0,0,0,0.07)]" />
              </div>

              {/* Form fields with mode toggle animation */}
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={mode}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex flex-col gap-3"
                  >
                    <input
                      type="email"
                      autoComplete="email"
                      placeholder="Sähköpostiosoite"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      disabled={loading}
                      className="border border-[rgba(0,0,0,0.12)] rounded-lg h-10 px-3 text-sm text-[#111111] placeholder:text-[rgba(17,17,17,0.35)] bg-white focus:outline-none focus:border-[rgba(0,0,0,0.25)] disabled:opacity-60 w-full"
                    />
                    <input
                      type="password"
                      autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                      placeholder="Salasana"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      className="border border-[rgba(0,0,0,0.12)] rounded-lg h-10 px-3 text-sm text-[#111111] placeholder:text-[rgba(17,17,17,0.35)] bg-white focus:outline-none focus:border-[rgba(0,0,0,0.25)] disabled:opacity-60 w-full"
                    />
                  </motion.div>
                </AnimatePresence>

                {/* Error display */}
                <AnimatePresence>
                  {error && (
                    <motion.p
                      key="error"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="text-sm text-red-600"
                      role="alert"
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm rounded-full h-10 w-full [transition:background-color_150ms_var(--ease-out)] disabled:opacity-60 disabled:pointer-events-none"
                >
                  {loading
                    ? mode === 'signin' ? 'Kirjaudutaan...' : 'Luodaan tiliä...'
                    : mode === 'signin' ? 'Kirjaudu' : 'Luo tili'
                  }
                </button>
              </form>

              {/* Mode toggle */}
              <p className="text-sm text-[rgba(17,17,17,0.45)] text-center">
                {mode === 'signin' ? (
                  <>
                    Ei tiliä?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('signup')}
                      className="font-bold text-[#111111] hover:underline"
                    >
                      Luo tili
                    </button>
                  </>
                ) : (
                  <>
                    Onko sinulla jo tili?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('signin')}
                      className="font-bold text-[#111111] hover:underline"
                    >
                      Kirjaudu
                    </button>
                  </>
                )}
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
