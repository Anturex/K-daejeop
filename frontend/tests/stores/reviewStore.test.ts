import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useReviewStore, mapRawReview } from '../../src/stores/reviewStore'
import type { PlaceResult } from '../../src/services/api'

const mockPlace: PlaceResult = {
  id: 'p1',
  place_name: 'Test Restaurant',
  category_group_code: 'FD6',
  category_name: '음식점',
  address_name: '서울시 강남구',
  road_address_name: '서울시 강남구 테헤란로',
  x: '127.0',
  y: '37.5',
  phone: '',
  place_url: '',
}

describe('mapRawReview', () => {
  it('converts place_x/place_y strings to numeric lng/lat', () => {
    const raw = {
      id: 'r1',
      user_id: 'u1',
      place_id: 'p1',
      place_name: 'Test Place',
      place_address: '서울시',
      place_category: '음식점',
      place_x: '127.0276',
      place_y: '37.4979',
      rating: 3,
      review_text: 'Great',
      photo_url: null,
      visited_at: '2024-01-01',
      created_at: '2024-01-01T00:00:00Z',
    }
    const review = mapRawReview(raw)
    expect(review.lat).toBeCloseTo(37.4979)
    expect(review.lng).toBeCloseTo(127.0276)
    expect(review.place_name).toBe('Test Place')
  })

  it('defaults to 0 for missing place_x/place_y', () => {
    const raw = {
      id: 'r2',
      user_id: 'u1',
      place_id: 'p2',
      place_name: 'No Coords',
      place_address: '',
      place_category: '',
      place_x: '',
      place_y: '',
      rating: 1,
      review_text: '',
      photo_url: null,
      visited_at: '2024-01-01',
      created_at: '2024-01-01T00:00:00Z',
    }
    const review = mapRawReview(raw)
    expect(review.lat).toBe(0)
    expect(review.lng).toBe(0)
  })

  it('includes verified_visit as true when set', () => {
    const raw = {
      id: 'r3',
      user_id: 'u1',
      place_id: 'p1',
      place_name: 'Verified',
      place_address: '',
      place_category: '',
      place_x: '127.0',
      place_y: '37.5',
      rating: 2,
      review_text: '',
      photo_url: null,
      visited_at: '2024-01-01',
      created_at: '2024-01-01T00:00:00Z',
      verified_visit: true,
    }
    expect(mapRawReview(raw).verified_visit).toBe(true)
  })

  it('defaults verified_visit to false when missing', () => {
    const raw = {
      id: 'r4',
      user_id: 'u1',
      place_id: 'p1',
      place_name: 'Not verified',
      place_address: '',
      place_category: '',
      place_x: '127.0',
      place_y: '37.5',
      rating: 1,
      review_text: '',
      photo_url: null,
      visited_at: '2024-01-01',
      created_at: '2024-01-01T00:00:00Z',
    }
    expect(mapRawReview(raw).verified_visit).toBe(false)
  })
})

describe('reviewStore', () => {
  beforeEach(() => {
    useReviewStore.setState({
      modalOpen: false,
      modalPlace: null,
      detailOpen: false,
      detailReviews: [],
      detailIndex: 0,
      cachedReviews: null,
      cacheTimestamp: 0,
    })
  })

  describe('modal', () => {
    it('opens modal with place', () => {
      useReviewStore.getState().openModal(mockPlace)
      const state = useReviewStore.getState()
      expect(state.modalOpen).toBe(true)
      expect(state.modalPlace).toBe(mockPlace)
    })

    it('closes modal', () => {
      useReviewStore.getState().openModal(mockPlace)
      useReviewStore.getState().closeModal()
      const state = useReviewStore.getState()
      expect(state.modalOpen).toBe(false)
      expect(state.modalPlace).toBeNull()
    })
  })

  describe('detail', () => {
    it('opens detail with reviews', () => {
      const reviews = [{ id: 'r1' }, { id: 'r2' }] as never[]
      useReviewStore.getState().openDetail(reviews, 1)
      const state = useReviewStore.getState()
      expect(state.detailOpen).toBe(true)
      expect(state.detailReviews).toHaveLength(2)
      expect(state.detailIndex).toBe(1)
    })

    it('closes detail and resets', () => {
      useReviewStore.getState().openDetail([{} as never])
      useReviewStore.getState().closeDetail()
      const state = useReviewStore.getState()
      expect(state.detailOpen).toBe(false)
      expect(state.detailReviews).toHaveLength(0)
      expect(state.detailIndex).toBe(0)
    })
  })

  describe('cache', () => {
    it('sets cached reviews', () => {
      const reviews = [{ id: 'r1' }] as never[]
      useReviewStore.getState().setCachedReviews(reviews)
      const state = useReviewStore.getState()
      expect(state.cachedReviews).toHaveLength(1)
      expect(state.cacheTimestamp).toBeGreaterThan(0)
    })

    it('isCacheValid returns true within TTL', () => {
      useReviewStore.getState().setCachedReviews([])
      expect(useReviewStore.getState().isCacheValid()).toBe(true)
    })

    it('isCacheValid returns false after TTL', () => {
      useReviewStore.setState({
        cachedReviews: [],
        cacheTimestamp: Date.now() - 6 * 60_000, // 6 minutes ago
      })
      expect(useReviewStore.getState().isCacheValid()).toBe(false)
    })

    it('invalidateCache clears cache', () => {
      useReviewStore.getState().setCachedReviews([{ id: 'r1' }] as never[])
      useReviewStore.getState().invalidateCache()
      const state = useReviewStore.getState()
      expect(state.cachedReviews).toBeNull()
      expect(state.cacheTimestamp).toBe(0)
    })
  })
})
