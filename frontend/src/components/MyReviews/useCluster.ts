import { useCallback, useRef } from 'react'
import type { Review } from '../../stores/reviewStore'

/* ===== Constants ===== */
export const ANIM_MS = 380
export const MAX_CLUSTER_PHOTOS = 4

/**
 * Zoom-level grid sizes (degrees).
 * Kakao Maps: level 1 = most zoomed-in, level 14 = most zoomed-out.
 * Grid value 0 means individual pins (no clustering).
 */
export const GRID_DEG = [
  0,     // 0  unused
  0,     // 1  individual pins
  0,     // 2  individual pins
  0.003, // 3
  0.006, // 4
  0.012, // 5
  0.025, // 6
  0.05,  // 7  neighborhood level
  0.1,   // 8
  0.2,   // 9  city level
  0.3,   // 10
  0.8,   // 11
  1.6,   // 12 (default, national view)
  3.2,   // 13
  6.4,   // 14
]

/* ===== Category classification ===== */
const CATEGORY_KEYWORDS: [string, string][] = [
  ['카페', 'cafe'],
  ['음식점', 'restaurant'],
  ['관광명소', 'attraction'],
  ['관광', 'attraction'],
]

export function classifyCategory(placeCat: string | undefined | null): string {
  if (!placeCat) return 'etc'
  for (const [keyword, cat] of CATEGORY_KEYWORDS) {
    if (placeCat.includes(keyword)) return cat
  }
  return 'etc'
}

/* ===== Region extraction ===== */
/** "경기도 김포시 운양동 …" → "경기도 김포시" */
export function extractRegion(address: string | undefined | null): string {
  if (!address) return '기타'
  const parts = address.trim().split(/\s+/)
  return parts.length >= 2 ? `${parts[0]} ${parts[1]}` : parts[0] || '기타'
}

/* ===== Types ===== */
export interface Cluster {
  reviews: Review[]
  lat: number
  lng: number
  overlay: kakao.maps.CustomOverlay | null
  element: HTMLDivElement | null
}

export interface RegionGroup {
  region: string
  items: Review[]
}

/* ===== Clustering logic ===== */
function getGridDeg(level: number): number {
  return GRID_DEG[Math.max(0, Math.min(14, level))] ?? 0.1
}

export function computeClusters(
  reviews: Review[],
  map: kakao.maps.Map | null,
): Cluster[] {
  if (!map || !reviews.length) return []

  const level = map.getLevel()
  const grid = getGridDeg(level)

  if (grid === 0) {
    // Most zoomed-in: individual pins (merge same place_id)
    const placeMap = new Map<string, { reviews: Review[]; lat: number; lng: number }>()

    for (const r of reviews) {
      const lat = r.lat
      const lng = r.lng
      if (isNaN(lat) || isNaN(lng)) continue

      const key = r.place_id || `${lat},${lng}`
      if (!placeMap.has(key)) placeMap.set(key, { reviews: [], lat, lng })
      placeMap.get(key)!.reviews.push(r)
    }

    return Array.from(placeMap.values()).map(({ reviews: revs, lat, lng }) => ({
      reviews: revs.sort((a, b) =>
        (b.visited_at || '').localeCompare(a.visited_at || ''),
      ),
      lat,
      lng,
      overlay: null,
      element: null,
    }))
  }

  // Grid-cell based grouping
  const cellMap = new Map<
    string,
    { reviews: Review[]; sumLat: number; sumLng: number }
  >()

  for (const review of reviews) {
    const lat = review.lat
    const lng = review.lng
    if (isNaN(lat) || isNaN(lng)) continue

    const key = `${Math.floor(lat / grid)},${Math.floor(lng / grid)}`
    if (!cellMap.has(key))
      cellMap.set(key, { reviews: [], sumLat: 0, sumLng: 0 })
    const cell = cellMap.get(key)!
    cell.reviews.push(review)
    cell.sumLat += lat
    cell.sumLng += lng
  }

  return Array.from(cellMap.values()).map((cell) => ({
    reviews: cell.reviews.sort((a, b) =>
      (b.visited_at || '').localeCompare(a.visited_at || ''),
    ),
    lat: cell.sumLat / cell.reviews.length,
    lng: cell.sumLng / cell.reviews.length,
    overlay: null,
    element: null,
  }))
}

