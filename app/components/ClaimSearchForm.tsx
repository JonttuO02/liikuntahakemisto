'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { createBrowserSupabase } from '@/lib/supabaseSSR'
import { createBusinessBrowserClient } from '@/lib/supabase-business'

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 'search' | 'claim' | 'create'

type SearchResult = {
  id: number
  nimi: string
  osoite: string | null
  kaupunki: string | null
  laji: string | null
  is_claimed: boolean
}

// ─── Shared class constants ───────────────────────────────────────────────────

const INPUT_CLASS =
  'flex-1 border border-[rgba(0,0,0,0.12)] focus:border-[rgba(0,0,0,0.25)] rounded-lg h-10 px-3 text-sm outline-none [transition:border-color_150ms_var(--ease-out)]'

const SELECT_CLASS =
  'border border-[rgba(0,0,0,0.12)] focus:border-[rgba(0,0,0,0.25)] rounded-lg h-10 px-3 text-sm outline-none min-w-[130px] bg-white [transition:border-color_150ms_var(--ease-out)]'

const CTA_CLASS =
  'bg-[#111111] rounded-full h-10 w-full text-sm font-bold text-white hover:bg-[#333333] disabled:opacity-60 disabled:pointer-events-none [transition:background-color_150ms_var(--ease-out)]'

// ─── Component ────────────────────────────────────────────────────────────────

