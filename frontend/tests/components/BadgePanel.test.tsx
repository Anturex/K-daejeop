import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BadgeBoardCard } from '../../src/components/Badges/BadgeBoardCard'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'badge.completed': '완료!',
        'badge.savedLabel': '저장됨',
      }
      return map[key] ?? key
    },
  }),
}))

const mockBoard = {
  id: 'b1',
  creator_id: 'u1',
  title: '라멘 원정기',
  description: '서울 주요 라멘집 탐방',
  icon_emoji: '🍜',
  is_public: true,
  share_code: 'ABC123',
  created_at: '2026-03-01T00:00:00Z',
  place_count: 5,
  source_board_id: null,
  source_creator_id: null,
}

describe('BadgeBoardCard', () => {
  const mockClick = vi.fn()

  beforeEach(() => {
    mockClick.mockClear()
  })

  it('renders board title', () => {
    render(
      <BadgeBoardCard
        board={mockBoard}
        progress={{ reviewed: 3, total: 5, percent: 60 }}
        completed={false}
        onClick={mockClick}
      />,
    )
    expect(screen.getByText('라멘 원정기')).toBeInTheDocument()
  })

  it('renders board emoji', () => {
    render(
      <BadgeBoardCard
        board={mockBoard}
        progress={{ reviewed: 0, total: 5, percent: 0 }}
        completed={false}
        onClick={mockClick}
      />,
    )
    expect(screen.getByText('🍜')).toBeInTheDocument()
  })

  it('renders description', () => {
    render(
      <BadgeBoardCard
        board={mockBoard}
        progress={{ reviewed: 0, total: 5, percent: 0 }}
        completed={false}
        onClick={mockClick}
      />,
    )
    expect(screen.getByText('서울 주요 라멘집 탐방')).toBeInTheDocument()
  })

  it('renders progress count', () => {
    render(
      <BadgeBoardCard
        board={mockBoard}
        progress={{ reviewed: 3, total: 5, percent: 60 }}
        completed={false}
        onClick={mockClick}
      />,
    )
    expect(screen.getByText('3/5')).toBeInTheDocument()
  })

  it('shows completed label when badge is earned', () => {
    render(
      <BadgeBoardCard
        board={mockBoard}
        progress={{ reviewed: 5, total: 5, percent: 100 }}
        completed={true}
        onClick={mockClick}
      />,
    )
    expect(screen.getByText('완료!')).toBeInTheDocument()
  })

  it('does not show completed label when not earned', () => {
    render(
      <BadgeBoardCard
        board={mockBoard}
        progress={{ reviewed: 3, total: 5, percent: 60 }}
        completed={false}
        onClick={mockClick}
      />,
    )
    expect(screen.queryByText('완료!')).not.toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    render(
      <BadgeBoardCard
        board={mockBoard}
        progress={{ reviewed: 0, total: 5, percent: 0 }}
        completed={false}
        onClick={mockClick}
      />,
    )
    screen.getByText('라멘 원정기').closest('button')?.click()
    expect(mockClick).toHaveBeenCalledTimes(1)
  })

  it('shows saved label when isSaved is true', () => {
    render(
      <BadgeBoardCard
        board={mockBoard}
        progress={{ reviewed: 2, total: 5, percent: 40 }}
        completed={false}
        onClick={mockClick}
        isSaved={true}
      />,
    )
    expect(screen.getByText('저장됨')).toBeInTheDocument()
  })

  it('hides saved label when completed (even if isSaved)', () => {
    render(
      <BadgeBoardCard
        board={mockBoard}
        progress={{ reviewed: 5, total: 5, percent: 100 }}
        completed={true}
        onClick={mockClick}
        isSaved={true}
      />,
    )
    expect(screen.queryByText('저장됨')).not.toBeInTheDocument()
    expect(screen.getByText('완료!')).toBeInTheDocument()
  })

  it('hides saved label when isSaved is not provided', () => {
    render(
      <BadgeBoardCard
        board={mockBoard}
        progress={{ reviewed: 2, total: 5, percent: 40 }}
        completed={false}
        onClick={mockClick}
      />,
    )
    expect(screen.queryByText('저장됨')).not.toBeInTheDocument()
  })
})
