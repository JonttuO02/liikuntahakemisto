'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { createBrowserSupabase, subscribeToAuthUser } from '@/lib/supabaseSSR'
import StarPicker from './StarPicker'
import AuthModal from './AuthModal'

type AuthState = 'loading' | 'unauthenticated' | 'authenticated'
type Crowd = 'hiljaista' | 'sopivasti' | 'ruuhkaista'

type ExistingReview = {
  id: number
  rating: number
  teksti: string
  is_anonymous: boolean
  reviewer_name: string | null
  visit_date: string | null
  crowd_rating: Crowd | null
}

const CROWD: { value: Crowd; label: string }[] = [
  { value: 'hiljaista', label: 'Hiljaista' },
  { value: 'sopivasti', label: 'Sopivasti' },
  { value: 'ruuhkaista', label: 'Ruuhkaista' },
]


function ExistingReviewView({ review }: { review: ExistingReview }) {
  const filledStars = '★'.repeat(review.rating)
  const emptyStars = '☆'.repeat(5 - review.rating)
  return (
    <div className="flex flex-col gap-2">
      <span className="text-amber-400 text-sm">{filledStars}{emptyStars}</span>
      {review.teksti.trim() !== '' && (
        <p className="text-sm text-[rgba(17,17,17,0.65)] leading-relaxed">{review.teksti}</p>
      )}
    </div>
  )
}

