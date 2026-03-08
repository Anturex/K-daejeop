import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ReviewDetail } from '../../src/components/Reviews/ReviewDetail'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        'review.delete': '삭제',
        'review.viewDetail': '상세 페이지 보기',
        'review.deleteConfirm': '삭제하시겠습니까?',
        'review.verifiedVisit': '실제 방문',
        'review.deleted': '삭제됨',
        'review.avgRating': '평균 별점',
        'review.visits': `${opts?.['0'] ?? ''}회 방문`,
        'review.oldest': '최초',
        'review.newest': '최신',
      }
      return map[key] ?? key
    },
  }),
}))

const mockCloseDetail = vi.fn()
const mockSetDetailIndex = vi.fn()
const mockInvalidateCache = vi.fn()

// Mutable store data for per-test customization
let mockStoreData = {
  detailOpen: true,
  detailReviews: [
    {
      id: 'r1',
      user_id: 'u1',
      place_id: '12345',
      place_name: 'Test Restaurant',
      place_address: 'Seoul',
      place_category: 'FD6',
      place_x: '127.0',
      place_y: '37.5',
      lat: 37.5,
      lng: 127.0,
      rating: 3,
      review_text: 'Great food!',
      photo_url: null,
      verified_visit: false,
      visited_at: '2026-01-01',
      created_at: '2026-01-01T00:00:00Z',
    },
  ],
  detailIndex: 0,
}

vi.mock('../../src/stores/reviewStore', () => ({
  useReviewStore: () => ({
    ...mockStoreData,
    closeDetail: mockCloseDetail,
    setDetailIndex: mockSetDetailIndex,
    invalidateCache: mockInvalidateCache,
  }),
}))

let mockUserId = 'u1'

vi.mock('../../src/stores/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ user: { id: mockUserId } }),
}))

vi.mock('../../src/stores/uiStore', () => ({
  useUiStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ showToast: vi.fn() }),
}))

vi.mock('../../src/services/supabase', () => ({
  getSupabase: () => ({
    storage: { from: () => ({ remove: vi.fn() }) },
    from: () => ({ delete: () => ({ eq: () => ({ error: null }) }) }),
  }),
}))

describe('ReviewDetail — single review', () => {
  beforeEach(() => {
    mockUserId = 'u1'
    mockStoreData = {
      detailOpen: true,
      detailReviews: [
        {
          id: 'r1',
          user_id: 'u1',
          place_id: '12345',
          place_name: 'Test Restaurant',
          place_address: 'Seoul',
          place_category: 'FD6',
          place_x: '127.0',
          place_y: '37.5',
          lat: 37.5,
          lng: 127.0,
          rating: 3,
          review_text: 'Great food!',
          photo_url: null,
          verified_visit: false,
          visited_at: '2026-01-01',
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
      detailIndex: 0,
    }
  })

  it('renders view detail link with correct href', () => {
    render(<ReviewDetail />)
    const link = screen.getByText('상세 페이지 보기')
    expect(link).toBeInTheDocument()
    expect(link.closest('a')).toHaveAttribute(
      'href',
      'https://place.map.kakao.com/12345',
    )
    expect(link.closest('a')).toHaveAttribute('target', '_blank')
  })

  it('renders delete button', () => {
    render(<ReviewDetail />)
    expect(screen.getByText('삭제')).toBeInTheDocument()
  })

  it('renders place name in header', () => {
    render(<ReviewDetail />)
    expect(screen.getByText('Test Restaurant')).toBeInTheDocument()
  })

  it('renders review text', () => {
    render(<ReviewDetail />)
    expect(screen.getByText('Great food!')).toBeInTheDocument()
  })

  it('renders rating label for the review', () => {
    render(<ReviewDetail />)
    expect(screen.getByText(/\u2605\u2605\u2605/)).toBeInTheDocument()
  })

  it('does not render trend section for single review', () => {
    render(<ReviewDetail />)
    expect(screen.queryByText('평균 별점')).not.toBeInTheDocument()
  })

  it('hides delete button for other user review', () => {
    mockUserId = 'other-user'
    render(<ReviewDetail />)
    expect(screen.queryByText('삭제')).not.toBeInTheDocument()
  })

  it('shows delete button for own review', () => {
    mockUserId = 'u1'
    render(<ReviewDetail />)
    expect(screen.getByText('삭제')).toBeInTheDocument()
  })
})

describe('ReviewDetail — multiple reviews (rating trend)', () => {
  beforeEach(() => {
    mockStoreData = {
      detailOpen: true,
      detailReviews: [
        {
          id: 'r3',
          user_id: 'u1',
          place_id: '12345',
          place_name: 'Test Restaurant',
          place_address: 'Seoul',
          place_category: 'FD6',
          place_x: '127.0',
          place_y: '37.5',
          lat: 37.5,
          lng: 127.0,
          rating: 3,
          review_text: 'Amazing!',
          photo_url: null,
          verified_visit: true,
          visited_at: '2026-03-01',
          created_at: '2026-03-01T00:00:00Z',
        },
        {
          id: 'r2',
          user_id: 'u1',
          place_id: '12345',
          place_name: 'Test Restaurant',
          place_address: 'Seoul',
          place_category: 'FD6',
          place_x: '127.0',
          place_y: '37.5',
          lat: 37.5,
          lng: 127.0,
          rating: 2,
          review_text: 'Good',
          photo_url: null,
          verified_visit: false,
          visited_at: '2026-02-01',
          created_at: '2026-02-01T00:00:00Z',
        },
        {
          id: 'r1',
          user_id: 'u1',
          place_id: '12345',
          place_name: 'Test Restaurant',
          place_address: 'Seoul',
          place_category: 'FD6',
          place_x: '127.0',
          place_y: '37.5',
          lat: 37.5,
          lng: 127.0,
          rating: 1,
          review_text: 'Meh',
          photo_url: null,
          verified_visit: false,
          visited_at: '2026-01-01',
          created_at: '2026-01-01T00:00:00Z',
        },
      ],
      detailIndex: 0,
    }
  })

  it('renders average rating', () => {
    render(<ReviewDetail />)
    expect(screen.getByText('평균 별점')).toBeInTheDocument()
    // avg = (1+2+3)/3 = 2.0
    expect(screen.getByText('2.0')).toBeInTheDocument()
  })

  it('renders visit count', () => {
    render(<ReviewDetail />)
    expect(screen.getByText('3회 방문')).toBeInTheDocument()
  })

  it('renders oldest and newest labels', () => {
    render(<ReviewDetail />)
    expect(screen.getByText('최초')).toBeInTheDocument()
    expect(screen.getByText('최신')).toBeInTheDocument()
  })

  it('renders upward trend arrow for improving ratings', () => {
    render(<ReviewDetail />)
    // 1→2→3 = upward trend
    expect(screen.getByText('↗')).toBeInTheDocument()
  })
})
