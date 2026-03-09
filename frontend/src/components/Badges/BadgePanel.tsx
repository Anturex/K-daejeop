import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type TouchEvent as ReactTouchEvent,
} from 'react'
import { useTranslation } from 'react-i18next'
import { useBadgeStore } from '../../stores/badgeStore'
import type { BadgeBoard, CodeSearchResult } from '../../stores/badgeStore'
import { useAuthStore } from '../../stores/authStore'
import { useUiStore } from '../../stores/uiStore'
import { useReviewedPlaces } from '../../hooks/useReviewedPlaces'
import { getSupabase } from '../../services/supabase'
import { BadgeBoardCard } from './BadgeBoardCard'
import { BadgeBoardDetail } from './BadgeBoardDetail'
import { BadgeBoardCreate } from './BadgeBoardCreate'

const SWIPE_DISMISS_THRESHOLD = 120

export function BadgePanel() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const badgePanelActive = useUiStore((s) => s.badgePanelActive)
  const { setBadgePanelActive } = useUiStore()
  const showToast = useUiStore((s) => s.showToast)
  const { getMyReviews } = useReviewedPlaces()

  const {
    boards,
    loadingBoards,
    fetchBoards,
    selectedBoard,
    selectBoard,
    myBadges,
    fetchMyBadges,
    createOpen,
    setCreateOpen,
    findByCode,
    saveBoard,
  } = useBadgeStore()

  const [panelOpen, setPanelOpen] = useState(false)
  const [reviewedPlaceIds, setReviewedPlaceIds] = useState<Set<string>>(new Set())
  const [shareCodeInput, setShareCodeInput] = useState('')
  const [codeSearching, setCodeSearching] = useState(false)
  const [codePreview, setCodePreview] = useState<CodeSearchResult | null>(null)
  const [publicCollapsed, setPublicCollapsed] = useState(false)

  // Progress cache per board
  const [progressMap, setProgressMap] = useState<
    Map<string, { reviewed: number; total: number; percent: number }>
  >(new Map())

  const listRef = useRef<HTMLDivElement>(null)

  /* ===== Load data on mount ===== */
  useEffect(() => {
    let cancelled = false

    async function load() {
      // Fetch user reviews for progress calculation
      const reviews = await getMyReviews()
      if (cancelled) return

      const placeIds = new Set((reviews ?? []).map((r) => r.place_id))
      setReviewedPlaceIds(placeIds)

      await Promise.all([fetchBoards(), fetchMyBadges()])
      if (cancelled) return

      setPanelOpen(true)
    }

    load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ===== Re-open panel when badge tab is tapped while pins are active ===== */
  useEffect(() => {
    if (badgePanelActive && !panelOpen) {
      setPanelOpen(true)
    }
  }, [badgePanelActive]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ===== Hide panel when place is clicked in board detail ===== */
  useEffect(() => {
    const handler = () => setPanelOpen(false)
    window.addEventListener('badge:hide-panel', handler)
    return () => window.removeEventListener('badge:hide-panel', handler)
  }, [])

  /* ===== Compute progress for all boards when boards/reviews change ===== */
  useEffect(() => {
    if (boards.length === 0) return

    async function computeAll() {
      const sb = getSupabase()
      const boardIds = boards.map((b) => b.id)

      const { data: allPlaces } = await sb
        .from('badge_board_places')
        .select('board_id, place_id')
        .in('board_id', boardIds)

      if (!allPlaces) return

      const map = new Map<string, { reviewed: number; total: number; percent: number }>()

      // Group by board
      const byBoard = new Map<string, string[]>()
      for (const p of allPlaces) {
        if (!byBoard.has(p.board_id)) byBoard.set(p.board_id, [])
        byBoard.get(p.board_id)!.push(p.place_id)
      }

      for (const [boardId, placeIds] of byBoard) {
        const total = placeIds.length
        const reviewed = placeIds.filter((pid) => reviewedPlaceIds.has(pid)).length
        map.set(boardId, {
          reviewed,
          total,
          percent: total > 0 ? Math.round((reviewed / total) * 100) : 0,
        })
      }

      setProgressMap(map)
    }

    computeAll()
  }, [boards, reviewedPlaceIds])

  /* ===== Board click ===== */
  const handleBoardClick = useCallback(
    async (board: BadgeBoard) => {
      await selectBoard(board, reviewedPlaceIds)
    },
    [selectBoard, reviewedPlaceIds],
  )

  /* ===== Share code search ===== */
  const handleCodeSearch = useCallback(async () => {
    const code = shareCodeInput.trim()
    if (!code || code.length < 4) return

    setCodeSearching(true)
    const result = await findByCode(code)
    setCodeSearching(false)

    if (result) {
      setCodePreview(result)
      setShareCodeInput('')
    } else {
      showToast(t('badge.shareCodeNotFound'), 3000)
    }
  }, [shareCodeInput, findByCode, showToast, t])

  /* ===== Save board from code preview ===== */
  const handleSaveBoardFromCode = useCallback(async () => {
    if (!codePreview || !user) return
    const alreadySaved = boards.some((b) => b.source_board_id === codePreview.board.id)
    if (alreadySaved) {
      showToast(t('badge.alreadySaved'), 3000)
      return
    }
    const saved = await saveBoard(user.id, codePreview.board, codePreview.places)
    if (saved) {
      showToast(t('badge.boardSaved'), 3000)
      setCodePreview(null)
      await fetchBoards()
    }
  }, [codePreview, user, boards, saveBoard, showToast, t, fetchBoards])

  /* ===== Panel close ===== */
  const handleClose = useCallback(() => {
    setPanelOpen(false)
  }, [])

  const handleBackdropClick = useCallback(() => {
    const { selectedBoard: sb } = useBadgeStore.getState()
    if (sb) {
      // Board selected → only hide panel, keep pins on map
      setPanelOpen(false)
    } else {
      setBadgePanelActive(false)
    }
  }, [setBadgePanelActive])

  /* ===== Swipe to dismiss ===== */
  const panelRef = useRef<HTMLElement>(null)
  const swipeStartY = useRef(0)
  const swipeDragY = useRef(0)
  const swiping = useRef(false)

  const handleTouchStart = useCallback(
    (e: ReactTouchEvent<HTMLDivElement>) => {
      if (!panelOpen) return
      swipeStartY.current = e.touches[0].clientY
      swipeDragY.current = 0
      swiping.current = true
      if (panelRef.current) panelRef.current.style.transition = 'none'
    },
    [panelOpen],
  )

  const handleTouchMove = useCallback((e: ReactTouchEvent<HTMLDivElement>) => {
    if (!swiping.current) return
    const delta = Math.max(0, e.touches[0].clientY - swipeStartY.current)
    swipeDragY.current = delta
    if (panelRef.current) {
      panelRef.current.style.transform = `translateY(${delta}px)`
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (!swiping.current) return
    swiping.current = false
    if (panelRef.current) {
      panelRef.current.style.transition = ''
    }
    if (swipeDragY.current > SWIPE_DISMISS_THRESHOLD) {
      const { selectedBoard: sb } = useBadgeStore.getState()
      if (sb) {
        // Board selected → only hide panel, keep pins on map
        setPanelOpen(false)
      } else {
        setPanelOpen(false)
        setTimeout(() => setBadgePanelActive(false), 300)
      }
    } else if (panelRef.current) {
      panelRef.current.style.transform = ''
    }
  }, [setBadgePanelActive])

  /* ===== Transition end: close panel if not open (and no board pins active) ===== */
  const handleTransitionEnd = useCallback(() => {
    if (!panelOpen) {
      const { selectedBoard: sb } = useBadgeStore.getState()
      if (!sb) {
        setBadgePanelActive(false)
      }
    }
  }, [panelOpen, setBadgePanelActive])

  const earnedBoards = boards.filter((b) => myBadges.includes(b.id))
  const myBoards = boards.filter((b) => b.creator_id === user?.id)
  const savedBoardIds = new Set(
    boards.filter((b) => b.source_board_id).map((b) => b.source_board_id!),
  )
  const hiddenBoardIds = new Set<string>(
    JSON.parse(localStorage.getItem('k_hidden_boards') || '[]'),
  )
  const publicBoards = boards.filter(
    (b) => b.creator_id !== user?.id && !savedBoardIds.has(b.id) && !hiddenBoardIds.has(b.id),
  )
  const defaultProgress = { reviewed: 0, total: 0, percent: 0 }

  return (
    <>
      {/* Backdrop (mobile) */}
      <div
        className={`fixed inset-0 z-[9000] bg-black/30 backdrop-blur-sm transition-opacity duration-300 sm:hidden ${
          panelOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={handleBackdropClick}
      />

      {/* Panel */}
      <aside
        ref={panelRef as React.RefObject<HTMLElement>}
        onTransitionEnd={handleTransitionEnd}
        className={`absolute right-0 top-0 z-[9001] flex h-full w-[320px] flex-col bg-surface shadow-xl transition-transform duration-300 ease-out max-sm:bottom-0 max-sm:left-0 max-sm:right-0 max-sm:top-auto max-sm:h-[60vh] max-sm:w-full max-sm:rounded-t-2xl ${
          panelOpen
            ? 'translate-x-0 max-sm:translate-y-0'
            : 'translate-x-full max-sm:translate-x-0 max-sm:translate-y-full'
        }`}
      >
        {/* Drag handle (mobile) */}
        <div
          className="flex justify-center py-2 sm:hidden"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="h-1 w-8 rounded-full bg-border" />
        </div>

        {/* Show detail if board selected, otherwise show list */}
        {selectedBoard ? (
          <BadgeBoardDetail />
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="font-serif text-sm font-semibold">
                {t('badge.title')}
              </span>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-full p-1 text-text-muted transition-colors hover:text-text-primary"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3">
              {/* Share code input */}
              <div className="mb-4 flex items-center gap-2">
                <input
                  type="text"
                  value={shareCodeInput}
                  onChange={(e) => setShareCodeInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleCodeSearch()}
                  placeholder={t('badge.shareCodePlaceholder')}
                  maxLength={6}
                  className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 font-mono text-sm uppercase tracking-widest text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none max-sm:text-base"
                />
                <button
                  type="button"
                  onClick={handleCodeSearch}
                  disabled={codeSearching}
                  className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-50"
                >
                  {t('badge.shareCodeSearch')}
                </button>
              </div>

              {/* Share code preview card with places list */}
              {codePreview && (
                <div className="mb-4 rounded-xl border-2 border-accent/40 bg-accent/5 p-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface text-xl">
                      {codePreview.board.icon_emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-serif text-sm font-semibold text-text-primary">
                        {codePreview.board.title}
                      </div>
                      {codePreview.board.description && (
                        <div className="mt-0.5 text-xs text-text-muted">
                          {codePreview.board.description}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Places list */}
                  {codePreview.places.length > 0 && (
                    <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                      {codePreview.places.map((p, i) => (
                        <div
                          key={p.place_id}
                          className="flex items-center gap-2 rounded-lg bg-surface px-2 py-1.5"
                        >
                          <span className="text-[10px] font-bold text-text-muted">{i + 1}</span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-xs font-medium text-text-primary">
                              {p.place_name}
                            </div>
                            {p.place_address && (
                              <div className="truncate text-[10px] text-text-muted">
                                {p.place_address}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCodePreview(null)}
                      className="flex-1 rounded-lg border border-border py-2 text-xs font-semibold text-text-muted transition-colors hover:border-accent hover:text-accent"
                    >
                      {t('review.cancel')}
                    </button>
                    {savedBoardIds.has(codePreview.board.id) ? (
                      <div className="flex flex-1 items-center justify-center py-2 text-xs text-text-muted">
                        {t('badge.alreadySaved')}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSaveBoardFromCode}
                        className="flex-1 rounded-lg bg-accent py-2 text-xs font-semibold text-white transition-colors hover:bg-accent-dark"
                      >
                        {t('badge.addToMyBoards')}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* My earned badges */}
              {earnedBoards.length > 0 && (
                <div className="mb-4">
                  <div className="mb-2 text-xs font-semibold text-text-muted">
                    {t('badge.myBadges')}
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {earnedBoards.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => handleBoardClick(b)}
                        className="flex shrink-0 flex-col items-center gap-1 rounded-xl bg-accent/10 px-3 py-2 transition-colors hover:bg-accent/20"
                      >
                        <span className="text-2xl">{b.icon_emoji}</span>
                        <span className="max-w-[64px] truncate text-[10px] font-semibold text-accent">
                          {b.title}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Create button */}
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="mb-4 flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-accent/30 py-3 text-sm font-semibold text-accent transition-colors hover:border-accent hover:bg-accent/5"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                {t('badge.create')}
              </button>

              {/* Loading */}
              {loadingBoards && (
                <div className="py-8 text-center text-xs text-text-muted">...</div>
              )}

              {/* My boards section */}
              {!loadingBoards && myBoards.length > 0 && (
                <>
                  <div className="mb-2 text-xs font-semibold text-text-muted">
                    {t('badge.myBoards')}
                  </div>
                  <div className="mb-4 space-y-2">
                    {myBoards.map((board) => (
                      <BadgeBoardCard
                        key={board.id}
                        board={board}
                        progress={progressMap.get(board.id) ?? defaultProgress}
                        completed={myBadges.includes(board.id)}
                        onClick={() => handleBoardClick(board)}
                        isSaved={!!board.source_board_id}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Public boards section (from other users) — collapsible */}
              {!loadingBoards && publicBoards.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => setPublicCollapsed((v) => !v)}
                    className="mb-2 flex w-full items-center justify-between text-xs font-semibold text-text-muted"
                  >
                    <span>{t('badge.publicBoards')}</span>
                    <svg
                      className={`h-4 w-4 transition-transform duration-200 ${publicCollapsed ? '' : 'rotate-180'}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  {!publicCollapsed && (
                    <div className="space-y-2">
                      {publicBoards.map((board) => (
                        <BadgeBoardCard
                          key={board.id}
                          board={board}
                          progress={progressMap.get(board.id) ?? defaultProgress}
                          completed={myBadges.includes(board.id)}
                          onClick={() => handleBoardClick(board)}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Empty state */}
              {!loadingBoards && boards.length === 0 && (
                <div className="py-8 text-center">
                  <div className="mb-2 text-3xl">🏆</div>
                  <div className="text-sm font-medium text-text-muted">
                    {t('badge.noBoards')}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </aside>

      {/* Create modal */}
      {createOpen && <BadgeBoardCreate />}
    </>
  )
}
