'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { createBusinessBrowserClient } from '@/lib/supabase-business'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

export default function BusinessKirjauduClient() {
  const t = useTranslations('Business')
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    setError(null)
    setLoading(true)

    try {
      const supabase = createBusinessBrowserClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        setError(t('errorInvalidCredentials'))
        setLoading(false)
        return
      }
      // Success: navigate to business dashboard
      // Do NOT call setLoading(false) here -- navigation will unmount the component
      router.push('/business')
    } catch {
      setError(t('errorInvalidCredentials'))
      setLoading(false)
    }
  }

  const inputClass =
    'border border-[rgba(0,0,0,0.12)] rounded-lg h-10 px-3 text-sm text-[#111111] placeholder:text-[rgba(17,17,17,0.35)] bg-white focus:outline-none focus:border-[rgba(0,0,0,0.25)] disabled:opacity-60 w-full'

  const submitButtonClass =
    'bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm rounded-full h-10 w-full [transition:background-color_150ms_var(--ease-out)] disabled:opacity-60 disabled:pointer-events-none'

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-16">
      <motion.div
        className="relative glass rounded-2xl p-6 w-full max-w-sm"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div className="flex flex-col gap-4">
          <h1 className="text-xl font-bold text-[#111111]">
            {t('loginTitle')}
          </h1>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              autoComplete="email"
              placeholder={t('loginEmailPlaceholder')}
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              disabled={loading}
              className={inputClass}
            />
            <input
              type="password"
              autoComplete="current-password"
              placeholder={t('loginPasswordPlaceholder')}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              disabled={loading}
              className={inputClass}
            />

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
                  aria-live="polite"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className={submitButtonClass}
            >
              {loading ? t('loggingIn') : t('loginCta')}
            </button>
          </form>

          <Link
            href="/business/rekisteroidy"
            className="font-bold text-[#111111] hover:underline"
          >
            {t('noAccountLink')}
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
