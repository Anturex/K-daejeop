import { create } from 'zustand'
import type { PlaceResult } from '../services/api'
import { useAuthStore } from './authStore'
import { useUiStore } from './uiStore'

export interface Review {
  id: string
  user_id: string
  place_id: string
  place_name: string
  place_address: string
  place_category: string
  place_x: string
  place_y: string
  lat: number
  lng: number
  rating: number
  review_text: string
  photo_url: string | null
  verified_visit: boolean
  visited_at: string
  created_at: string
}

/** Map raw Supabase row to Review with numeric lat/lng */
export function mapRawReview(raw: Record<string, unknown>): Review {
  return {
    ...(raw as unknown as Review),
    lat: parseFloat((raw.place_y as string) || '0'),
    lng: parseFloat((raw.place_x as string) || '0'),
    verified_visit: Boolean(raw.verified_visit),
  }
}

const CACHE_TTL = 5 * 60_000 // 5 minutes

interface ReviewState {
  // Review modal
  modalOpen: boolean
  modalPlace: PlaceResult | null
  openModal: (place: PlaceResult) => void
  closeModal: () => void

  // Review detail bottom sheet
  detailOpen: boolean
  detailReviews: Review[]
  detailIndex: number
  openDetail: (reviews: Review[], index?: number) => void
  closeDetail: () => void
  setDetailIndex: (index: number) => void

  // Review cache
  cachedReviews: Review[] | null
  cacheTimestamp: number
  setCachedReviews: (reviews: Review[]) => void
  invalidateCache: () => void
  isCacheValid: () => boolean
}

export const useReviewStore = create<ReviewState>((set, get) => ({
  // Modal
  modalOpen: false,
  modalPlace: null,
  openModal: (place) => {
    if (useAuthStore.getState().isGuest) {
      useUiStore.getState().showToast('Google 로그인 후 리뷰를 남길 수 있습니다')
      return
    }
    set({ modalOpen: true, modalPlace: place })
  },
  closeModal: () => set({ modalOpen: false, modalPlace: null }),

  // Detail
  detailOpen: false,
  detailReviews: [],
  detailIndex: 0,
  openDetail: (reviews, index = 0) =>
    set({ detailOpen: true, detailReviews: reviews, detailIndex: index }),
  closeDetail: () =>
    set({ detailOpen: false, detailReviews: [], detailIndex: 0 }),
  setDetailIndex: (index) => set({ detailIndex: index }),

  // Cache
  cachedReviews: null,
  cacheTimestamp: 0,
  setCachedReviews: (reviews) =>
    set({ cachedReviews: reviews, cacheTimestamp: Date.now() }),
  invalidateCache: () => set({ cachedReviews: null, cacheTimestamp: 0 }),
  isCacheValid: () => {
    const { cachedReviews, cacheTimestamp } = get()
    return cachedReviews !== null && Date.now() - cacheTimestamp < CACHE_TTL
  },
}))
