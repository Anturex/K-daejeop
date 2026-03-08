import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RatingFilter } from '../../src/components/MyReviews/RatingFilter'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'ratingFilter.all': '전체',
      }
      return map[key] ?? key
    },
    i18n: { language: 'ko', changeLanguage: vi.fn() },
  }),
}))

describe('RatingFilter', () => {
  const counts = { all: 10, '0': 2, '1': 3, '2': 3, '3': 2 }

  it('renders all 5 rating chips', () => {
    render(
      <RatingFilter
        activeRating="all"
        counts={counts}
        onSelect={() => {}}
      />,
    )
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(5)
    expect(screen.getByText('전체')).toBeInTheDocument()
    expect(screen.getByText('\u2715')).toBeInTheDocument()
    expect(screen.getByText('\u2605')).toBeInTheDocument()
    expect(screen.getByText('\u2605\u2605')).toBeInTheDocument()
    expect(screen.getByText('\u2605\u2605\u2605')).toBeInTheDocument()
  })

  it('calls onSelect when chip clicked', () => {
    const onSelect = vi.fn()
    render(
      <RatingFilter
        activeRating="all"
        counts={counts}
        onSelect={onSelect}
      />,
    )
    fireEvent.click(screen.getByText('\u2605\u2605\u2605'))
    expect(onSelect).toHaveBeenCalledWith('3')
  })

  it('displays badge counts', () => {
    const { container } = render(
      <RatingFilter
        activeRating="all"
        counts={counts}
        onSelect={() => {}}
      />,
    )
    expect(container.textContent).toContain('10')
    expect(container.textContent).toContain('2')
    expect(container.textContent).toContain('3')
  })
})
