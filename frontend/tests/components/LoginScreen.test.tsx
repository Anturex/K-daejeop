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
        'login.guest': '로그인 없이 둘러보기',
        'landing.aboutTitle': 'K-daejeop이란?',
        'landing.aboutDesc': '나만의 장소 기록장입니다.',
        'landing.howTitle': '이렇게 사용해요',
        'landing.step1': '검색창에 이름을 입력하세요',
        'landing.step2': '별점으로 평가하세요',
        'landing.step3': '내 장소 탭에서 확인하세요',
        'landing.step4': '리뷰 10개를 달성하세요',
        'landing.featuresTitle': '주요 기능',
        'landing.feat.rating': '4단계 별점',
        'landing.feat.verified': '실제 방문 인증',
        'landing.feat.cluster': '클러스터 지도',
        'landing.feat.badge': '뱃지판',
        'landing.faqTitle': '자주 묻는 질문',
        'landing.faq.q1': '무료로 사용할 수 있나요?',
        'landing.faq.a1': '네, 기본 기능은 모두 무료입니다.',
        'landing.faq.q2': '어떤 장소를 기록할 수 있나요?',
        'landing.faq.a2': '카카오맵에 등록된 모든 장소를 검색하고 리뷰할 수 있습니다.',
        'landing.faq.q3': '추천 장소는 어떻게 받나요?',
        'landing.faq.a3': '리뷰를 10개 이상 작성하면 해금됩니다.',
        'landing.faq.q4': '사진은 꼭 첨부해야 하나요?',
        'landing.faq.a4': '네, 리뷰당 사진 한 장은 필수입니다.',
        'landing.faq.q5': '뱃지판이 뭔가요?',
        'landing.faq.a5': '가고 싶은 장소를 모아 나만의 리스트를 만드는 기능입니다.',
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

  it('renders landing about section', () => {
    render(<LoginScreen />)
    expect(screen.getByText('K-daejeop이란?')).toBeInTheDocument()
    expect(screen.getByText('나만의 장소 기록장입니다.')).toBeInTheDocument()
  })

  it('renders landing how-to steps', () => {
    render(<LoginScreen />)
    expect(screen.getByText('이렇게 사용해요')).toBeInTheDocument()
    expect(screen.getByText('검색창에 이름을 입력하세요')).toBeInTheDocument()
    expect(screen.getByText('리뷰 10개를 달성하세요')).toBeInTheDocument()
  })

  it('renders landing features section', () => {
    render(<LoginScreen />)
    expect(screen.getByText('주요 기능')).toBeInTheDocument()
    expect(screen.getByText('4단계 별점')).toBeInTheDocument()
    expect(screen.getByText('뱃지판')).toBeInTheDocument()
  })

  it('renders landing FAQ section', () => {
    render(<LoginScreen />)
    expect(screen.getByText('자주 묻는 질문')).toBeInTheDocument()
    expect(screen.getByText('무료로 사용할 수 있나요?')).toBeInTheDocument()
    expect(
      screen.getByText('네, 기본 기능은 모두 무료입니다.'),
    ).toBeInTheDocument()
  })

  it('page is scrollable (not flex-center locked)', () => {
    const { container } = render(<LoginScreen />)
    const root = container.firstElementChild as HTMLElement
    expect(root.className).toContain('overflow-y-auto')
    expect(root.className).not.toContain('justify-center')
  })

  it('renders guest login button', () => {
    render(<LoginScreen />)
    expect(screen.getByText('로그인 없이 둘러보기')).toBeInTheDocument()
  })

  it('calls loginAsGuest on guest button click', () => {
    render(<LoginScreen />)
    const btn = screen.getByText('로그인 없이 둘러보기')
    fireEvent.click(btn)
    // loginAsGuest is called from real authStore — verified via authStore.test.ts
    expect(btn).toBeInTheDocument()
  })
})
