import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LoginScreen } from '../../src/components/LoginScreen/LoginScreen'

const mockHandleGoogleLogin = vi.fn()

// Mock useAuth hook
vi.mock('../../src/hooks/useAuth', () => ({
  useAuth: () => ({
    handleGoogleLogin: mockHandleGoogleLogin,
    isLoggingIn: false,
    logout: vi.fn(),
  }),
}))

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'login.subtitle': '나만의 맛집 지도',
        'login.feature.search': '음식점·카페·관광명소 검색',
        'login.feature.rating': '별점 리뷰 작성',
        'login.feature.unlock': '추천 장소 해금',
        'login.google': 'Google로 로그인',
      }
      return map[key] ?? key
    },
    i18n: { language: 'ko', changeLanguage: vi.fn() },
  }),
  Trans: ({ i18nKey }: { i18nKey: string }) => <span>{i18nKey}</span>,
}))

// Mock LanguageSelector
vi.mock('../../src/components/LanguageSelector', () => ({
  LanguageSelector: () => <div data-testid="lang-selector" />,
}))

describe('LoginScreen', () => {
  it('renders the app title', () => {
    render(<LoginScreen />)
    expect(screen.getByText('K-daejeop')).toBeInTheDocument()
  })

  it('renders Google login button', () => {
    render(<LoginScreen />)
    expect(screen.getByText('Google로 로그인')).toBeInTheDocument()
  })

  it('renders service features', () => {
    render(<LoginScreen />)
    expect(screen.getByText('음식점·카페·관광명소 검색')).toBeInTheDocument()
    expect(screen.getByText('별점 리뷰 작성')).toBeInTheDocument()
    expect(screen.getByText('추천 장소 해금')).toBeInTheDocument()
  })

  it('calls handleGoogleLogin on button click', () => {
    render(<LoginScreen />)
    fireEvent.click(screen.getByText('Google로 로그인'))
    expect(mockHandleGoogleLogin).toHaveBeenCalled()
  })

  it('renders language selector', () => {
    render(<LoginScreen />)
    expect(screen.getByTestId('lang-selector')).toBeInTheDocument()
  })
})
