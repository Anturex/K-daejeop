import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LoginModal } from '../../src/components/LoginModal'

const mockHandleGoogleLogin = vi.fn()
const mockSetShowLoginModal = vi.fn()

vi.mock('../../src/hooks/useAuth', () => ({
  useAuth: () => ({
    handleGoogleLogin: mockHandleGoogleLogin,
    isLoggingIn: false,
  }),
}))

vi.mock('../../src/stores/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ setShowLoginModal: mockSetShowLoginModal }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'login.subtitle': '나만의 맛집 지도',
        'login.feature.search': '음식점·카페·관광명소 검색',
        'login.feature.rating': '별점 리뷰 작성',
        'login.feature.unlock': '추천 장소 해금',
        'login.google': 'Google로 로그인',
        'loginPrompt.later': '나중에',
      }
      return map[key] ?? key
    },
    i18n: { language: 'ko', changeLanguage: vi.fn() },
  }),
  Trans: ({ i18nKey }: { i18nKey: string }) => <span>{i18nKey}</span>,
}))

vi.mock('../../src/components/LanguageSelector', () => ({
  LanguageSelector: () => <div data-testid="lang-selector" />,
}))

vi.mock('../../src/components/LoginScreen/LegalModal', () => ({
  LegalModal: () => <div data-testid="legal-modal" />,
}))

describe('LoginModal', () => {
  it('renders the app title', () => {
    render(<LoginModal />)
    expect(screen.getByText('K-daejeop')).toBeInTheDocument()
  })

  it('renders Google login button', () => {
    render(<LoginModal />)
    expect(screen.getByText('Google로 로그인')).toBeInTheDocument()
  })

  it('renders features', () => {
    render(<LoginModal />)
    expect(screen.getByText('음식점·카페·관광명소 검색')).toBeInTheDocument()
    expect(screen.getByText('별점 리뷰 작성')).toBeInTheDocument()
  })

  it('calls handleGoogleLogin and closes modal on button click', () => {
    render(<LoginModal />)
    fireEvent.click(screen.getByText('Google로 로그인'))
    expect(mockSetShowLoginModal).toHaveBeenCalledWith(false)
    expect(mockHandleGoogleLogin).toHaveBeenCalled()
  })

  it('closes on dismiss button click', () => {
    render(<LoginModal />)
    fireEvent.click(screen.getByText('나중에'))
    expect(mockSetShowLoginModal).toHaveBeenCalledWith(false)
  })

  it('closes on backdrop click', () => {
    const { container } = render(<LoginModal />)
    const backdrop = container.firstElementChild as HTMLElement
    fireEvent.click(backdrop)
    expect(mockSetShowLoginModal).toHaveBeenCalledWith(false)
  })
})
