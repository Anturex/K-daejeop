import { create } from 'zustand'
import { getSupabase } from '../services/supabase'
import type { PlaceResult } from '../services/api'
import { mapRawReview, type Review } from './reviewStore'

/* ===== Types ===== */

export interface BadgeBoard {
  id: string
  creator_id: string
  title: string
  description: string
  icon_emoji: string
  is_public: boolean
  share_code: string | null
  created_at: string
  place_count: number
  source_board_id: string | null
  source_creator_id: string | null
  published_at: string | null
}

export interface CodeSearchResult {
  board: BadgeBoard
  places: Omit<BadgeBoardPlace, 'reviewed'>[]
}

export interface BadgeBoardPlace {
  id: string
  board_id: string
  place_id: string
  place_name: string
  place_address: string
  place_category: string
  place_x: string
  place_y: string
  sort_order: number
  reviewed: boolean // computed on frontend
}

/* ===== Helper: generate share code ===== */

function generateShareCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

/* ===== Helper: compute reviewed status ===== */

export function markReviewedPlaces(
  places: Omit<BadgeBoardPlace, 'reviewed'>[],
  reviewedPlaceIds: Set<string>,
): BadgeBoardPlace[] {
  return places.map((p) => ({
    ...p,
    reviewed: reviewedPlaceIds.has(p.place_id),
  }))
}

export function computeProgress(places: BadgeBoardPlace[]): {
  reviewed: number
  total: number
  percent: number
} {
  const total = places.length
  const reviewed = places.filter((p) => p.reviewed).length
  return { reviewed, total, percent: total > 0 ? Math.round((reviewed / total) * 100) : 0 }
}

/* ===== Store ===== */

interface BadgeState {
  // Board list
  boards: BadgeBoard[]
  loadingBoards: boolean
  fetchBoards: () => Promise<void>

  // Board detail
  selectedBoard: BadgeBoard | null
  boardPlaces: BadgeBoardPlace[]
  boardPinsActive: boolean
  selectBoard: (board: BadgeBoard, reviewedPlaceIds: Set<string>) => Promise<void>
  closeBoard: () => void
  setBoardPinsActive: (v: boolean) => void

  // My badges (completed board IDs)
  myBadges: string[]
  fetchMyBadges: () => Promise<void>

  // Create board
  createOpen: boolean
  setCreateOpen: (open: boolean) => void
  createBoard: (
    userId: string,
    title: string,
    description: string,
    emoji: string,
    isPublic: boolean,
    places: PlaceResult[],
  ) => Promise<BadgeBoard | null>
  deleteBoard: (boardId: string) => Promise<boolean>

  // Share code lookup (returns board + places via RPC)
  findByCode: (code: string) => Promise<CodeSearchResult | null>

  // Save board (copy from another user)
  saveBoard: (
    userId: string,
    sourceBoard: BadgeBoard,
    places: Omit<BadgeBoardPlace, 'reviewed'>[],
  ) => Promise<BadgeBoard | null>

  // Check if board is already saved
  isBoardSaved: (boardId: string) => boolean

  // Check & record completion
  checkCompletion: (boardId: string, userId: string) => Promise<boolean>

  // Add place to existing board
  addToBoardPlace: PlaceResult | null
  openAddToBoard: (place: PlaceResult) => void
  closeAddToBoard: () => void
  addPlaceToBoard: (boardId: string, place: PlaceResult) => Promise<boolean>

  // Publish board (make public, optionally update description)
  publishBoard: (boardId: string, description?: string) => Promise<'ok' | 'monthly_limit' | 'incomplete' | 'error'>

  // Edit board (title/description/emoji)
  updateBoard: (boardId: string, fields: { title?: string; description?: string; icon_emoji?: string }) => Promise<boolean>
  removePlaceFromBoard: (boardId: string, placeId: string) => Promise<boolean>

  // Refresh board places reviewed status
  refreshBoardPlaces: (reviewedPlaceIds: Set<string>) => void

  // Creator reviews (for public boards by other users)
  creatorReviews: Review[]
  fetchCreatorReviews: (boardId: string) => Promise<void>
}

