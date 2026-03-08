import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { MyReviewsPanel } from '../../src/components/MyReviews/MyReviewsPanel'

const mockClearMarkers = vi.fn()

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}))

vi.mock('../../src/stores/mapStore', () => ({
  useMapStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ map: null, clearMarkers: mockClearMarkers }),
}))

vi.mock('../../src/stores/reviewStore', () => ({
  useReviewStore: () => ({
    openDetail: vi.fn(),
  }),
}))

vi.mock('../../src/stores/uiStore', () => ({
  useUiStore: () => ({
    showToast: vi.fn(),
    setMyReviewsActive: vi.fn(),
  }),
}))

vi.mock('../../src/stores/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ tier: 'free' }),
}))

vi.mock('../../src/hooks/useReviewedPlaces', () => ({
  useReviewedPlaces: () => ({
    getMyReviews: vi.fn().mockResolvedValue([]),
  }),
}))

vi.mock('../../src/components/MyReviews/ClusterMap', () => ({
  ClusterMap: () => null,
}))

vi.mock('../../src/components/MyReviews/CategoryFilter', () => ({
  CategoryFilter: () => null,
}))

vi.mock('../../src/components/MyReviews/RatingFilter', () => ({
  RatingFilter: () => null,
}))

vi.mock('../../src/components/Ads/AdBanner', () => ({
  AdBanner: () => null,
}))

describe('MyReviewsPanel', () => {
  it('calls clearMarkers on mount', () => {
    render(<MyReviewsPanel />)
    expect(mockClearMarkers).toHaveBeenCalled()
  })
})
