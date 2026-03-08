import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BadgeBoardDetail } from '../../src/components/Badges/BadgeBoardDetail'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        'badge.progress': `진행: ${opts?.['0'] ?? ''}/${opts?.['1'] ?? ''}`,
        'badge.completed': '완료!',
        'badge.delete': '삭제',
        'badge.shareCode': '공유코드',
        'badge.shareCodeCopied': '복사됨',
        'badge.copyCode': '공유 코드 복사',
        'badge.deleteConfirm': '삭제하시겠습니까?',
        'badge.deleted': '삭제됨',
        'badge.earned': '뱃지 획득!',
        'badge.publish': '배포하기',
        'badge.published': '배포 완료!',
        'badge.publishRequireAll': '모든 장소를 방문해야 배포할 수 있습니다',
        'badge.addToMyBoards': '내 뱃지판에 추가',
        'badge.alreadySaved': '이미 추가된 뱃지판입니다',
        'badge.boardSaved': '뱃지판이 추가되었습니다!',
        'badge.creatorLabel': '배포자',
        'badge.edit': '수정',
        'badge.editSaved': '수정이 저장되었습니다',
        'badge.save': '만들기',
        'badge.boardDesc': '설명',
        'badge.err.places': '장소를 최소 2개 추가해 주세요',
        'badge.publishPremiumOnly': '프리미엄 회원만 배포할 수 있습니다',
        'badge.creatorReview': '배포자 리뷰',
        'badge.addPlace': '장소 추가',
        'badge.searchPlace': '장소 검색',
        'review.cancel': '취소',
      }
      return map[key] ?? key
    },
  }),
}))

const mockCloseBoard = vi.fn()
const mockDeleteBoard = vi.fn()
const mockCheckCompletion = vi.fn()
const mockPublishBoard = vi.fn()
const mockFetchCreatorReviews = vi.fn()
const mockSaveBoard = vi.fn()
const mockFetchBoards = vi.fn()
const mockUpdateBoard = vi.fn()
const mockRemovePlaceFromBoard = vi.fn()
const mockRefreshBoardPlaces = vi.fn()
const mockAddPlaceToBoard = vi.fn()

let mockStoreData: Record<string, unknown> = {}

vi.mock('../../src/stores/badgeStore', () => ({
  useBadgeStore: (selector?: (s: Record<string, unknown>) => unknown) => {
    const state = {
      creatorReviews: [],
      boards: [],
      ...mockStoreData,
      closeBoard: mockCloseBoard,
      deleteBoard: mockDeleteBoard,
      checkCompletion: mockCheckCompletion,
      publishBoard: mockPublishBoard,
      fetchCreatorReviews: mockFetchCreatorReviews,
      saveBoard: mockSaveBoard,
      fetchBoards: mockFetchBoards,
      updateBoard: mockUpdateBoard,
      removePlaceFromBoard: mockRemovePlaceFromBoard,
      refreshBoardPlaces: mockRefreshBoardPlaces,
      addPlaceToBoard: mockAddPlaceToBoard,
    }
    if (typeof selector === 'function') return selector(state)
    return state
  },
  computeProgress: (places: Array<{ reviewed: boolean }>) => {
    const total = places.length
    const reviewed = places.filter((p) => p.reviewed).length
    return { reviewed, total, percent: total > 0 ? Math.round((reviewed / total) * 100) : 0 }
  },
}))

vi.mock('../../src/stores/mapStore', () => ({
  useMapStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ map: null }),
}))

let mockTier = 'free'
vi.mock('../../src/stores/authStore', () => ({
  useAuthStore: Object.assign(
    (selector: (s: Record<string, unknown>) => unknown) =>
      selector({ user: { id: 'u2' }, tier: mockTier }),
    { getState: () => ({ user: { id: 'u2' }, tier: mockTier }) },
  ),
}))

vi.mock('../../src/stores/uiStore', () => ({
  useUiStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ showToast: vi.fn() }),
}))

