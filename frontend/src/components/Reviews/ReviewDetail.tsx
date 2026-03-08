import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useReviewStore, type Review } from '../../stores/reviewStore'
import { useAuthStore } from '../../stores/authStore'
import { useUiStore } from '../../stores/uiStore'
import { getSupabase } from '../../services/supabase'

const RATING_LABELS = [
  '\u2715 \uC7AC\uBC29\uBB38 \uC548 \uD568', // rating 0
  '\u2605 \uAC00\uBCCD\uAC8C \uAC08 \uACF3',   // rating 1
  '\u2605\u2605 \uCD94\uCC9C\uD560 \uACF3', // rating 2
  '\u2605\u2605\u2605 \uAF2D \uAC00\uC57C \uD560 \uACF3', // rating 3
]

const SWIPE_THRESHOLD = 120 // px to trigger close

export function ReviewDetail() {
  const { t } = useTranslation()
  const {
    detailOpen,
    detailReviews,
    detailIndex,
    closeDetail,
    setDetailIndex,
    invalidateCache,
  } = useReviewStore()
  const user = useAuthStore((s) => s.user)
  const showToast = useUiStore((s) => s.showToast)

  const [photoFullscreen, setPhotoFullscreen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Swipe-down gesture state
  const panelRef = useRef<HTMLDivElement>(null)
  const dragStartY = useRef(0)
  const dragDelta = useRef(0)
  const isDragging = useRef(false)

  const review = detailReviews[detailIndex] ?? null
  const totalReviews = detailReviews.length

  // ESC to close
  useEffect(() => {
    if (!detailOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (photoFullscreen) {
          setPhotoFullscreen(false)
        } else {
          closeDetail()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [detailOpen, photoFullscreen, closeDetail])

  // Prevent body scroll
  useEffect(() => {
    if (detailOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [detailOpen])

  // Reset fullscreen when detail opens/closes
  useEffect(() => {
    if (!detailOpen) {
      setPhotoFullscreen(false)
    }
  }, [detailOpen])

  // Navigate prev/next
  const goPrev = useCallback(() => {
    if (totalReviews <= 1) return
    setDetailIndex((detailIndex - 1 + totalReviews) % totalReviews)
  }, [detailIndex, totalReviews, setDetailIndex])

  const goNext = useCallback(() => {
    if (totalReviews <= 1) return
    setDetailIndex((detailIndex + 1) % totalReviews)
  }, [detailIndex, totalReviews, setDetailIndex])

  // Delete review
  const handleDelete = useCallback(async () => {
    if (!review?.id) return
    if (!window.confirm(t('review.deleteConfirm'))) return

    const sb = getSupabase()
    setIsDeleting(true)

    try {
      // Delete photo from Storage
      if (review.photo_url) {
        const match = review.photo_url.match(/review-photos\/(.+)$/)
        if (match) {
          await sb.storage
            .from('review-photos')
            .remove([match[1]])
            .catch(() => {
              // Ignore storage deletion errors
            })
        }
      }

      // Delete review from DB
      const { error } = await sb
        .from('reviews')
        .delete()
        .eq('id', review.id)

      if (error) {
        console.warn('[ReviewDetail] deleteReview:', error)
        return
      }

      invalidateCache()
      closeDetail()
      showToast(t('review.deleted'))
    } finally {
      setIsDeleting(false)
    }
  }, [review, t, invalidateCache, closeDetail, showToast])

  // Swipe-down touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY
    dragDelta.current = 0
    isDragging.current = true

    if (panelRef.current) {
      panelRef.current.style.transition = 'none'
    }
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return
    const delta = e.touches[0].clientY - dragStartY.current
    dragDelta.current = Math.max(0, delta) // Only allow downward drag

    if (panelRef.current) {
      panelRef.current.style.transform = `translateY(${dragDelta.current}px)`
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    isDragging.current = false

    if (panelRef.current) {
      panelRef.current.style.transition = ''
      panelRef.current.style.transform = ''
    }

    if (dragDelta.current > SWIPE_THRESHOLD) {
      closeDetail()
    }
  }, [closeDetail])

  if (!detailOpen || !review) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[10001] bg-black/50 animate-fade-in"
        onClick={closeDetail}
        aria-hidden
      />

      {/* Photo fullscreen overlay */}
      {photoFullscreen && review.photo_url && (
        <div
          className="fixed inset-0 z-[10003] flex items-center justify-center bg-black/90"
          onClick={() => setPhotoFullscreen(false)}
        >
          <img
            src={review.photo_url}
            alt={review.place_name}
            className="max-h-full max-w-full object-contain"
          />
        </div>
      )}

      {/* Bottom sheet panel */}
      <div
        ref={panelRef}
        className="fixed inset-x-0 bottom-0 z-[10002] max-h-[85vh] animate-slide-up overflow-y-auto rounded-t-2xl bg-surface shadow-2xl"
      >
        {/* Drag handle */}
        <div
          className="flex cursor-grab justify-center py-3 active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>

        {/* Header with close button */}
        <div className="flex items-start justify-between px-4 pb-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-serif text-lg font-semibold text-text-primary">
              {review.place_name}
            </h3>
            <p className="mt-0.5 truncate text-xs text-text-muted">
              {[review.place_category, review.place_address]
                .filter(Boolean)
                .join(' \u00B7 ')}
            </p>
          </div>
          <button
            type="button"
            onClick={closeDetail}
            className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-muted hover:bg-bg"
            aria-label="Close"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Creator label (for reviews from board creator) */}
        {review.user_id !== user?.id && (
          <div className="px-4 pb-1">
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
              {t('badge.creatorLabel')}
            </span>
          </div>
        )}

        {/* Photo */}
        {review.photo_url && (
          <div className="px-4 pb-3">
            <button
              type="button"
              onClick={() => setPhotoFullscreen(true)}
              className="w-full overflow-hidden rounded-xl"
            >
              <img
                src={review.photo_url}
                alt={review.place_name}
                className="max-h-[300px] w-full object-cover"
                loading="lazy"
              />
            </button>
          </div>
        )}

        {/* Rating & date */}
        <div className="flex flex-wrap items-center gap-3 px-4 pb-2">
          <span className={`text-sm font-semibold ${review.rating === 0 ? 'text-danger' : 'text-star'}`}>
            {RATING_LABELS[review.rating] ?? ''}
          </span>
          {review.visited_at && (
            <span className="text-xs text-text-muted">
              {review.visited_at}
            </span>
          )}
          {review.verified_visit && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {t('review.verifiedVisit')}
            </span>
          )}
        </div>

        {/* Review text */}
        {review.review_text && (
          <div className="px-4 pb-3">
            <p className="text-sm leading-relaxed text-text-primary">
              {review.review_text}
            </p>
          </div>
        )}

        {/* Rating trend for multiple visits */}
        {totalReviews > 1 && <RatingTrend reviews={detailReviews} />}

        {/* Navigation for multiple reviews of same place */}
        {totalReviews > 1 && (
          <div className="flex items-center justify-center gap-4 border-t border-border px-4 py-2.5">
            <button
              type="button"
              onClick={goPrev}
              className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-bg"
              aria-label="Previous"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <span className="text-sm font-medium text-text-muted">
              {detailIndex + 1} / {totalReviews}
            </span>
            <button
              type="button"
              onClick={goNext}
              className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-bg"
              aria-label="Next"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-2 border-t border-border px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
          <a
            href={`https://place.map.kakao.com/${review.place_id || ''}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-accent/30 bg-accent/5 px-4 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-accent/10"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            {t('review.viewDetail')}
          </a>
          {review.user_id === user?.id && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="w-full rounded-xl border border-danger/30 bg-danger/5 px-4 py-2.5 text-sm font-semibold text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
            >
              {t('review.delete')}
            </button>
          )}
        </div>
      </div>
    </>
  )
}

/* ===== Rating trend sub-component ===== */
const STAR_CHARS: Record<number, string> = {
  0: '\u2715',
  1: '\u2605',
  2: '\u2605\u2605',
  3: '\u2605\u2605\u2605',
}

function RatingTrend({ reviews }: { reviews: Review[] }) {
  const { t } = useTranslation()

  const { avg, sorted, trendIcon } = useMemo(() => {
    const sum = reviews.reduce((s, r) => s + r.rating, 0)
    const avg = sum / reviews.length

    // Sort by visited_at ascending (oldest first) for timeline
    const sorted = [...reviews].sort((a, b) =>
      (a.visited_at || '').localeCompare(b.visited_at || ''),
    )

    const first = sorted[0].rating
    const last = sorted[sorted.length - 1].rating
    const trendIcon = last > first ? '↗' : last < first ? '↘' : '→'

    return { avg, sorted, trendIcon }
  }, [reviews])

  return (
    <div className="mx-4 mb-3 rounded-xl border border-border bg-bg p-3">
      {/* Header: average + visits + trend */}
      <div className="mb-2 flex items-center gap-2 text-xs">
        <span className="font-semibold text-text-primary">
          {t('review.avgRating')}
        </span>
        <span className="text-star">
          {avg.toFixed(1)}
        </span>
        <span className="text-text-muted">·</span>
        <span className="text-text-muted">
          {t('review.visits', { 0: reviews.length })}
        </span>
        <span className={`ml-auto text-sm ${
          trendIcon === '↗' ? 'text-green-600' : trendIcon === '↘' ? 'text-danger' : 'text-text-muted'
        }`}>
          {trendIcon}
        </span>
      </div>

      {/* Timeline */}
      <div className="space-y-1">
        {sorted.map((r, i) => {
          const isFirst = i === 0
          const isLast = i === sorted.length - 1
          const date = r.visited_at
            ? r.visited_at.slice(0, 7).replace('-', '.')
            : ''

          return (
            <div
              key={r.id}
              className={`flex items-center gap-2 rounded-lg px-2 py-1 text-xs ${
                isLast ? 'bg-accent/10' : ''
              }`}
            >
              <span className="w-14 shrink-0 text-text-muted">{date}</span>
              <span className={`${r.rating === 0 ? 'text-danger' : 'text-star'}`}>
                {STAR_CHARS[r.rating] ?? ''}
              </span>
              {isFirst && (
                <span className="ml-auto text-[10px] text-text-muted">
                  {t('review.oldest')}
                </span>
              )}
              {isLast && (
                <span className="ml-auto text-[10px] font-semibold text-accent">
                  {t('review.newest')}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