/* ===== Region grouping ===== */
export function groupByRegion(reviews: Review[]): RegionGroup[] {
  const map = new Map<string, Review[]>()

  for (const r of reviews) {
    const region = extractRegion(r.place_address)
    if (!map.has(region)) map.set(region, [])
    map.get(region)!.push(r)
  }

  return Array.from(map.entries())
    .sort((a, b) => {
      const countA = new Set(
        a[1].map((r) => r.place_id || `${r.lat},${r.lng}`),
      ).size
      const countB = new Set(
        b[1].map((r) => r.place_id || `${r.lat},${r.lng}`),
      ).size
      return countB - countA
    })
    .map(([region, items]) => ({ region, items }))
}

/* ===== Category + Rating filtered reviews ===== */
/**
 * Filter reviews by category and rating based on the **latest** review per place.
 * Returns ALL reviews for matching places (so detail view can show history).
 * Assumes `allReviews` is sorted by created_at desc (newest first).
 */
export function getFilteredReviews(
  allReviews: Review[],
  activeCategory: string,
  activeRating: string = 'all',
): Review[] {
  if (activeCategory === 'all' && activeRating === 'all') return allReviews

  // Group by place
  const placeMap = new Map<string, Review[]>()
  for (const r of allReviews) {
    const key = r.place_id || `${r.lat},${r.lng}`
    if (!placeMap.has(key)) placeMap.set(key, [])
    placeMap.get(key)!.push(r)
  }

  // Filter places based on latest review, return all reviews for matching places
  const result: Review[] = []
  for (const reviews of placeMap.values()) {
    const latest = reviews[0]
    if (activeCategory !== 'all' && classifyCategory(latest.place_category) !== activeCategory) continue
    if (activeRating !== 'all' && latest.rating !== Number(activeRating)) continue
    result.push(...reviews)
  }
  return result
}

/* ===== Category badge counts ===== */
export interface CategoryCounts {
  all: number
  restaurant: number
  cafe: number
  attraction: number
  etc: number
}

export function computeCategoryCounts(allReviews: Review[]): CategoryCounts {
  const counts: CategoryCounts = {
    all: 0,
    restaurant: 0,
    cafe: 0,
    attraction: 0,
    etc: 0,
  }
  const seen = new Set<string>()

  for (const r of allReviews) {
    const key = r.place_id || `${r.lat},${r.lng}`
    if (seen.has(key)) continue
    seen.add(key)
    counts.all++
    const cat = classifyCategory(r.place_category) as keyof CategoryCounts
    if (cat in counts) counts[cat]++
  }

  return counts
}

/* ===== Rating badge counts ===== */
export interface RatingCounts {
  all: number
  '0': number
  '1': number
  '2': number
  '3': number
}

export function computeRatingCounts(
  allReviews: Review[],
  activeCategory: string,
): RatingCounts {
  const catFiltered =
    activeCategory === 'all'
      ? allReviews
      : allReviews.filter(
          (r) => classifyCategory(r.place_category) === activeCategory,
        )

  const counts: RatingCounts = { all: 0, '0': 0, '1': 0, '2': 0, '3': 0 }
  const seen = new Set<string>()

  for (const r of catFiltered) {
    const key = r.place_id || `${r.lat},${r.lng}`
    if (seen.has(key)) continue
    seen.add(key)
    counts.all++
    const rKey = String(r.rating) as keyof RatingCounts
    if (rKey in counts) counts[rKey]++
  }

  return counts
}

/* ===== Unique place count for filtered reviews ===== */
export function uniquePlaceCount(reviews: Review[]): number {
  return new Set(
    reviews.map((r) => r.place_id || `${r.lat},${r.lng}`),
  ).size
}

/* ===== Hook: cluster lifecycle tracking ===== */
export function useCluster() {
  const activeClustersRef = useRef<Cluster[]>([])
  const initialRenderDoneRef = useRef(false)
  const zoomDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearClusters = useCallback(() => {
    for (const c of activeClustersRef.current) {
      c.overlay?.setMap(null)
    }
    activeClustersRef.current = []
  }, [])

  const setActiveClusters = useCallback((clusters: Cluster[]) => {
    activeClustersRef.current = clusters
  }, [])

  const getActiveClusters = useCallback(() => {
    return activeClustersRef.current
  }, [])

  return {
    activeClustersRef,
    initialRenderDoneRef,
    zoomDebounceRef,
    clearClusters,
    setActiveClusters,
    getActiveClusters,
  }
}
