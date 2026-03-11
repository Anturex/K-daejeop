import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type TouchEvent as ReactTouchEvent,
} from 'react'
import { useTranslation } from 'react-i18next'
import { useMapStore } from '../../stores/mapStore'
import { useReviewStore, type Review } from '../../stores/reviewStore'
import { useUiStore } from '../../stores/uiStore'
import { useAuthStore } from '../../stores/authStore'
import { useReviewedPlaces } from '../../hooks/useReviewedPlaces'
import { CategoryFilter } from './CategoryFilter'
import { RatingFilter } from './RatingFilter'
import { ClusterMap } from './ClusterMap'
import { AdBanner } from '../Ads/AdBanner'
import { getThumbUrl } from '../../utils/imageUrl'
import {
  groupByRegion,
  getFilteredReviews,
  computeCategoryCounts,
  computeRatingCounts,
  uniquePlaceCount,
  type RegionGroup,
} from './useCluster'

/* ===== Constants ===== */
const SWIPE_DISMISS_THRESHOLD = 120

/* ===== Place group for Level 1 drill-down ===== */
interface PlaceGroup {
  reviews: Review[]
  latest: Review
}

export function MyReviewsPanel() {
  const { t } = useTranslation()
  const map = useMapStore((s) => s.map)
  const clearMarkers = useMapStore((s) => s.clearMarkers)
  const { openDetail } = useReviewStore()
  const { showToast, setMyReviewsActive } = useUiStore()
  const tier = useAuthStore((s) => s.tier)
  const { getMyReviews } = useReviewedPlaces()

  /* ===== State ===== */
  const [allReviews, setAllReviews] = useState<Review[]>([])
  const [activeCategory, setActiveCategory] = useState('all')
  const [activeRating, setActiveRating] = useState('all')
  const [panelOpen, setPanelOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  // Drill-down: null = Level 0 (regions), string = Level 1 (region name)
  const [drillRegion, setDrillRegion] = useState<string | null>(null)
  const [drillPlaces, setDrillPlaces] = useState<PlaceGroup[]>([])

  const listRef = useRef<HTMLDivElement>(null)

  /* ===== Derived data ===== */
  const filtered = getFilteredReviews(allReviews, activeCategory, activeRating)
  const counts = computeCategoryCounts(allReviews)
  const ratingCounts = computeRatingCounts(allReviews, activeCategory)
  const totalUniquePlaces = uniquePlaceCount(filtered)
  const regionGroups = groupByRegion(filtered)

  /* ===== Load reviews on mount ===== */
  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      showToast(t('myReviews.title') + '...', 0)

      const data = await getMyReviews()

      if (cancelled) return

      if (!data) {
        showToast(t('myReviews.loadFail', '불러오기 실패'), 3000)
        setMyReviewsActive(false)
        return
      }

      setAllReviews(data)
      setLoading(false)
      setPanelOpen(true)

      if (data.length > 0) {
        showToast(`${t('myReviews.title')} ${data.length}${t('myReviews.countSuffix', '개')}`, 2500)
      }
    }

    load()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ===== Clear search markers on mount ===== */
  useEffect(() => {
    clearMarkers()
  }, [clearMarkers])

  /* ===== Listen for review:saved / review:deleted to refresh ===== */
  useEffect(() => {
    const handler = async () => {
      const data = await getMyReviews(true)
      if (data) setAllReviews(data)
    }

    window.addEventListener('review:saved', handler)
    window.addEventListener('review:deleted', handler)
    return () => {
      window.removeEventListener('review:saved', handler)
      window.removeEventListener('review:deleted', handler)
    }
  }, [getMyReviews])

  /* ===== Category change resets drill-down ===== */
  const handleCategorySelect = useCallback((cat: string) => {
    setActiveCategory(cat)
    setDrillRegion(null)
  }, [])

  /* ===== Rating change resets drill-down ===== */
  const handleRatingSelect = useCallback((rating: string) => {
    setActiveRating(rating)
    setDrillRegion(null)
  }, [])

  /* ===== Drill-down into region ===== */
  const handleRegionClick = useCallback(
    (group: RegionGroup) => {
      // Group items by place_id, sort each by visited_at desc
      const placeMap = new Map<string, Review[]>()
      for (const r of group.items) {
        const key = r.place_id || r.place_name || `${r.lat},${r.lng}`
        if (!placeMap.has(key)) placeMap.set(key, [])
        placeMap.get(key)!.push(r)
      }

      const places: PlaceGroup[] = Array.from(placeMap.values()).map(
        (revs) => {
          const sorted = revs.sort((a, b) =>
            (b.visited_at || '').localeCompare(a.visited_at || ''),
          )
          return { reviews: sorted, latest: sorted[0] }
        },
      )

      setDrillRegion(group.region)
      setDrillPlaces(places)

      if (listRef.current) listRef.current.scrollTop = 0
    },
    [],
  )

  /* ===== Place click: map center + detail ===== */
  const handlePlaceClick = useCallback(
    (placeGroup: PlaceGroup) => {
      const r = placeGroup.latest
      const lat = r.lat
      const lng = r.lng

      if (!isNaN(lat) && !isNaN(lng) && map) {
        map.setCenter(new kakao.maps.LatLng(lat, lng))
        map.setLevel(3)
      }

      openDetail(placeGroup.reviews, 0)
    },
    [map, openDetail],
  )

  /* ===== Back to Level 0 ===== */
  const handleBack = useCallback(() => {
    setDrillRegion(null)
    if (listRef.current) listRef.current.scrollTop = 0
  }, [])

  /* ===== Panel open/close ===== */
  const handleClose = useCallback(() => {
    setPanelOpen(false)
  }, [])

  const handleBackdropClick = useCallback(() => {
    setMyReviewsActive(false)
  }, [setMyReviewsActive])

  /* ===== Swipe to dismiss (touch) ===== */
  const panelRef = useRef<HTMLElement>(null)
  const swipeStartY = useRef(0)
  const swipeDragY = useRef(0)
  const swiping = useRef(false)

  const handleTouchStart = useCallback(
    (e: ReactTouchEvent<HTMLDivElement>) => {
      if (!panelOpen) return
      swipeStartY.current = e.touches[0].clientY
      swipeDragY.current = 0
      swiping.current = true
      if (panelRef.current) panelRef.current.style.transition = 'none'
    },
    [panelOpen],
  )

  const handleTouchMove = useCallback(
    (e: ReactTouchEvent<HTMLDivElement>) => {
      if (!swiping.current) return
      swipeDragY.current = Math.max(
        0,
        e.touches[0].clientY - swipeStartY.current,
      )
      if (panelRef.current) {
        panelRef.current.style.transform = `translateY(${swipeDragY.current}px)`
      }
    },
    [],
  )

  const handleTouchEnd = useCallback(() => {
    if (!swiping.current) return
    swiping.current = false
    if (panelRef.current) {
      panelRef.current.style.transition = ''
      panelRef.current.style.transform = ''
    }
    if (swipeDragY.current > SWIPE_DISMISS_THRESHOLD) {
      // Hide panel only (pins stay)
      setPanelOpen(false)
    }
  }, [])

  /* ===== Deactivate cleanup ===== */
  useEffect(() => {
    return () => {
      setActiveCategory('all')
      setActiveRating('all')
    }
  }, [])

  if (loading && allReviews.length === 0) return null

  return (
    <>
      {/* Cluster overlay manager (renders nothing to DOM) */}
      <ClusterMap
        allReviews={allReviews}
        activeCategory={activeCategory}
        activeRating={activeRating}
        isActive={true}
      />

      {/* Mobile backdrop */}
      {panelOpen && (
        <div
          className="fixed inset-0 z-[9000] bg-black/30 backdrop-blur-[2px] transition-opacity sm:hidden"
          onClick={handleBackdropClick}
        />
      )}

      {/* Side panel */}
      <aside
        ref={panelRef}
        className={`absolute right-0 top-0 z-[9001] flex h-full w-[320px] flex-col bg-surface shadow-xl transition-transform duration-300 ease-out max-sm:bottom-0 max-sm:left-0 max-sm:right-0 max-sm:top-auto max-sm:h-[60vh] max-sm:w-full max-sm:rounded-t-2xl ${
          panelOpen
            ? 'translate-x-0 max-sm:translate-y-0'
            : 'translate-x-full max-sm:translate-x-0 max-sm:translate-y-full'
        }`}
      >
        {/* Header (drag handle on mobile) */}
        <div
          className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Mobile drag indicator */}
          <div className="absolute left-1/2 top-1.5 h-1 w-8 -translate-x-1/2 rounded-full bg-border sm:hidden" />

          <div className="flex items-center gap-2">
            <h2 className="font-serif text-base font-bold text-dark">
              {t('myReviews.title')}
            </h2>
            <span className="text-xs text-text-muted">
              {drillRegion
                ? `${drillPlaces.length}${t('myReviews.placesSuffix', '곳')}`
                : `${t('myReviews.totalPrefix', '총')} ${totalUniquePlaces}${t('myReviews.placesSuffix', '곳')}`}
            </span>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-border/30 hover:text-dark"
            aria-label="Close"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Category filter chips */}
        <CategoryFilter
          activeCategory={activeCategory}
          counts={counts}
          onSelect={handleCategorySelect}
        />

        {/* Rating filter chips */}
        <RatingFilter
          activeRating={activeRating}
          counts={ratingCounts}
          onSelect={handleRatingSelect}
        />

        {/* Scrollable list */}
        <div ref={listRef} className="flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom,0px)]">
          {allReviews.length === 0 ? (
            /* ===== Empty state ===== */
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
              <span className="text-4xl">📍</span>
              <p className="text-sm font-semibold text-dark">
                {t('myReviews.emptyTitle', '아직 리뷰가 없어요')}
              </p>
              <p className="text-xs leading-relaxed text-text-muted">
                {t('myReviews.emptyDesc', '장소를 검색하고 리뷰를 남기면\n여기에 내 맛집이 모여요!')}
              </p>
            </div>
          ) : drillRegion === null ? (
            /* ===== Level 0: Region groups ===== */
            <RegionList
              groups={regionGroups}
              onRegionClick={handleRegionClick}
            />
          ) : (
            /* ===== Level 1: Places in region ===== */
            <PlaceList
              region={drillRegion}
              places={drillPlaces}
              onBack={handleBack}
              onPlaceClick={handlePlaceClick}
            />
          )}

          {/* Ad slot at bottom of scroll area */}
          {tier === 'free' && <AdBanner position="panel" />}
        </div>
      </aside>
    </>
  )
}

