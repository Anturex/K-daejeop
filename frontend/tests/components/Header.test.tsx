import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Header } from '../../src/components/Header/Header'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'myReviews.title': '내 맛집',
      }
      return map[key] ?? key
    },
    i18n: { language: 'ko', changeLanguage: vi.fn() },
  }),
}))

vi.mock('../../src/stores/uiStore', () => ({
  useUiStore: () => ({
    myReviewsActive: false,
    setMyReviewsActive: vi.fn(),
  }),
}))

vi.mock('../../src/components/Header/SearchBar', () => ({
  SearchBar: () => <input data-testid="search-bar" />,
}))

vi.mock('../../src/components/Header/UserMenu', () => ({
  UserMenu: () => <div data-testid="user-menu" />,
}))

describe('Header', () => {
  it('renders brand logo as a button', () => {
    render(<Header />)
    const brandBtn = screen.getByRole('button', { name: /K-daejeop/i })
    expect(brandBtn).toBeInTheDocument()
  })

  it('renders brand icon image', () => {
    render(<Header />)
    const img = screen.getByAltText('K-daejeop')
    expect(img).toHaveAttribute('src', '/icon-256.png')
  })

  it('renders search bar', () => {
    render(<Header />)
    expect(screen.getByTestId('search-bar')).toBeInTheDocument()
  })

  it('renders my reviews toggle button', () => {
    render(<Header />)
    expect(screen.getByText('내 맛집')).toBeInTheDocument()
  })

  it('renders user menu', () => {
    render(<Header />)
    expect(screen.getByTestId('user-menu')).toBeInTheDocument()
  })

  it('renders brand icon in a circular container', () => {
    render(<Header />)
    const img = screen.getByAltText('K-daejeop')
    const wrapper = img.parentElement
    expect(wrapper?.className).toContain('rounded-full')
    expect(wrapper?.className).toContain('overflow-hidden')
  })

  it('has correct z-index class for stacking', () => {
    const { container } = render(<Header />)
    const header = container.querySelector('header')
    expect(header?.className).toContain('z-[9000]')
  })
})
