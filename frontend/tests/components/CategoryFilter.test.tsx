import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CategoryFilter } from '../../src/components/MyReviews/CategoryFilter'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'category.all': '전체',
        'category.restaurant': '식당',
        'category.cafe': '카페',
        'category.attraction': '관광명소',
        'category.etc': '기타',
      }
      return map[key] ?? key
    },
    i18n: { language: 'ko', changeLanguage: vi.fn() },
  }),
}))

describe('CategoryFilter', () => {
  const counts = { all: 10, restaurant: 5, cafe: 3, attraction: 1, etc: 1 }

  it('renders all category chips with emojis', () => {
    render(
      <CategoryFilter
        activeCategory="all"
        counts={counts}
        onSelect={() => {}}
      />,
    )
    expect(screen.getByText(/📍.*전체/)).toBeInTheDocument()
    expect(screen.getByText(/🍽️.*식당/)).toBeInTheDocument()
    expect(screen.getByText(/☕.*카페/)).toBeInTheDocument()
    expect(screen.getByText(/🏛️.*관광명소/)).toBeInTheDocument()
    expect(screen.getByText(/📌.*기타/)).toBeInTheDocument()
  })

  it('calls onSelect when chip clicked', () => {
    const onSelect = vi.fn()
    render(
      <CategoryFilter
        activeCategory="all"
        counts={counts}
        onSelect={onSelect}
      />,
    )
    fireEvent.click(screen.getByText(/☕.*카페/))
    expect(onSelect).toHaveBeenCalledWith('cafe')
  })

  it('displays badge counts', () => {
    const { container } = render(
      <CategoryFilter
        activeCategory="all"
        counts={counts}
        onSelect={() => {}}
      />,
    )
    expect(container.textContent).toContain('10')
    expect(container.textContent).toContain('5')
    expect(container.textContent).toContain('3')
  })
})