/* ===== Level 0: Region groups ===== */
interface RegionListProps {
  groups: RegionGroup[]
  onRegionClick: (group: RegionGroup) => void
}

function RegionList({ groups, onRegionClick }: RegionListProps) {
  return (
    <div className="divide-y divide-border/50">
      {groups.map((group) => {
        // Deduplicate photos by place_id
        const seenPlaces = new Set<string>()
        const uniquePhotos = group.items.filter((r) => {
          const key = r.place_id || `${r.lat},${r.lng}`
          if (seenPlaces.has(key)) return false
          seenPlaces.add(key)
          return true
        })
        const photos = uniquePhotos.slice(0, 4)
        const regionPlaceCount = seenPlaces.size

        return (
          <button
            key={group.region}
            type="button"
            onClick={() => onRegionClick(group)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-bg active:bg-border/20"
          >
            {/* Photo thumbnails */}
            <div className="flex shrink-0 -space-x-1.5">
              {photos.map((r, i) => (
                <img
                  key={r.id || i}
                  src={getThumbUrl(r.photo_url)}
                  alt=""
                  loading="lazy"
                  className="h-10 w-10 rounded-lg border-2 border-surface object-cover shadow-sm"
                  style={{ zIndex: photos.length - i }}
                  onError={(e) => { const img = e.currentTarget; img.onerror = null; img.src = r.photo_url ?? '' }}
                />
              ))}
            </div>

            {/* Region info */}
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-semibold text-dark">
                {group.region}
              </span>
              <span className="text-xs text-text-muted">
                {regionPlaceCount}곳
              </span>
            </div>

            {/* Arrow */}
            <svg
              className="h-4 w-4 shrink-0 text-text-muted"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        )
      })}
    </div>
  )
}

/* ===== Level 1: Places in region ===== */
interface PlaceListProps {
  region: string
  places: PlaceGroup[]
  onBack: () => void
  onPlaceClick: (place: PlaceGroup) => void
}

function PlaceList({ region, places, onBack, onPlaceClick }: PlaceListProps) {
  const { t } = useTranslation()

  return (
    <div>
      {/* Back button + region title */}
      <div className="flex items-center gap-2 border-b border-border/50 px-4 py-2.5">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-xs font-semibold text-accent transition-colors hover:text-accent-dark"
        >
          <svg
            className="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          {t('myReviews.allRegions', '전체 지역')}
        </button>
        <span className="font-serif text-sm font-semibold text-dark">
          {region}
        </span>
      </div>

      {/* Place list */}
      <div className="divide-y divide-border/50">
        {places.map((pg, i) => {
          const r = pg.latest
          const hasMultiple = pg.reviews.length > 1
          const stars = r.rating === 0
            ? '\u2715'
            : '\u2605'.repeat(r.rating) + '\u2606'.repeat(3 - r.rating)

          return (
            <button
              key={r.place_id || r.id || i}
              type="button"
              onClick={() => onPlaceClick(pg)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-bg active:bg-border/20"
            >
              <img
                src={getThumbUrl(r.photo_url)}
                alt=""
                loading="lazy"
                className="h-12 w-12 shrink-0 rounded-lg object-cover shadow-sm"
                onError={(e) => { const img = e.currentTarget; img.onerror = null; img.src = r.photo_url ?? '' }}
              />

              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-sm font-semibold text-dark">
                  {r.place_name || ''}
                </span>
                <span className={`text-xs ${r.rating === 0 ? 'text-danger' : 'text-star'}`}>{stars}</span>
                {hasMultiple && (
                  <span className="text-[11px] text-text-muted">
                    {pg.reviews.length}
                    {t('myReviews.visitsSuffix', '번 방문')}
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
