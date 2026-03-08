import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useReviewStore } from '../../stores/reviewStore'
import { useAuthStore } from '../../stores/authStore'
import { useUiStore } from '../../stores/uiStore'
import { useReviewedPlaces } from '../../hooks/useReviewedPlaces'
import { useGeolocation } from '../../hooks/useGeolocation'
import { getSupabase } from '../../services/supabase'
import { isWithinVisitRange } from '../../utils/distance'
import { RatingSelector } from './RatingSelector'
import { PhotoUploader } from './PhotoUploader'
import { DatePicker } from './DatePicker'

function todayStr(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function ReviewModal() {
  const { t } = useTranslation()
  const { modalOpen, modalPlace, closeModal, invalidateCache } =
    useReviewStore()
  const user = useAuthStore((s) => s.user)
  const showToast = useUiStore((s) => s.showToast)
  const { getVisitCount } = useReviewedPlaces()
  const { lat: geoLat, lng: geoLng, loading: geoLoading, requestLocation } = useGeolocation()

  const scrollRef = useRef<HTMLDivElement>(null)

  // Form state
  const [rating, setRating] = useState<number | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [thumbFile, setThumbFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [reviewText, setReviewText] = useState('')
  const [visitedAt, setVisitedAt] = useState(todayStr())
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [visitCount, setVisitCount] = useState(0)

  // Reset form when modal opens/closes
  useEffect(() => {
    if (modalOpen) {
      setRating(null)
      setFile(null)
      setThumbFile(null)
      setPreviewUrl(null)
      setReviewText('')
      setVisitedAt(todayStr())
      setError(null)
      setIsSubmitting(false)
      setVisitCount(0)
      requestLocation()
    }
  }, [modalOpen, requestLocation])

  // Load visit count when modal opens for a place
  useEffect(() => {
    if (modalOpen && modalPlace?.id) {
      getVisitCount(modalPlace.id).then((count) => {
        setVisitCount(count)
      })
    }
  }, [modalOpen, modalPlace?.id, getVisitCount])

  // ESC to close
  useEffect(() => {
    if (!modalOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [modalOpen, closeModal])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (modalOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [modalOpen])

  const handleFileSelect = useCallback((f: File, url: string, thumb?: File) => {
    setFile(f)
    setThumbFile(thumb ?? null)
    setPreviewUrl(url)
    setError(null)
  }, [])

  const handleError = useCallback((msg: string) => {
    setError(msg)
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    setTimeout(() => setError(null), 6000)
  }, [])

  const validate = useCallback((): boolean => {
    if (rating === null) {
      handleError(t('review.err.rating'))
      return false
    }
    if (!file) {
      handleError(t('review.err.photo'))
      return false
    }
    if (!reviewText.trim()) {
      handleError(t('review.err.text'))
      return false
    }
    return true
  }, [rating, file, reviewText, t, handleError])

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return
    if (!validate()) return
    if (!modalPlace) return

    const sb = getSupabase()
    if (!user) {
      handleError(t('review.err.login'))
      return
    }

    setIsSubmitting(true)

    try {
      // 1) Verify current user session
      const {
        data: { user: currentUser },
      } = await sb.auth.getUser()
      if (!currentUser) throw new Error(t('review.err.session'))

      // 2) Upload photo to Supabase Storage (1-year cache, immutable filenames)
      const ts = Date.now()
      const mainName = `${currentUser.id}/${ts}.jpg`
      const { data: uploadData, error: uploadErr } = await sb.storage
        .from('review-photos')
        .upload(mainName, file!, { cacheControl: '31536000', upsert: false })

      if (uploadErr) {
        throw new Error(t('review.err.upload', { 0: uploadErr.message }))
      }

      // Upload thumbnail alongside main image (best-effort)
      if (thumbFile) {
        const thumbName = `${currentUser.id}/${ts}_thumb.jpg`
        await sb.storage
          .from('review-photos')
          .upload(thumbName, thumbFile, { cacheControl: '31536000', upsert: false })
          .catch(() => {/* thumbnail upload failure is non-critical */})
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = sb.storage.from('review-photos').getPublicUrl(uploadData.path)

      // 3) Compute visit verification
      const placeLat = parseFloat(modalPlace.y || '0')
      const placeLng = parseFloat(modalPlace.x || '0')
      const nearby =
        geoLat !== null &&
        geoLng !== null &&
        isWithinVisitRange(geoLat, geoLng, placeLat, placeLng)

      // 4) Insert review into DB
      const { error: insertErr } = await sb.from('reviews').insert({
        user_id: currentUser.id,
        place_id: modalPlace.id,
        place_name: modalPlace.place_name,
        place_address: modalPlace.address_name || '',
        place_category: modalPlace.category_name || '',
        place_x: modalPlace.x || '',
        place_y: modalPlace.y || '',
        rating: rating!,
        review_text: reviewText.trim(),
        photo_url: publicUrl,
        visited_at: visitedAt,
        verified_visit: nearby,
      })

      if (insertErr) {
        throw new Error(t('review.err.insert', { 0: insertErr.message }))
      }

      // Success: invalidate cache, notify listeners, show toast, close modal
      invalidateCache()
      window.dispatchEvent(new CustomEvent('review:saved'))
      closeModal()
      showToast(t('review.saved'))
    } catch (err) {
      console.error('[ReviewModal]', err)
      const message =
        err instanceof Error ? err.message : t('review.err.generic')
      handleError(message)
      showToast(message, 5000)
    } finally {
      setIsSubmitting(false)
    }
  }, [
    isSubmitting,
    validate,
    modalPlace,
    user,
    file,
    thumbFile,
    rating,
    reviewText,
    visitedAt,
    geoLat,
    geoLng,
    t,
    handleError,
    invalidateCache,
    closeModal,
    showToast,
  ])

  if (!modalOpen || !modalPlace) return null

  const placeLat = parseFloat(modalPlace.y || '0')
  const placeLng = parseFloat(modalPlace.x || '0')
  const isNearby =
    geoLat !== null &&
    geoLng !== null &&
    isWithinVisitRange(geoLat, geoLng, placeLat, placeLng)

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[10001] bg-black/50 animate-fade-in"
        onClick={closeModal}
        aria-hidden
      />

      {/* Modal */}
      <div ref={scrollRef} className="fixed inset-x-0 bottom-0 z-[10002] max-h-[calc(100dvh-env(safe-area-inset-top,0px))] animate-slide-up overflow-y-auto rounded-t-2xl bg-surface shadow-2xl sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-h-[90vh] sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-4 py-3">
          <h2 className="font-serif text-lg font-semibold text-text-primary">
            {t('review.title')}
          </h2>
          <button
            type="button"
            onClick={closeModal}
            className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-bg"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 overflow-x-hidden p-4">
          {/* Error message — top of form for visibility */}
          {error && (
            <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
              {error}
            </div>
          )}

          {/* Place info */}
          <div>
            <h3 className="font-serif text-base font-semibold text-text-primary">
              {modalPlace.place_name}
            </h3>
            <p className="mt-0.5 text-xs text-text-muted">
              {[modalPlace.category_name, modalPlace.address_name]
                .filter(Boolean)
                .join(' \u00B7 ')}
            </p>
            {visitCount > 0 && (
              <span className="mt-1.5 inline-block rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent">
                {t('review.visitBadge', { 0: visitCount + 1 })}
              </span>
            )}
          </div>

          {/* Rating */}
          <div>
            <label className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-text-primary">
              {t('review.ratingLabel')}
              <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold text-accent">
                {t('review.required')}
              </span>
            </label>
            <RatingSelector value={rating} onChange={setRating} />
          </div>

          {/* Photo */}
          <div>
            <label className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-text-primary">
              {t('review.photoLabel')}
              <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold text-accent">
                {t('review.required')}
              </span>
            </label>
            <PhotoUploader
              file={file}
              previewUrl={previewUrl}
              onFileSelect={handleFileSelect}
              onError={handleError}
            />
          </div>

          {/* Review text */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-text-primary">
              {t('review.textLabel')}
            </label>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder={t('review.textPlaceholder')}
              rows={3}
              className="w-full resize-none rounded-xl border border-border bg-bg p-3 text-base text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
            />
          </div>

          {/* Date picker */}
          <div>
            <label className="mb-1 block text-sm font-semibold text-text-primary">
              {t('review.dateLabel')}
            </label>
            <p className="mb-2 text-xs text-text-muted">
              {t('review.dateHint')}
            </p>
            <DatePicker value={visitedAt} onChange={setVisitedAt} />
          </div>

          {/* GPS verification status */}
          {geoLoading && (
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              {t('review.gpsChecking')}
            </div>
          )}
          {!geoLoading && isNearby && (
            <div className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {t('review.gpsVerified')}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t border-border bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
          <div className="flex gap-3">
          <button
            type="button"
            onClick={closeModal}
            className="flex-1 rounded-xl border border-border bg-bg px-4 py-3 text-sm font-semibold text-text-primary transition-colors hover:bg-border"
          >
            {t('review.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? t('review.submitting') : t('review.submit')}
          </button>
          </div>
        </div>
      </div>
    </>
  )
}