export const useBadgeStore = create<BadgeState>((set, get) => ({
  boards: [],
  loadingBoards: false,

  fetchBoards: async () => {
    set({ loadingBoards: true })
    try {
      const sb = getSupabase()
      const { data, error } = await sb
        .from('badge_boards')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[badge] fetchBoards error:', error)
        set({ loadingBoards: false })
        return
      }

      // Fetch place counts per board
      const boards: BadgeBoard[] = (data ?? []).map((b) => ({
        ...b,
        place_count: 0,
      }))

      if (boards.length > 0) {
        const boardIds = boards.map((b) => b.id)
        const { data: placeCounts } = await sb
          .from('badge_board_places')
          .select('board_id')
          .in('board_id', boardIds)

        if (placeCounts) {
          const countMap = new Map<string, number>()
          for (const pc of placeCounts) {
            countMap.set(pc.board_id, (countMap.get(pc.board_id) ?? 0) + 1)
          }
          for (const b of boards) {
            b.place_count = countMap.get(b.id) ?? 0
          }
        }
      }

      set({ boards, loadingBoards: false })
    } catch (err) {
      console.error('[badge] fetchBoards error:', err)
      set({ loadingBoards: false })
    }
  },

  selectedBoard: null,
  boardPlaces: [],
  boardPinsActive: false,

  selectBoard: async (board, reviewedPlaceIds) => {
    const sb = getSupabase()
    const { data, error } = await sb
      .from('badge_board_places')
      .select('*')
      .eq('board_id', board.id)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('[badge] selectBoard error:', error)
      return
    }

    const places = markReviewedPlaces(data ?? [], reviewedPlaceIds)
    set({ selectedBoard: board, boardPlaces: places, boardPinsActive: true })
  },

  closeBoard: () => set({ selectedBoard: null, boardPlaces: [], creatorReviews: [], boardPinsActive: false }),

  setBoardPinsActive: (v) => set({ boardPinsActive: v }),

  myBadges: [],

  fetchMyBadges: async () => {
    const sb = getSupabase()
    const { data, error } = await sb
      .from('user_badges')
      .select('board_id')

    if (error) {
      console.error('[badge] fetchMyBadges error:', error)
      return
    }

    set({ myBadges: (data ?? []).map((d) => d.board_id) })
  },

  createOpen: false,
  setCreateOpen: (open) => set({ createOpen: open }),

  createBoard: async (userId, title, description, emoji, isPublic, places) => {
    const sb = getSupabase()
    const shareCode = generateShareCode()

    const { data: boardData, error: boardError } = await sb
      .from('badge_boards')
      .insert({
        creator_id: userId,
        title,
        description,
        icon_emoji: emoji,
        is_public: isPublic,
        share_code: shareCode,
      })
      .select()
      .single()

    if (boardError || !boardData) {
      console.error('[badge] createBoard error:', boardError)
      return null
    }

    // Insert places
    const placeRows = places.map((p, i) => ({
      board_id: boardData.id,
      place_id: p.id,
      place_name: p.place_name,
      place_address: p.address_name || '',
      place_category: p.category_name || '',
      place_x: p.x || '',
      place_y: p.y || '',
      sort_order: i,
    }))

    const { error: placesError } = await sb
      .from('badge_board_places')
      .insert(placeRows)

    if (placesError) {
      console.error('[badge] insert places error:', placesError)
      // Clean up the board
      await sb.from('badge_boards').delete().eq('id', boardData.id)
      return null
    }

    const newBoard: BadgeBoard = {
      ...boardData,
      place_count: places.length,
    }

    set((s) => ({ boards: [newBoard, ...s.boards] }))
    return newBoard
  },

  deleteBoard: async (boardId) => {
    const sb = getSupabase()
    const { error } = await sb.from('badge_boards').delete().eq('id', boardId)

    if (error) {
      console.error('[badge] deleteBoard error:', error)
      return false
    }

    set((s) => ({
      boards: s.boards.filter((b) => b.id !== boardId),
      selectedBoard: s.selectedBoard?.id === boardId ? null : s.selectedBoard,
      boardPlaces: s.selectedBoard?.id === boardId ? [] : s.boardPlaces,
    }))
    return true
  },

  findByCode: async (code) => {
    const sb = getSupabase()

    // RPC bypasses RLS → finds private boards too
    const { data: boards, error: boardErr } = await sb.rpc('find_board_by_code', {
      code_param: code.trim(),
    })

    if (boardErr || !boards || boards.length === 0) return null

    const boardRow = boards[0]

    // Fetch places via RPC (bypasses RLS)
    const { data: placesData, error: placesErr } = await sb.rpc('get_board_places_by_id', {
      board_id_param: boardRow.id,
    })

    if (placesErr) return null

    const board: BadgeBoard = {
      ...boardRow,
      place_count: placesData?.length ?? 0,
    }

    return { board, places: placesData ?? [] }
  },

  saveBoard: async (userId, sourceBoard, places) => {
    const sb = getSupabase()
    const shareCode = generateShareCode()

    const { data: boardData, error: boardError } = await sb
      .from('badge_boards')
      .insert({
        creator_id: userId,
        title: sourceBoard.title,
        description: sourceBoard.description,
        icon_emoji: sourceBoard.icon_emoji,
        is_public: false,
        share_code: shareCode,
        source_board_id: sourceBoard.id,
        source_creator_id: sourceBoard.creator_id,
      })
      .select()
      .single()

    if (boardError || !boardData) {
      console.error('[badge] saveBoard error:', boardError)
      return null
    }

    const placeRows = places.map((p, i) => ({
      board_id: boardData.id,
      place_id: p.place_id,
      place_name: p.place_name,
      place_address: p.place_address || '',
      place_category: p.place_category || '',
      place_x: p.place_x || '',
      place_y: p.place_y || '',
      sort_order: i,
    }))

    const { error: placesError } = await sb
      .from('badge_board_places')
      .insert(placeRows)

    if (placesError) {
      console.error('[badge] saveBoard places error:', placesError)
      await sb.from('badge_boards').delete().eq('id', boardData.id)
      return null
    }

    const newBoard: BadgeBoard = {
      ...boardData,
      place_count: places.length,
    }

    set((s) => ({ boards: [newBoard, ...s.boards] }))
    return newBoard
  },

  isBoardSaved: (boardId) => {
    const { boards } = get()
    return boards.some((b) => b.source_board_id === boardId)
  },

  addToBoardPlace: null,
  openAddToBoard: (place) => set({ addToBoardPlace: place }),
  closeAddToBoard: () => set({ addToBoardPlace: null }),

  addPlaceToBoard: async (boardId, place) => {
    const sb = getSupabase()

    // Get next sort_order
    const { data: existing } = await sb
      .from('badge_board_places')
      .select('sort_order')
      .eq('board_id', boardId)
      .order('sort_order', { ascending: false })
      .limit(1)

    const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0

    const { error } = await sb.from('badge_board_places').insert({
      board_id: boardId,
      place_id: place.id,
      place_name: place.place_name,
      place_address: place.address_name || '',
      place_category: place.category_name || '',
      place_x: place.x || '',
      place_y: place.y || '',
      sort_order: nextOrder,
    })

    if (error) {
      // Unique constraint (board_id, place_id) → duplicate
      if (error.code === '23505') return false
      console.error('[badge] addPlaceToBoard error:', error)
      return false
    }

    const { selectedBoard } = get()
    const newPlace: BadgeBoardPlace = {
      id: `local-${Date.now()}`,
      board_id: boardId,
      place_id: place.id,
      place_name: place.place_name,
      place_address: place.address_name || '',
      place_category: place.category_name || '',
      place_x: place.x || '',
      place_y: place.y || '',
      sort_order: nextOrder,
      reviewed: false,
    }

    set((s) => ({
      boardPlaces: selectedBoard?.id === boardId
        ? [...s.boardPlaces, newPlace]
        : s.boardPlaces,
      boards: s.boards.map((b) =>
        b.id === boardId ? { ...b, place_count: b.place_count + 1 } : b,
      ),
    }))
    return true
  },

  publishBoard: async (boardId, description) => {
    // Require all places reviewed before publishing
    const { boardPlaces, boards } = get()
    const progress = computeProgress(boardPlaces)
    if (progress.percent < 100) return 'incomplete'

    // Monthly limit: max 1 publish per 30 days (own boards only)
    const now = new Date()
    const ago30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const recentPublishes = boards.filter(
      (b) => b.published_at && new Date(b.published_at) > ago30d && !b.source_board_id,
    )
    if (recentPublishes.length >= 1) return 'monthly_limit'

    const sb = getSupabase()
    const publishedAt = now.toISOString()
    const updatePayload: Record<string, unknown> = { is_public: true, published_at: publishedAt }
    if (description !== undefined) {
      updatePayload.description = description
    }

    const { error } = await sb
      .from('badge_boards')
      .update(updatePayload)
      .eq('id', boardId)

    if (error) {
      console.error('[badge] publishBoard error:', error)
      return 'error'
    }

    const patch: Partial<BadgeBoard> = { is_public: true, published_at: publishedAt }
    if (description !== undefined) patch.description = description

    set((s) => ({
      boards: s.boards.map((b) =>
        b.id === boardId ? { ...b, ...patch } : b,
      ),
      selectedBoard:
        s.selectedBoard?.id === boardId
          ? { ...s.selectedBoard, ...patch }
          : s.selectedBoard,
    }))
    return 'ok'
  },

  creatorReviews: [],

  fetchCreatorReviews: async (boardId) => {
    const { selectedBoard, boardPlaces } = get()
    const sb = getSupabase()

    // For saved boards: use source_creator_id + place IDs
    if (selectedBoard?.source_creator_id) {
      const placeIds = boardPlaces.map((p) => p.place_id)
      const { data, error } = await sb.rpc('get_creator_reviews_by_user_places', {
        creator_id_param: selectedBoard.source_creator_id,
        place_ids_param: placeIds,
      })

      if (error) {
        console.error('[badge] fetchCreatorReviews (saved) error:', error)
        return
      }

      set({ creatorReviews: (data ?? []).map(mapRawReview) })
      return
    }

    // For original public boards: use existing RPC
    const { data, error } = await sb.rpc('get_board_creator_reviews', {
      board_id_param: boardId,
    })

    if (error) {
      console.error('[badge] fetchCreatorReviews error:', error)
      return
    }

    set({ creatorReviews: (data ?? []).map(mapRawReview) })
  },

  updateBoard: async (boardId, fields) => {
    const sb = getSupabase()
    const { error } = await sb
      .from('badge_boards')
      .update(fields)
      .eq('id', boardId)

    if (error) {
      console.error('[badge] updateBoard error:', error)
      return false
    }

    set((s) => ({
      boards: s.boards.map((b) =>
        b.id === boardId ? { ...b, ...fields } : b,
      ),
      selectedBoard:
        s.selectedBoard?.id === boardId
          ? { ...s.selectedBoard, ...fields }
          : s.selectedBoard,
    }))
    return true
  },

  removePlaceFromBoard: async (boardId, placeId) => {
    const sb = getSupabase()
    const { error } = await sb
      .from('badge_board_places')
      .delete()
      .eq('board_id', boardId)
      .eq('place_id', placeId)

    if (error) {
      console.error('[badge] removePlaceFromBoard error:', error)
      return false
    }

    set((s) => ({
      boardPlaces: s.boardPlaces.filter((p) => p.place_id !== placeId),
      boards: s.boards.map((b) =>
        b.id === boardId ? { ...b, place_count: Math.max(0, b.place_count - 1) } : b,
      ),
    }))
    return true
  },

  refreshBoardPlaces: (reviewedPlaceIds) => {
    set((s) => ({
      boardPlaces: s.boardPlaces.map((p) => ({
        ...p,
        reviewed: reviewedPlaceIds.has(p.place_id),
      })),
    }))
  },

  checkCompletion: async (boardId, userId) => {
    const { myBadges } = get()
    if (myBadges.includes(boardId)) return true

    const sb = getSupabase()
    const { error } = await sb
      .from('user_badges')
      .insert({ user_id: userId, board_id: boardId })

    if (error) {
      // Unique constraint → already earned
      if (error.code === '23505') return true
      console.error('[badge] checkCompletion error:', error)
      return false
    }

    set((s) => ({ myBadges: [...s.myBadges, boardId] }))
    return true
  },
}))
