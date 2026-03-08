import { describe, it, expect } from 'vitest'
import { buildReviewPin } from '../../src/utils/buildReviewPin'
import type { Review } from '../../src/stores/reviewStore'

function makeReview(overrides: Partial<Review> = {}): Review {
  return {
    id: 'r1',
    user_id: 'u1',
    place_id: 'p1',
    place_name: '멘야하나비',
    place_address: '서울 강남구',
    place_category: '음식점',
    place_x: '127.0',
    place_y: '37.5',
    lat: 37.5,
    lng: 127.0,
    rating: 2,
    review_text: '맛있다',
    photo_url: 'https://example.com/photo.jpg',
    verified_visit: false,
    visited_at: '2026-03-01',
    created_at: '2026-03-01T00:00:00Z',
    ...overrides,
  }
}

describe('buildReviewPin', () => {
  it('returns a div element with rv-pin class', () => {
    const el = buildReviewPin(makeReview())
    expect(el.tagName).toBe('DIV')
    expect(el.className).toContain('rv-pin')
  })

  it('shows place name', () => {
    const el = buildReviewPin(makeReview())
    expect(el.innerHTML).toContain('멘야하나비')
  })

  it('shows star rating', () => {
    const el = buildReviewPin(makeReview({ rating: 2 }))
    expect(el.innerHTML).toContain('★★☆')
  })

  it('shows X for rating 0', () => {
    const el = buildReviewPin(makeReview({ rating: 0 }))
    expect(el.innerHTML).toContain('✕')
  })

  it('shows verified badge when verified', () => {
    const el = buildReviewPin(makeReview({ verified_visit: true }))
    expect(el.innerHTML).toContain('rv-pin__verified')
  })

  it('hides verified badge when not verified', () => {
    const el = buildReviewPin(makeReview({ verified_visit: false }))
    expect(el.innerHTML).not.toContain('rv-pin__verified')
  })

  it('adds short-name class for short names', () => {
    const el = buildReviewPin(makeReview({ place_name: '라멘' }))
    expect(el.className).toContain('rv-pin--short-name')
  })
})
