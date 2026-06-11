'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { createBusinessBrowserClient } from '@/lib/supabase-business'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

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

  // Recovery mode: user already has a valid auth session (from a previous
  // signUp) but no business_accounts row (registration was interrupted
  // before the /api/business/register fetch completed). In this case we
  // show the form without email/password fields and skip signUp entirely.
  const [isRecovery, setIsRecovery] = useState(false)
  const [recoveryChecked, setRecoveryChecked] = useState(false)

  useEffect(() => {
    async function detectRecovery() {
      const supabase = createBusinessBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setRecoveryChecked(true)
        return
      }
      // User is authenticated -- check whether their business_accounts row exists
      const { data: account } = await supabase
        .from('business_accounts')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle()
      if (account) {
        // Registration already completed -- redirect to dashboard
        router.replace('/business')
        return
      }
      // Auth user exists but no business_accounts row: partial failure recovery mode
      setIsRecovery(true)
      setRecoveryChecked(true)
    }
    detectRecovery()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    setError(null)
    setLoading(true)

    try {
      const supabase = createBusinessBrowserClient()
      let accessToken: string

      if (isRecovery) {
        // Recovery path: user already has a valid session -- skip signUp and
        // use the existing session token to call /api/business/register.
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setError(t('errorGeneric'))
          setLoading(false)
          return
        }
        accessToken = session.access_token
      } else {
        // Normal path: Step 1 -- Create auth user
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
        if (signUpError) {
          setError(t(mapBusinessError(signUpError.message)))
          setLoading(false)
          return
        }

        // Guard: if email confirmation is required, session won't be available immediately.
        // The registration flow requires an immediate session to call the Route Handler --
        // disable "Confirm email" in Supabase Auth settings for this flow to work.
        if (!data.session) {
          setError(t('errorCheckEmail'))
          setLoading(false)
          return
        }
        accessToken = data.session.access_token
      }

      // Step 2 (both paths): Create business_accounts row via Route Handler (JWT-verified)
      const response = await fetch('/api/business/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + accessToken,
        },
        body: JSON.stringify({ company_name: companyName.trim(), role_in_company: roleInCompany }),
      })

      if (!response.ok) {
        setError(t('errorAccountCreationFailed'))
        setLoading(false)
        return
      }

      // Success: navigate to business dashboard
      // Do NOT call setLoading(false) here -- navigation will unmount the component
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

  // Show spinner while checking for recovery state on mount
  if (!recoveryChecked) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-[rgba(17,17,17,0.12)] border-t-[#111111] animate-spin" />
      </div>
    )
  }

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
            {isRecovery ? t('completeRegistrationTitle') : t('registerTitle')}
          </h1>

          {isRecovery && (
            <p className="text-sm text-[rgba(17,17,17,0.45)]">
              {t('completeRegistrationHint')}
            </p>
          )}

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

            {/* Email and password only shown in normal (non-recovery) registration */}
            {!isRecovery && (
              <>
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
              </>
            )}

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
              {loading ? t('registering') : (isRecovery ? t('completeRegistrationCta') : t('registerCta'))}
            </button>
          </form>

          {!isRecovery && (
            <p className="text-sm text-[rgba(17,17,17,0.45)] text-center">
              {t('alreadyHaveAccount')}{' '}
              <Link href="/business/kirjaudu" className="font-bold text-[#111111] hover:underline">
                {t('signInLink')}
              </Link>
            </p>
          )}
        </div>
      </motion.div>

    </div>
  )
}