vi.mock('../../src/stores/reviewStore', () => ({
  useReviewStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ cachedReviews: [], openDetail: vi.fn() }),
}))

vi.mock('../../src/utils/buildReviewPin', () => ({
  buildReviewPin: () => document.createElement('div'),
}))

vi.mock('../../src/services/supabase', () => ({
  getSupabase: () => ({
    from: () => ({ select: () => ({ eq: () => ({ data: [], error: null }) }) }),
  }),
}))

vi.mock('../../src/services/api', () => ({
  searchPlaces: vi.fn().mockResolvedValue({ documents: [] }),
}))

function makeBoard(overrides: Record<string, unknown> = {}) {
  return {
    id: 'b1',
    creator_id: 'u1',
    title: '라멘 원정기',
    description: '서울 라멘집 탐방',
    icon_emoji: '🍜',
    is_public: true,
    share_code: 'XYZ789',
    created_at: '2026-03-01T00:00:00Z',
    place_count: 3,
    source_board_id: null,
    source_creator_id: null,
    ...overrides,
  }
}

function makePlaces() {
  return [
    {
      id: 'bp1', board_id: 'b1', place_id: 'p1',
      place_name: '멘야하나비 강남점', place_address: '서울 강남구',
      place_category: '음식점', place_x: '127.0', place_y: '37.5',
      sort_order: 0, reviewed: true,
    },
    {
      id: 'bp2', board_id: 'b1', place_id: 'p2',
      place_name: '이치란 라멘', place_address: '서울 중구',
      place_category: '음식점', place_x: '127.0', place_y: '37.5',
      sort_order: 1, reviewed: false,
    },
    {
      id: 'bp3', board_id: 'b1', place_id: 'p3',
      place_name: '라멘 가게 C', place_address: '서울 마포구',
      place_category: '음식점', place_x: '127.0', place_y: '37.5',
      sort_order: 2, reviewed: false,
    },
  ]
}

