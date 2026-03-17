import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { KakaoMap } from '../../src/components/Map/KakaoMap'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ko', changeLanguage: vi.fn() },
  }),
}))

vi.mock('../../src/services/kakao', () => ({
  loadKakaoSdk: vi.fn(() => new Promise(() => {})), // never resolves
}))

vi.mock('../../src/stores/mapStore', () => ({
  useMapStore: () => ({
    setMap: vi.fn(),
    map: null,
  }),
}))

vi.mock('../../src/stores/uiStore', () => ({
  useUiStore: Object.assign(
    (sel: (s: Record<string, unknown>) => unknown) =>
      sel({ showToast: vi.fn() }),
    { getState: () => ({ showToast: vi.fn() }) },
  ),
}))

vi.mock('../../src/hooks/useGeolocation', () => ({
  useGeolocation: () => ({
    lat: null,
    lng: null,
    error: null,
    loading: false,
    requestLocation: vi.fn(),
  }),
}))

describe('KakaoMap', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders map container with correct id', () => {
    render(<KakaoMap />)
    expect(document.getElementById('map')).toBeInTheDocument()
  })

  it('renders my location button', () => {
    render(<KakaoMap />)
    const btn = screen.getByRole('button', { name: 'map.myLocation' })
    expect(btn).toBeInTheDocument()
  })

  it('my location button has correct size for touch target', () => {
    render(<KakaoMap />)
    const btn = screen.getByRole('button', { name: 'map.myLocation' })
    expect(btn.className).toContain('h-11')
    expect(btn.className).toContain('w-11')
  })
})
