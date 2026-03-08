import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AddToBoardModal } from '../../src/components/Badges/AddToBoardModal'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        'badge.addToBoardTitle': '뱃지판에 추가',
        'badge.places': `${opts?.['0'] ?? ''}곳`,
        'badge.create': '뱃지판 만들기',
        'badge.noBoardsOwned': '아직 뱃지판이 없어요',
        'badge.addedToBoard': `"${opts?.['0'] ?? ''}"에 추가됨!`,
        'badge.alreadyInBoard': '이미 추가된 장소입니다',
      }
      return map[key] ?? key
    },
  }),
}))

const mockCloseAddToBoard = vi.fn()
const mockAddPlaceToBoard = vi.fn()
const mockFetchBoards = vi.fn().mockResolvedValue(undefined)
const mockSetCreateOpen = vi.fn()

const mockPlace = {
  id: 'p1',
  place_name: '멘야하나비',
  address_name: '서울 강남구',
  category_name: '음식점',
  category_group_code: 'FD6',
  x: '127.0',
  y: '37.5',
  place_url: '',
}

let mockBoards = [
  {
    id: 'b1',
    creator_id: 'u1',
    title: '라멘 원정기',
    description: '',
    icon_emoji: '🍜',
    is_public: false,
    share_code: 'ABC123',
    created_at: '2026-03-01T00:00:00Z',
    place_count: 3,
  },
]

let mockAddToBoardPlace: typeof mockPlace | null = mockPlace

vi.mock('../../src/stores/badgeStore', () => ({
  useBadgeStore: (selector?: (s: Record<string, unknown>) => unknown) => {
    const state = {
      addToBoardPlace: mockAddToBoardPlace,
      closeAddToBoard: mockCloseAddToBoard,
      boards: mockBoards,
      fetchBoards: mockFetchBoards,
      addPlaceToBoard: mockAddPlaceToBoard,
      setCreateOpen: mockSetCreateOpen,
    }
    if (typeof selector === 'function') return selector(state as unknown as Record<string, unknown>)
    return state
  },
}))

vi.mock('../../src/stores/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ user: { id: 'u1' } }),
}))

vi.mock('../../src/stores/uiStore', () => ({
  useUiStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ showToast: vi.fn() }),
}))

describe('AddToBoardModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAddToBoardPlace = mockPlace
    mockBoards = [
      {
        id: 'b1',
        creator_id: 'u1',
        title: '라멘 원정기',
        description: '',
        icon_emoji: '🍜',
        is_public: false,
        share_code: 'ABC123',
        created_at: '2026-03-01T00:00:00Z',
        place_count: 3,
      },
    ]
  })

  it('does not render when addToBoardPlace is null', () => {
    mockAddToBoardPlace = null
    const { container } = render(<AddToBoardModal />)
    expect(container.innerHTML).toBe('')
  })

  it('renders place name', () => {
    render(<AddToBoardModal />)
    expect(screen.getByText('멘야하나비')).toBeInTheDocument()
  })

  it('renders place address', () => {
    render(<AddToBoardModal />)
    expect(screen.getByText('서울 강남구')).toBeInTheDocument()
  })

  it('renders board list after loading', async () => {
    render(<AddToBoardModal />)
    await waitFor(() => {
      expect(screen.getByText('라멘 원정기')).toBeInTheDocument()
    })
    expect(screen.getByText('🍜')).toBeInTheDocument()
  })

  it('renders modal title', () => {
    render(<AddToBoardModal />)
    expect(screen.getByText('뱃지판에 추가')).toBeInTheDocument()
  })

  it('shows empty state when no boards', async () => {
    mockBoards = []
    render(<AddToBoardModal />)
    await waitFor(() => {
      expect(screen.getByText('아직 뱃지판이 없어요')).toBeInTheDocument()
    })
  })

  it('shows create button after loading', async () => {
    render(<AddToBoardModal />)
    await waitFor(() => {
      expect(screen.getByText('뱃지판 만들기')).toBeInTheDocument()
    })
  })
})