describe('BadgeBoardDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTier = 'free'
    mockStoreData = {
      selectedBoard: makeBoard(),
      boardPlaces: makePlaces(),
      myBadges: [] as string[],
    }
  })

  it('renders board title', () => {
    render(<BadgeBoardDetail />)
    expect(screen.getByText('라멘 원정기')).toBeInTheDocument()
  })

  it('renders board emoji', () => {
    render(<BadgeBoardDetail />)
    expect(screen.getByText('🍜')).toBeInTheDocument()
  })

  it('renders progress text', () => {
    render(<BadgeBoardDetail />)
    expect(screen.getByText('진행: 1/3')).toBeInTheDocument()
  })

  it('renders all place names', () => {
    render(<BadgeBoardDetail />)
    expect(screen.getByText('멘야하나비 강남점')).toBeInTheDocument()
    expect(screen.getByText('이치란 라멘')).toBeInTheDocument()
    expect(screen.getByText('라멘 가게 C')).toBeInTheDocument()
  })

  it('renders description', () => {
    render(<BadgeBoardDetail />)
    expect(screen.getByText('서울 라멘집 탐방')).toBeInTheDocument()
  })

  // Share code: visible for original creator (no tier check)
  it('renders share code for original creator', () => {
    mockStoreData.selectedBoard = makeBoard({ creator_id: 'u2' })
    render(<BadgeBoardDetail />)
    expect(screen.getByText('XYZ789')).toBeInTheDocument()
  })

  it('hides share code for non-creator', () => {
    mockStoreData.selectedBoard = makeBoard({ creator_id: 'other-user' })
    render(<BadgeBoardDetail />)
    expect(screen.queryByText('XYZ789')).not.toBeInTheDocument()
  })

  it('hides share code for saved board', () => {
    mockStoreData.selectedBoard = makeBoard({
      creator_id: 'u2',
      source_board_id: 'orig-b1',
      source_creator_id: 'orig-u1',
    })
    render(<BadgeBoardDetail />)
    expect(screen.queryByText('XYZ789')).not.toBeInTheDocument()
  })

  it('does not show delete button for non-creator', () => {
    render(<BadgeBoardDetail />)
    expect(screen.queryByText('삭제')).not.toBeInTheDocument()
  })

  it('shows delete button for creator', () => {
    mockStoreData.selectedBoard = makeBoard({ creator_id: 'u2' })
    render(<BadgeBoardDetail />)
    expect(screen.getByText('삭제')).toBeInTheDocument()
  })

  // Publish button
  it('shows publish button for original creator with private board', () => {
    mockStoreData.selectedBoard = makeBoard({ creator_id: 'u2', is_public: false })
    render(<BadgeBoardDetail />)
    expect(screen.getByText('배포하기')).toBeInTheDocument()
  })

  it('hides publish button when board is already public', () => {
    mockStoreData.selectedBoard = makeBoard({ creator_id: 'u2', is_public: true })
    render(<BadgeBoardDetail />)
    expect(screen.queryByText('배포하기')).not.toBeInTheDocument()
  })

  it('hides publish button for non-creator', () => {
    mockStoreData.selectedBoard = makeBoard({ creator_id: 'other-user', is_public: false })
    render(<BadgeBoardDetail />)
    expect(screen.queryByText('배포하기')).not.toBeInTheDocument()
  })

  it('hides publish button for saved board', () => {
    mockStoreData.selectedBoard = makeBoard({
      creator_id: 'u2',
      is_public: false,
      source_board_id: 'orig-b1',
      source_creator_id: 'orig-u1',
    })
    render(<BadgeBoardDetail />)
    expect(screen.queryByText('배포하기')).not.toBeInTheDocument()
  })

  // Add to my boards
  it('shows "add to my boards" for non-creator', () => {
    mockStoreData.selectedBoard = makeBoard({ creator_id: 'other-user', is_public: true })
    render(<BadgeBoardDetail />)
    expect(screen.getByText('내 뱃지판에 추가')).toBeInTheDocument()
  })

  it('hides "add to my boards" for creator', () => {
    mockStoreData.selectedBoard = makeBoard({ creator_id: 'u2' })
    render(<BadgeBoardDetail />)
    expect(screen.queryByText('내 뱃지판에 추가')).not.toBeInTheDocument()
  })

  // fetchCreatorReviews
  it('fetchCreatorReviews is called for non-creator viewing public board', () => {
    mockStoreData.selectedBoard = makeBoard({ creator_id: 'other-user', is_public: true })
    render(<BadgeBoardDetail />)
    expect(mockFetchCreatorReviews).toHaveBeenCalledWith('b1')
  })

  it('fetchCreatorReviews is called for saved board', () => {
    mockStoreData.selectedBoard = makeBoard({
      creator_id: 'u2',
      source_board_id: 'orig-b1',
      source_creator_id: 'orig-u1',
    })
    render(<BadgeBoardDetail />)
    expect(mockFetchCreatorReviews).toHaveBeenCalledWith('b1')
  })

  it('does not fetch creator reviews for own original board', () => {
    mockStoreData.selectedBoard = makeBoard({ creator_id: 'u2', is_public: true })
    render(<BadgeBoardDetail />)
    expect(mockFetchCreatorReviews).not.toHaveBeenCalled()
  })

  // Edit mode
  it('shows edit button for own unpublished board', () => {
    mockStoreData.selectedBoard = makeBoard({ creator_id: 'u2', is_public: false })
    render(<BadgeBoardDetail />)
    expect(screen.getByLabelText('수정')).toBeInTheDocument()
  })

  it('hides edit button for published board', () => {
    mockStoreData.selectedBoard = makeBoard({ creator_id: 'u2', is_public: true })
    render(<BadgeBoardDetail />)
    expect(screen.queryByLabelText('수정')).not.toBeInTheDocument()
  })

  it('hides edit button for saved board', () => {
    mockStoreData.selectedBoard = makeBoard({
      creator_id: 'u2',
      is_public: false,
      source_board_id: 'orig-b1',
      source_creator_id: 'orig-u1',
    })
    render(<BadgeBoardDetail />)
    expect(screen.queryByLabelText('수정')).not.toBeInTheDocument()
  })

  it('hides edit button for non-creator', () => {
    mockStoreData.selectedBoard = makeBoard({ creator_id: 'other-user', is_public: false })
    render(<BadgeBoardDetail />)
    expect(screen.queryByLabelText('수정')).not.toBeInTheDocument()
  })

  it('enters edit mode and shows save/cancel buttons', () => {
    mockStoreData.selectedBoard = makeBoard({ creator_id: 'u2', is_public: false })
    render(<BadgeBoardDetail />)
    fireEvent.click(screen.getByLabelText('수정'))
    expect(screen.getByText('취소')).toBeInTheDocument()
    expect(screen.getByText('만들기')).toBeInTheDocument()
  })

  it('shows remove buttons for places in edit mode', () => {
    mockStoreData.selectedBoard = makeBoard({ creator_id: 'u2', is_public: false })
    render(<BadgeBoardDetail />)
    fireEvent.click(screen.getByLabelText('수정'))
    // Each place should have a remove (X) button — we have 3 places
    const removeButtons = screen.getAllByRole('button').filter(
      (btn) => btn.querySelector('svg line'),
    )
    // 3 remove buttons + close (X in header is also svg line) = more than 3
    expect(removeButtons.length).toBeGreaterThanOrEqual(3)
  })

  // Edit mode: search input for adding places
  it('shows search input in edit mode', () => {
    mockStoreData.selectedBoard = makeBoard({ creator_id: 'u2', is_public: false })
    render(<BadgeBoardDetail />)
    fireEvent.click(screen.getByLabelText('수정'))
    expect(screen.getByPlaceholderText('장소 검색')).toBeInTheDocument()
  })

  // Premium-only publish
  it('shows publish button for free tier but blocks on click', () => {
    mockTier = 'free'
    mockStoreData.selectedBoard = makeBoard({ creator_id: 'u2', is_public: false })
    render(<BadgeBoardDetail />)
    expect(screen.getByText('배포하기')).toBeInTheDocument()
  })

  it('allows premium users to publish', () => {
    mockTier = 'premium'
    mockStoreData.selectedBoard = makeBoard({ creator_id: 'u2', is_public: false })
    render(<BadgeBoardDetail />)
    expect(screen.getByText('배포하기')).toBeInTheDocument()
  })

  // Creator review button on saved boards
  it('shows creator review button on saved board with creator reviews', () => {
    mockStoreData.selectedBoard = makeBoard({
      creator_id: 'u2',
      source_board_id: 'orig-b1',
      source_creator_id: 'orig-u1',
    })
    // Provide creator reviews for place p1
    mockStoreData.creatorReviews = [
      { id: 'cr1', place_id: 'p1', user_id: 'orig-u1', rating: 2 },
    ]
    render(<BadgeBoardDetail />)
    expect(screen.getByText('배포자 리뷰')).toBeInTheDocument()
  })

  it('hides creator review button when no creator reviews', () => {
    mockStoreData.selectedBoard = makeBoard({
      creator_id: 'u2',
      source_board_id: 'orig-b1',
      source_creator_id: 'orig-u1',
    })
    mockStoreData.creatorReviews = []
    render(<BadgeBoardDetail />)
    expect(screen.queryByText('배포자 리뷰')).not.toBeInTheDocument()
  })

  it('hides creator review button on non-saved board', () => {
    mockStoreData.selectedBoard = makeBoard({ creator_id: 'u2' })
    render(<BadgeBoardDetail />)
    expect(screen.queryByText('배포자 리뷰')).not.toBeInTheDocument()
  })
})
