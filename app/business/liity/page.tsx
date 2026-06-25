'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createBusinessBrowserClient } from '@/lib/supabase-business'

// States this page can be in, following D-08/D-09/D-10 from CONTEXT.md.
type PageState =
  | 'loading'
  | 'invalid-link'     // D-10: missing/malformed paikka_id or no approved owner
  | 'already-in-company' // D-09: requester's business account already has a company_id
  | 'pending'          // D-08 or already-submitted: pending access request exists
  | 'submit-form'      // authenticated account with no company_id, ready to submit

export default function LiityPage() {
  const t = useTranslations('Business')
  const router = useRouter()
  const searchParams = useSearchParams()

  const rawPaikkaId = searchParams.get('paikka_id')
  const paikkaId = rawPaikkaId ? parseInt(rawPaikkaId, 10) : NaN

  const [pageState, setPageState] = useState<PageState>('loading')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    // Malformed or missing paikka_id → treat as D-10 invalid-link immediately
    if (!rawPaikkaId || isNaN(paikkaId)) {
      setPageState('invalid-link')
      return
    }

    async function initialize() {
      const supabase = createBusinessBrowserClient()

      // Check auth: unauthenticated visitors route to the existing signup flow
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/business/rekisteroidy?paikka_id=' + paikkaId)
        return
      }

      // Check for a business_accounts row
      const { data: account } = await supabase
        .from('business_accounts')
        .select('company_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!account) {
        // No business account row — must register through the invite path first
        router.replace('/business/rekisteroidy?paikka_id=' + paikkaId)
        return
      }

      // D-09: account already belongs to a company — cannot request access to another
      if (account.company_id !== null) {
        setPageState('already-in-company')
        return
      }

      // D-08: check whether a pending access request already exists for this venue
      // RLS scopes this query to the current user's rows (requester_id = auth.uid())
      const { data: existingRequest } = await supabase
        .from('business_access_requests')
        .select('id')
        .eq('paikka_id', paikkaId)
        .eq('status', 'pending')
        .maybeSingle()

      if (existingRequest) {
        setPageState('pending')
        return
      }

      // All clear — show the submit form
      setPageState('submit-form')
    }

    initialize()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawPaikkaId])

  async function handleSubmit() {
    setSubmitting(true)
    setSubmitError(null)

    try {
      const supabase = createBusinessBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token ?? ''

      const res = await fetch('/api/business/access-request/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({ paikka_id: paikkaId }),
      })

      const json = await res.json() as { ok?: boolean; error?: string }

      if (res.ok) {
        // Success (new insert or D-08 idempotent duplicate) → show pending state
        setPageState('pending')
        return
      }

      // Map 400 error messages to the appropriate display state
      const errorMsg = json?.error ?? ''
      if (errorMsg.includes('toiseen yritykseen')) {
        // D-09: account belongs to another company
        setPageState('already-in-company')
      } else if (
        errorMsg.includes('kutsulinkki') ||
        errorMsg.includes('voimassa') ||
        errorMsg === 'Missing fields'
      ) {
        // D-10: invalid/no-owner link, or malformed paikka_id that slipped through
        setPageState('invalid-link')
      } else {
        // Unexpected error — show inline
        setSubmitError(errorMsg || t('errorGeneric'))
      }
    } catch {
      setSubmitError(t('errorGeneric'))
    } finally {
      setSubmitting(false)
    }
  }

  // Loading spinner — matches the existing pattern in app/business/page.tsx
  if (pageState === 'loading') {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-[rgba(17,17,17,0.12)] border-t-[#111111] animate-spin" />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-16">
      <div className="glass rounded-2xl p-6 w-full max-w-sm flex flex-col gap-4">

        {/* D-10: invalid or expired invite link */}
        {pageState === 'invalid-link' && (
          <p className="text-sm text-red-600">{t('liityErrorInvalidLink')}</p>
        )}

        {/* D-09: requester's account already belongs to a different company */}
        {pageState === 'already-in-company' && (
          <p className="text-sm text-red-600">{t('liityErrorAlreadyInCompany')}</p>
        )}

        {/* D-08 or post-submit: pending access request exists */}
        {pageState === 'pending' && (
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold text-[#111111]">{t('accessRequestPendingTitle')}</span>
            <span className="text-xs text-[rgba(17,17,17,0.45)]">{t('accessRequestPendingBody')}</span>
          </div>
        )}

        {/* Submit form: authenticated, no company, no pending request yet */}
        {pageState === 'submit-form' && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-bold text-[#111111]">{t('liityHeading')}</h1>
              <p className="text-sm text-[rgba(17,17,17,0.45)]">{t('liityBody')}</p>
            </div>
            {submitError && (
              <p className="text-sm text-red-600">{submitError}</p>
            )}
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="bg-[#111111] hover:bg-[#333333] disabled:opacity-50 text-white font-bold text-sm rounded-full h-10 px-6 flex items-center justify-center [transition:background-color_150ms_var(--ease-out)]"
            >
              {submitting ? '...' : t('liitySubmitCta')}
            </button>
          </div>
        )}

      </div>
    </main>
  )
}