export default function ReviewForm({ paikkaId }: { paikkaId: number }) {
  const [authState, setAuthState] = useState<AuthState>('loading')
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [existingReview, setExistingReview] = useState<ExistingReview | null>(null)
  const [editing, setEditing] = useState(false)
  const [rating, setRating] = useState(0)
  const [teksti, setTeksti] = useState('')
  const [visitDate, setVisitDate] = useState('')
  const [crowdRating, setCrowdRating] = useState<Crowd | null>(null)
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [saved, setSaved] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const currentUser = useRef<{ id: string; email?: string } | null>(null)
  const router = useRouter()
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const supabase = createBrowserSupabase()
    return subscribeToAuthUser(async (user) => {
      currentUser.current = user
      if (user) {
        setAuthState('authenticated')
        const { data } = await supabase
          .from('reviews')
          .select('id, rating, teksti, is_anonymous, reviewer_name, visit_date, crowd_rating')
          .eq('user_id', user.id)
          .eq('paikka_id', paikkaId)
          .maybeSingle()
        if (data) {
          setExistingReview(data as ExistingReview)
          setRating(data.rating)
          setTeksti(data.teksti)
          setIsAnonymous(data.is_anonymous)
          setVisitDate(data.visit_date ?? '')
          setCrowdRating(data.crowd_rating ?? null)
        } else {
          setExistingReview(null)
        }
      } else {
        setAuthState('unauthenticated')
        setExistingReview(null)
        setEditing(false)
        setRating(0)
        setTeksti('')
        setVisitDate('')
        setCrowdRating(null)
        setIsAnonymous(false)
      }
    })
  }, [paikkaId])

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const user = currentUser.current
    if (!user || rating === 0) return
    setSubmitting(true)
    setSubmitError(null)
    const supabase = createBrowserSupabase()
    const payload = {
      user_id: user.id,
      paikka_id: paikkaId,
      rating,
      teksti: teksti.trim(),
      is_anonymous: isAnonymous,
      visit_date: visitDate || null,
      crowd_rating: crowdRating,
      reviewer_name: isAnonymous ? null : (user.email?.split('@')[0] ?? null),
    }
    const { error } = await supabase
      .from('reviews')
      .upsert(payload, { onConflict: 'user_id,paikka_id' })
    setSubmitting(false)
    if (error) {
      console.error('[ReviewForm] upsert error:', error)
      setSubmitError(error.message ?? 'unknown')
    } else {
      setSubmitError(null)
      setSaved(true)
      setEditing(false)
      router.refresh()
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => setSaved(false), 2500)
    }
  }

  function buildForm({ disabled }: { disabled: boolean }) {
    const today = new Date().toISOString().split('T')[0]
    const isEditMode = !!existingReview && editing
    const submitLabel = submitting
      ? 'Tallennetaan…'
      : isEditMode
      ? 'Tallenna muutokset'
      : 'Jätä arvostelu'
    const isDisabledBtn = rating === 0 || submitting

    return (
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Star rating */}
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-bold text-[#111111] uppercase tracking-widest">TÄHTIARVOSANA</p>
          {disabled ? (
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className="text-2xl leading-none text-[rgba(17,17,17,0.2)]">★</span>
              ))}
            </div>
          ) : (
            <StarPicker value={rating} onChange={setRating} />
          )}
        </div>

        {/* Comment */}
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-bold text-[#111111] uppercase tracking-widest">KOMMENTTI</p>
          <textarea
            value={teksti}
            onChange={(e) => setTeksti(e.target.value)}
            rows={3}
            maxLength={2000}
            aria-label="Kommentti"
            disabled={disabled}
            className="border border-[rgba(0,0,0,0.12)] rounded-xl px-3 py-2 text-sm text-[#111111] bg-white focus:outline-none focus:border-[rgba(0,0,0,0.3)] w-full resize-y"
          />
        </div>

        {/* Visit date */}
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-bold text-[#111111] uppercase tracking-widest">KÄYNTIPÄIVÄ</p>
          <input
            type="date"
            max={today}
            value={visitDate}
            onChange={(e) => setVisitDate(e.target.value)}
            disabled={disabled}
            aria-label="Käyntipäivä"
            className="border border-[rgba(0,0,0,0.12)] rounded-xl px-3 py-2 text-sm text-[#111111] bg-white focus:outline-none focus:border-[rgba(0,0,0,0.3)]"
          />
        </div>

        {/* Crowd rating */}
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-bold text-[#111111] uppercase tracking-widest">RUUHKATILANNE</p>
          <div className="flex gap-2">
            {CROWD.map((opt) => {
              const isActive = crowdRating === opt.value
              return (
                <motion.button
                  key={opt.value}
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  disabled={disabled}
                  aria-pressed={isActive}
                  onClick={() => setCrowdRating(isActive ? null : opt.value)}
                  className={
                    isActive
                      ? 'bg-[#111111] text-white font-bold text-sm px-3 py-2 rounded-full [transition:background-color_150ms_var(--ease-out),color_150ms_var(--ease-out)]'
                      : 'border border-[rgba(0,0,0,0.12)] text-[#111111] font-bold text-sm px-3 py-2 rounded-full [transition:background-color_150ms_var(--ease-out),color_150ms_var(--ease-out)]'
                  }
                >
                  {opt.label}
                </motion.button>
              )
            })}
          </div>
        </div>

        {/* Anonymous toggle */}
        <div className="flex gap-2">
          {[
            { label: 'Näytä nimeni', value: false },
            { label: 'Anonyymi', value: true },
          ].map((opt) => {
            const isActive = isAnonymous === opt.value
            return (
              <motion.button
                key={opt.label}
                type="button"
                whileTap={{ scale: 0.95 }}
                disabled={disabled}
                aria-pressed={isActive}
                onClick={() => setIsAnonymous(opt.value)}
                className={
                  isActive
                    ? 'bg-[#111111] text-white font-bold text-sm px-3 py-2 rounded-full [transition:background-color_150ms_var(--ease-out),color_150ms_var(--ease-out)]'
                    : 'border border-[rgba(0,0,0,0.12)] text-[#111111] font-bold text-sm px-3 py-2 rounded-full [transition:background-color_150ms_var(--ease-out),color_150ms_var(--ease-out)]'
                }
              >
                {opt.label}
              </motion.button>
            )
          })}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isDisabledBtn}
          aria-disabled={rating === 0}
          className={`bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm px-5 py-2 rounded-full self-start [transition:background-color_150ms_var(--ease-out)]${isDisabledBtn ? ' opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
        >
          {submitLabel}
        </button>

        {/* Status messages */}
        {saved && (
          <p className="text-sm text-green-700">Arvostelu tallennettu</p>
        )}
        {submitError && (
          <p className="text-sm text-red-600">Tallennus epäonnistui. Yritä uudelleen.</p>
        )}
      </form>
    )
  }

  // Loading state
  if (authState === 'loading') {
    return <div className="h-10 rounded-xl bg-[rgba(17,17,17,0.05)] animate-pulse" />
  }

  // Unauthenticated state — locked form with CTA overlay
  if (authState === 'unauthenticated') {
    return (
      <div className="relative">
        <div className="opacity-60 pointer-events-none" aria-hidden="true">
          {buildForm({ disabled: true })}
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={() => setAuthModalOpen(true)}
            className="bg-[#111111] hover:bg-[#333333] text-white font-bold text-sm px-5 py-2 rounded-full [transition:background-color_150ms_var(--ease-out)]"
          >
            Kirjaudu arvostellaksesi
          </button>
        </div>
        <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      </div>
    )
  }

  // Authenticated, has existing review — show read-only view + edit toggle
  if (existingReview && !editing) {
    return (
      <div className="flex flex-col gap-3">
        <ExistingReviewView review={existingReview} />
        <button
          onClick={() => setEditing(true)}
          className="border border-[rgba(0,0,0,0.12)] text-[#111111] font-bold text-sm px-5 py-2 rounded-full self-start [transition:background-color_150ms_var(--ease-out)]"
        >
          Muokkaa arvostelu
        </button>
      </div>
    )
  }

  // Authenticated, no existing review or editing mode
  return buildForm({ disabled: false })
}