export default function ClaimSearchForm() {
  const t = useTranslations('Business')
  const router = useRouter()

  // Step state
  const [step, setStep] = useState<Step>('search')

  // Step 1 — search
  const [query, setQuery] = useState('')
  const [kaupunki, setKaupunki] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedVenue, setSelectedVenue] = useState<SearchResult | null>(null)

  // Step 3 — create form
  const [createNimi, setCreateNimi] = useState('')
  const [createOsoite, setCreateOsoite] = useState('')
  const [createKaupunki, setCreateKaupunki] = useState('Tampere')

  // Shared
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ─── Debounced search ──────────────────────────────────────────────────────

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (query.length < 2) {
      setResults([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      const supabase = createBrowserSupabase()
      let dbQuery = supabase
        .from('liikuntapaikat')
        .select('id, nimi, osoite, kaupunki, laji, is_claimed')
        .ilike('nimi', `%${query}%`)
        .eq('published', true)
        .limit(8)

      if (kaupunki && kaupunki !== '') {
        dbQuery = dbQuery.eq('kaupunki', kaupunki)
      }

      const { data } = await dbQuery
      setResults((data as SearchResult[]) ?? [])
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, kaupunki])

  // ─── Handlers ─────────────────────────────────────────────────────────────

  async function handleClaim() {
    if (!selectedVenue) return
    setLoading(true)
    setError(null)

    const { data: { session } } = await createBusinessBrowserClient().auth.getSession()
    const token = session?.access_token ?? ''

    try {
      const res = await fetch('/api/business/claim-paikka', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ paikka_id: selectedVenue.id }),
      })

      if (res.ok) {
        router.push(`/business/onboarding?paikka_id=${selectedVenue.id}`)
        return
      }

      if (res.status === 409) {
        setError(t('errorClaimAlreadyTaken'))
      } else {
        setError(t('errorClaimFailed'))
      }
    } catch {
      setError(t('errorClaimFailed'))
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!createNimi.trim()) {
      setError(t('errorNameRequired'))
      return
    }
    if (!createOsoite.trim()) {
      setError(t('errorAddressRequired'))
      return
    }

    setLoading(true)
    setError(null)

    const { data: { session } } = await createBusinessBrowserClient().auth.getSession()
    const token = session?.access_token ?? ''

    try {
      const res = await fetch('/api/business/create-paikka', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nimi: createNimi.trim(),
          osoite: createOsoite.trim(),
          kaupunki: createKaupunki,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        router.push(`/business/onboarding${data.paikka_id ? `?paikka_id=${data.paikka_id}` : ''}`)
        return
      }

      setError(t('errorCreateFailed'))
    } catch {
      setError(t('errorCreateFailed'))
    } finally {
      setLoading(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div aria-live="polite">
      <AnimatePresence mode="wait">
        {step === 'search' && (
          <motion.div
            key="search"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-4"
          >
            {/* Search row */}
            <div className="flex gap-2">
              <input
                type="text"
                aria-label={t('searchNamePlaceholder')}
                placeholder={t('searchNamePlaceholder')}
                className={INPUT_CLASS}
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
              <select
                aria-label="Kaupunki"
                className={SELECT_CLASS}
                value={kaupunki}
                onChange={e => setKaupunki(e.target.value)}
              >
                <option value="">{t('searchAllCities')}</option>
                <option value="Tampere">Tampere</option>
                <option value="Helsinki">Helsinki</option>
                <option value="Turku">Turku</option>
              </select>
            </div>

            {/* Results list */}
            <AnimatePresence>
              {results.length > 0 && (
                <motion.div
                  key={query + kaupunki}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-col gap-2"
                >
                  {results.map(result => (
                    <div
                      key={result.id}
                      className={[
                        'glass rounded-xl p-3 flex items-center gap-3',
                        result.is_claimed ? 'cursor-not-allowed' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      style={
                        result.is_claimed
                          ? { background: 'rgba(17,17,17,0.04)' }
                          : undefined
                      }
                      aria-disabled={result.is_claimed ? 'true' : undefined}
                    >
                      {/* Left: venue info */}
                      <div className="flex-1 flex flex-col gap-1">
                        <span
                          className={[
                            'text-sm font-bold',
                            result.is_claimed
                              ? 'text-[rgba(17,17,17,0.35)]'
                              : 'text-[#111111]',
                          ].join(' ')}
                        >
                          {result.nimi}
                        </span>
                        {result.osoite && (
                          <span className="text-sm text-[rgba(17,17,17,0.45)]">
                            {result.osoite}
                          </span>
                        )}
                        {result.laji && (
                          <span className="text-sm text-[rgba(17,17,17,0.45)]">
                            {result.laji}
                          </span>
                        )}
                      </div>

                      {/* Right: action */}
                      {result.is_claimed ? (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[rgba(17,17,17,0.45)]">
                          JO HALLITTU
                          <span className="sr-only">Jo hallittu</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          aria-label={`${t('resultSelectCta')}: ${result.nimi}`}
                          className="text-sm font-bold text-[#111111] border border-[rgba(0,0,0,0.12)] hover:border-[rgba(0,0,0,0.25)] rounded-full px-3 h-8 [transition:border-color_150ms_var(--ease-out)]"
                          onClick={() => {
                            setSelectedVenue(result)
                            setError(null)
                            setStep('claim')
                          }}
                        >
                          {t('resultSelectCta')}
                        </button>
                      )}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Empty state */}
            <AnimatePresence>
              {query.length >= 2 && results.length === 0 && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <p className="text-sm text-[rgba(17,17,17,0.45)]">
                    {t('searchNoResults')}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Create CTA */}
            <AnimatePresence>
              {query.length >= 2 && (
                <motion.button
                  key="create-cta"
                  type="button"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="text-sm text-[#111111] underline-offset-2 hover:underline text-left"
                  onClick={() => {
                    setError(null)
                    setStep('create')
                  }}
                >
                  {t('createInstead')}
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {step === 'claim' && (
          <motion.div
            key="claim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-4"
          >
            {/* Back button */}
            <motion.button
              type="button"
              aria-label={t('backToSearch')}
              whileTap={{ scale: 0.95 }}
              className="text-sm text-[rgba(17,17,17,0.45)] flex items-center gap-1 w-fit"
              onClick={() => {
                setStep('search')
                setError(null)
              }}
            >
              {t('backToSearch')}
            </motion.button>

            {/* Selected venue info */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[rgba(17,17,17,0.45)]">
                {t('selectedVenueLabel')}
              </span>
              <span className="text-sm font-bold text-[#111111]">
                {selectedVenue?.nimi}
              </span>
              <span className="text-sm text-[rgba(17,17,17,0.45)]">
                {[selectedVenue?.osoite, selectedVenue?.kaupunki]
                  .filter(Boolean)
                  .join(', ')}
              </span>
            </div>

            {/* Error block */}
            <AnimatePresence>
              {error && (
                <motion.div
                  key="claim-error"
                  role="alert"
                  aria-live="polite"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <p className="text-sm text-red-600">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Claim CTA */}
            <button
              type="button"
              className={CTA_CLASS}
              onClick={handleClaim}
              disabled={loading}
            >
              {loading ? t('claiming') : t('claimCta')}
            </button>
          </motion.div>
        )}

        {step === 'create' && (
          <motion.div
            key="create"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-4"
          >
            {/* Back button */}
            <motion.button
              type="button"
              aria-label={t('backToSearch')}
              whileTap={{ scale: 0.95 }}
              className="text-sm text-[rgba(17,17,17,0.45)] flex items-center gap-1 w-fit"
              onClick={() => {
                setStep('search')
                setError(null)
              }}
            >
              {t('backToSearch')}
            </motion.button>

            {/* Create heading */}
            <h2 className="text-sm font-bold text-[#111111]">
              {t('createTitle')}
            </h2>

            {/* Create form */}
            <form onSubmit={handleCreate} className="flex flex-col gap-3">
              <input
                type="text"
                placeholder={t('createNamePlaceholder')}
                className={INPUT_CLASS}
                value={createNimi}
                onChange={e => setCreateNimi(e.target.value)}
              />
              <input
                type="text"
                placeholder={t('createAddressPlaceholder')}
                className={INPUT_CLASS}
                value={createOsoite}
                onChange={e => setCreateOsoite(e.target.value)}
              />
              <select
                aria-label="Kaupunki"
                className={SELECT_CLASS}
                value={createKaupunki}
                onChange={e => setCreateKaupunki(e.target.value)}
              >
                <option value="Tampere">Tampere</option>
                <option value="Helsinki">Helsinki</option>
                <option value="Turku">Turku</option>
              </select>

              {/* Error block */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    key="create-error"
                    role="alert"
                    aria-live="polite"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <p className="text-sm text-red-600">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Create CTA */}
              <button type="submit" className={CTA_CLASS} disabled={loading}>
                {loading ? t('creating') : t('createCta')}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
