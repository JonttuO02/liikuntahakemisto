'use client'

import { useState } from 'react'
import { resolveDisplayName } from '@/lib/reviewUtils'
import ReviewForm from './ReviewForm'

export type ReviewRow = {
  id: number
  rating: number
  teksti: string
  is_anonymous: boolean
  reviewer_name: string | null
  created_at: string
}

function ReviewCard({ review }: { review: ReviewRow }) {
  const filledStars = '★'.repeat(review.rating)
  const emptyStars  = '☆'.repeat(5 - review.rating)
  const displayName = resolveDisplayName(review.is_anonymous, review.reviewer_name)

  return (
    <div className="flex flex-col gap-2 py-3 border-b border-[rgba(0,0,0,0.07)] last:border-0">
      <div className="flex items-center gap-2">
        <span className="text-amber-400 text-sm">{filledStars}{emptyStars}</span>
        <span className="font-bold text-sm text-[#111111]">{displayName}</span>
      </div>
      {review.teksti.trim() !== '' && (
        <p className="text-sm text-[rgba(17,17,17,0.65)] leading-relaxed">{review.teksti}</p>
      )}
    </div>
  )
}

export default function ReviewSection({
  paikkaId,
  initialReviews,
  avgRating,
  reviewCount,
}: {
  paikkaId: number
  initialReviews: ReviewRow[]
  avgRating: number | null
  reviewCount: number
}) {
  const [showAll, setShowAll] = useState(false)
  const displayed = showAll ? initialReviews : initialReviews.slice(0, 5)

  const filled = avgRating !== null ? Math.round(avgRating) : 0
  const empty = 5 - filled
  const rounded =
    avgRating !== null
      ? (Math.round(avgRating * 10) / 10).toFixed(1)
      : null

  return (
    <div className="max-w-2xl mx-auto px-4 pb-10">
      <div className="glass rounded-2xl p-6 sm:p-8 flex flex-col gap-5">
        {/* Star average */}
        {reviewCount > 0 && avgRating !== null ? (
          <div className="flex items-center gap-2">
            <span className="text-amber-400 tracking-tight">
              {'★'.repeat(filled)}{'☆'.repeat(empty)}
            </span>
            <span className="font-bold text-sm text-[#111111]">{rounded}</span>
            <span className="text-sm text-[rgba(17,17,17,0.45)]">({reviewCount} arvostelua)</span>
          </div>
        ) : (
          <p className="text-sm text-[rgba(17,17,17,0.45)]">Ei vielä arvosteluja</p>
        )}

        {/* ReviewForm slot — implemented in Plan 03 */}
        <ReviewForm paikkaId={paikkaId} />

        {/* Review list */}
        <div className="flex flex-col">
          {displayed.map((r) => (
            <ReviewCard key={r.id} review={r} />
          ))}
          {!showAll && initialReviews.length > 5 && (
            <button
              onClick={() => setShowAll(true)}
              className="mt-4 text-sm font-bold text-[#111111] underline underline-offset-2 self-start"
            >
              {`Näytä kaikki (${initialReviews.length} arvostelua)`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
