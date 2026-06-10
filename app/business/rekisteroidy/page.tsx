'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { createBrowserSupabase } from '@/lib/supabaseSSR'
import { useTranslations } from 'next-intl'
import AuthModal from '@/app/components/AuthModal'

function mapBusinessError(
  message: string
): 'errorEmailInUse' | 'errorWeakPassword' | 'errorGeneric' {
  if (
    message.includes('User already registered') ||
    message.includes('already been registered') ||
    message.includes('already exists')
  ) {
    return 'errorEmailInUse'
  }
  if (
    (message.includes('Password should be at least') || message.includes('password')) &&
    message.includes('6')
  ) {
    return 'errorWeakPassword'
  }
  return 'errorGeneric'
}

export default function BusinessRekisteroidyPage() {
  const t = useTranslations('Business')
  const router = useRouter()

  const [companyName, setCompanyName] = useState('')
  const [roleInCompany, setRoleInCompany] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authModalOpen, setAuthModalOpen] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    setError(null)
    setLoading(true)

    try {
      const supabase = createBrowserSupabase()

      // Step 1: Create auth user
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
      if (signUpError) {
        setError(t(mapBusinessError(signUpError.message)))
        setLoading(false)
        return
      }

      // Guard: if email confirmation is required, session won't be available immediately.
      // The registration flow requires an immediate session to call the Route Handler —
      // disable "Confirm email" in Supabase Auth settings for this flow to work.
      if (!data.session) {
        setError(t('errorCheckEmail'))
        setLoading(false)
        return
      }

      // Step 2: Create business_accounts row via Route Handler (JWT-verified)
      const response = await fetch('/api/business/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + data.session.access_token,
        },
        body: JSON.stringify({ company_name: companyName.trim(), role_in_company: roleInCompany }),
      })

      if (!response.ok) {
        setError(t('errorAccountCreationFailed'))
        setLoading(false)
        return
      }

      // Success: navigate to business dashboard
      // Do NOT call setLoading(false) here — navigation will unmount the component
      router.push('/business')
    } catch {
      setError(t('errorGeneric'))
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
          <h1 className="text-xl font-bold text-[#111111]">{t('registerTitle')}</h1>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="text"
              placeholder={t('companyNamePlaceholder')}
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              required
              disabled={loading}
              className={inputClass}
            />
            <select
              value={roleInCompany}
              onChange={e => setRoleInCompany(e.target.value)}
              required
              disabled={loading}
              className={inputClass + ' cursor-pointer'}
            >
              <option value="" disabled>{t('roleInCompanyLabel')}</option>
              <option value="Omistaja">{t('roleOwner')}</option>
              <option value="Johtaja">{t('roleManager')}</option>
              <option value="Markkinointi">{t('roleMarketing')}</option>
              <option value="Muu">{t('roleOther')}</option>
            </select>
            <input
              type="email"
              autoComplete="email"
              placeholder={t('emailPlaceholder')}
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              disabled={loading}
              className={inputClass}
            />
            <input
              type="password"
              autoComplete="new-password"
              placeholder={t('passwordPlaceholder')}
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
              {loading ? t('registering') : t('registerCta')}
            </button>
          </form>

          <p className="text-sm text-[rgba(17,17,17,0.45)] text-center">
            {t('alreadyHaveAccount')}{' '}
            <button
              type="button"
              className="font-bold text-[#111111] hover:underline"
              onClick={() => setAuthModalOpen(true)}
            >
              {t('signInLink')}
            </button>
          </p>
        </div>
      </motion.div>

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  )
}
