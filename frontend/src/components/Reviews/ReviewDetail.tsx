import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useReviewStore } from '../../stores/reviewStore'
import { useUiStore } from '../../stores/uiStore'
import { getSupabase } from '../../services/supabase'

const RATING_LABELS = [
  '', // index 0 unused
  '\u2605 \uB3D9\uB124\uB9DB\uC9D1',   // rating 1
  '\u2605\u2605 \uCD94\uCC9C\uB9DB\uC9D1', // rating 2
  '\u2605\u2605\u2605 \uC778\uC0DD\uB9DB\uC9D1', // rating 3
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
          <span className="text-sm font-semibold text-star">
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

        {/* Delete button */}
        <div className="border-t border-border px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="w-full rounded-xl border border-danger/30 bg-danger/5 px-4 py-2.5 text-sm font-semibold text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
          >
            {t('review.delete')}
          </button>
        </div>
      </div>
    </>
  )
}
