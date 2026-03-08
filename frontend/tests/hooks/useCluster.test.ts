import { describe, it, expect } from 'vitest'
import {
  classifyCategory,
  getFilteredReviews,
  computeRatingCounts,
  computeCategoryCounts,
  extractRegion,
  uniquePlaceCount,
} from '../../src/components/MyReviews/useCluster'
import type { Review } from '../../src/stores/reviewStore'

function makeReview(overrides: Partial<Review> = {}): Review {
  return {
    id: 'r1',
    user_id: 'u1',
    place_id: 'p1',
    place_name: 'Test Place',
    place_address: '서울특별시 강남구',
    place_category: '음식점',
    place_x: '127.0',
    place_y: '37.5',
    lat: 37.5,
    lng: 127.0,
    rating: 3,
    review_text: 'Great',
    photo_url: 'https://example.com/photo.jpg',
    verified_visit: false,
    visited_at: '2026-03-01',
    created_at: '2026-03-01T00:00:00Z',
    ...overrides,
  }
}

describe('classifyCategory', () => {
  it('classifies 음식점', () => {
    expect(classifyCategory('음식점')).toBe('restaurant')
  })

  it('classifies 카페 from hierarchical path', () => {
    expect(classifyCategory('음식점 > 카페 > 커피전문점')).toBe('cafe')
  })

  it('classifies 관광명소', () => {
    expect(classifyCategory('관광명소')).toBe('attraction')
  })

  it('returns etc for unknown', () => {
    expect(classifyCategory('숙박')).toBe('etc')
  })

  it('returns etc for null/undefined', () => {
    expect(classifyCategory(null)).toBe('etc')
    expect(classifyCategory(undefined)).toBe('etc')
  })
})

describe('getFilteredReviews — latest review per place', () => {
  // allReviews sorted by created_at desc (newest first), matching DB query
  const reviews = [
    makeReview({ id: 'r3', place_id: 'p1', rating: 3, created_at: '2026-03-01T00:00:00Z', visited_at: '2026-03-01' }),
    makeReview({ id: 'r2', place_id: 'p1', rating: 2, created_at: '2026-02-01T00:00:00Z', visited_at: '2026-02-01' }),
    makeReview({ id: 'r1', place_id: 'p1', rating: 1, created_at: '2026-01-01T00:00:00Z', visited_at: '2026-01-01' }),
    makeReview({ id: 'r4', place_id: 'p2', rating: 1, place_name: 'Other Place' }),
  ]

  it('returns all reviews when no filter active', () => {
    const result = getFilteredReviews(reviews, 'all', 'all')
    expect(result).toHaveLength(4)
  })

  it('filters by latest rating — rating 3 includes all reviews for place p1', () => {
    const result = getFilteredReviews(reviews, 'all', '3')
    // p1 latest is rating 3 → include all 3 reviews for p1
    // p2 latest is rating 1 → exclude
    expect(result).toHaveLength(3)
    expect(result.every((r) => r.place_id === 'p1')).toBe(true)
  })

  it('filters by latest rating — rating 2 excludes place with latest 3', () => {
    const result = getFilteredReviews(reviews, 'all', '2')
    // p1 latest is 3, not 2 → excluded
    // p2 latest is 1, not 2 → excluded
    expect(result).toHaveLength(0)
  })

  it('filters by latest rating — rating 1 includes only p2', () => {
    const result = getFilteredReviews(reviews, 'all', '1')
    expect(result).toHaveLength(1)
    expect(result[0].place_id).toBe('p2')
  })

  it('filters by category using latest review', () => {
    const mixedReviews = [
      makeReview({ id: 'r1', place_id: 'p1', place_category: '음식점 > 카페', rating: 3 }),
      makeReview({ id: 'r2', place_id: 'p2', place_category: '음식점', rating: 2 }),
    ]
    const result = getFilteredReviews(mixedReviews, 'cafe', 'all')
    expect(result).toHaveLength(1)
    expect(result[0].place_id).toBe('p1')
  })

  it('combines category + rating filter using latest review', () => {
    const mixedReviews = [
      makeReview({ id: 'r1', place_id: 'p1', place_category: '음식점 > 카페', rating: 3 }),
      makeReview({ id: 'r2', place_id: 'p2', place_category: '음식점 > 카페', rating: 1 }),
      makeReview({ id: 'r3', place_id: 'p3', place_category: '음식점', rating: 3 }),
    ]
    const result = getFilteredReviews(mixedReviews, 'cafe', '3')
    expect(result).toHaveLength(1)
    expect(result[0].place_id).toBe('p1')
  })
})

describe('computeRatingCounts', () => {
  it('counts unique places by first (latest) rating', () => {
    const reviews = [
      makeReview({ id: 'r3', place_id: 'p1', rating: 3 }),
      makeReview({ id: 'r2', place_id: 'p1', rating: 2 }),
      makeReview({ id: 'r1', place_id: 'p2', rating: 1 }),
    ]
    const counts = computeRatingCounts(reviews, 'all')
    expect(counts.all).toBe(2)
    expect(counts['3']).toBe(1) // p1 counted as 3 (latest)
    expect(counts['2']).toBe(0) // p1 NOT double-counted
    expect(counts['1']).toBe(1) // p2
  })
})

describe('computeCategoryCounts', () => {
  it('counts unique places by first (latest) category', () => {
    const reviews = [
      makeReview({ id: 'r1', place_id: 'p1', place_category: '음식점 > 카페' }),
      makeReview({ id: 'r2', place_id: 'p1', place_category: '음식점 > 카페' }),
      makeReview({ id: 'r3', place_id: 'p2', place_category: '음식점' }),
    ]
    const counts = computeCategoryCounts(reviews)
    expect(counts.all).toBe(2)
    expect(counts.cafe).toBe(1)
    expect(counts.restaurant).toBe(1)
  })
})

describe('extractRegion', () => {
  it('extracts first two words', () => {
    expect(extractRegion('서울특별시 강남구 역삼동')).toBe('서울특별시 강남구')
  })

  it('returns 기타 for null', () => {
    expect(extractRegion(null)).toBe('기타')
  })
})

describe('uniquePlaceCount', () => {
  it('counts unique place_ids', () => {
    const reviews = [
      makeReview({ place_id: 'p1' }),
      makeReview({ place_id: 'p1', id: 'r2' }),
      makeReview({ place_id: 'p2', id: 'r3' }),
    ]
    expect(uniquePlaceCount(reviews)).toBe(2)
  })
})
