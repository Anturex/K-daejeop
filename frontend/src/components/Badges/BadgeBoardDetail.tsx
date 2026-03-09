import { useState, useCallback, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useBadgeStore, computeProgress } from '../../stores/badgeStore'
import type { BadgeBoardPlace } from '../../stores/badgeStore'
import { useMapStore } from '../../stores/mapStore'
import { useAuthStore } from '../../stores/authStore'
import { useUiStore } from '../../stores/uiStore'
import { useReviewStore } from '../../stores/reviewStore'
import { getSupabase } from '../../services/supabase'
import { searchPlaces, type PlaceResult } from '../../services/api'
import { PublishModal } from './PublishModal'

const EMOJI_OPTIONS = ['🏆', '🍜', '🍣', '☕', '🏔️', '🌊', '🎯', '🗺️', '🎪', '🍕', '🍺', '🌸']

export function BadgeBoardDetail() {
  const { t } = useTranslation()
  const {
    selectedBoard,
    boardPlaces,
    closeBoard,
    deleteBoard,
    checkCompletion,
    publishBoard,
    creatorReviews,
    fetchCreatorReviews,
    saveBoard,
    fetchBoards,
    boards,
    updateBoard,
    removePlaceFromBoard,
    refreshBoardPlaces,
    addPlaceToBoard,
  } = useBadgeStore()
  const map = useMapStore((s) => s.map)
  const user = useAuthStore((s) => s.user)
  const tier = useAuthStore((s) => s.tier)
  const showToast = useUiStore((s) => s.showToast)
  const myBadges = useBadgeStore((s) => s.myBadges)
  const cachedReviews = useReviewStore((s) => s.cachedReviews)
  const openDetail = useReviewStore((s) => s.openDetail)

  const [publishModalOpen, setPublishModalOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editEmoji, setEditEmoji] = useState('')
  const [saving, setSaving] = useState(false)
  const [editSearchQuery, setEditSearchQuery] = useState('')
  const [editSearchResults, setEditSearchResults] = useState<PlaceResult[]>([])
  const [editSearching, setEditSearching] = useState(false)

  const editDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const progress = computeProgress(boardPlaces)
  const isCreator = user?.id === selectedBoard?.creator_id
  const isSavedBoard = !!selectedBoard?.source_creator_id
  const isOriginalCreator = isCreator && !isSavedBoard
  const isCompleted = selectedBoard ? myBadges.includes(selectedBoard.id) : false
  const alreadySaved = selectedBoard
    ? boards.some((b) => b.source_board_id === selectedBoard.id)
    : false
  const isEditable = isCreator && !selectedBoard?.is_public && !selectedBoard?.source_board_id

  // Auto-check completion when 100%
  const handleCheckCompletion = useCallback(async () => {
    if (!selectedBoard || !user) return
    if (progress.percent === 100 && !isCompleted) {
      const earned = await checkCompletion(selectedBoard.id, user.id)
      if (earned) {
        showToast(t('badge.earned'), 4000)
      }
    }
  }, [selectedBoard, user, progress.percent, isCompleted, checkCompletion, showToast, t])

  // Check on mount-like trigger
  if (progress.percent === 100 && !isCompleted && selectedBoard && user) {
    handleCheckCompletion()
  }

  const handlePlaceClick = useCallback(
    (place: BadgeBoardPlace) => {
      if (!map) return
      const lat = parseFloat(place.place_y)
      const lng = parseFloat(place.place_x)
      if (isNaN(lat) || isNaN(lng)) return

      // Hide panel so user can see the map
      window.dispatchEvent(new Event('badge:hide-panel'))

      map.setCenter(new kakao.maps.LatLng(lat, lng))
      map.setLevel(3)

      // Open review detail if place has reviews
      if (place.reviewed) {
        const placeReviews = (cachedReviews ?? []).filter((r) => r.place_id === place.place_id)
        if (placeReviews.length > 0) {
          openDetail(placeReviews, 0)
        }
      }
    },
    [map, cachedReviews, openDetail],
  )

  // Fetch creator reviews when viewing someone else's public board OR saved board
  useEffect(() => {
    if (!selectedBoard) return
    if ((!isCreator && selectedBoard.is_public) || isSavedBoard) {
      fetchCreatorReviews(selectedBoard.id)
    }
  }, [selectedBoard, isCreator, isSavedBoard, fetchCreatorReviews])

  // Listen for review:saved event → refresh board places reviewed status
  useEffect(() => {
    const handler = async () => {
      const currentUser = useAuthStore.getState().user
      if (!currentUser) return
      const sb = getSupabase()
      const { data } = await sb
        .from('reviews')
        .select('place_id')
        .eq('user_id', currentUser.id)
      if (data) {
        refreshBoardPlaces(new Set(data.map((r: { place_id: string }) => r.place_id)))
      }
    }
    window.addEventListener('review:saved', handler)
    return () => window.removeEventListener('review:saved', handler)
  }, [refreshBoardPlaces])

  const handleCopyCode = useCallback(() => {
    if (!selectedBoard?.share_code) return
    navigator.clipboard.writeText(selectedBoard.share_code).catch(() => {})
    showToast(t('badge.shareCodeCopied'), 2000)
  }, [selectedBoard, showToast, t])

  const handleDelete = useCallback(async () => {
    if (!selectedBoard) return
    const confirmMsg = isSavedBoard ? t('badge.removeConfirm') : t('badge.deleteConfirm')
    if (!window.confirm(confirmMsg)) return
    const ok = await deleteBoard(selectedBoard.id)
    if (ok) {
      showToast(isSavedBoard ? t('badge.removed') : t('badge.deleted'), 2500)
      closeBoard()
    }
  }, [selectedBoard, isSavedBoard, deleteBoard, closeBoard, showToast, t])

  const handlePublish = useCallback(() => {
    if (!selectedBoard) return
    if (tier !== 'premium') {
      showToast(t('badge.publishPremiumOnly'), 3000)
      return
    }
    if (progress.percent < 100) {
      showToast(t('badge.publishRequireAll'), 3000)
      return
    }
    // Monthly limit: check locally before opening modal
    const now = new Date()
    const ago30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const recentPublishes = boards.filter(
      (b) => b.published_at && new Date(b.published_at) > ago30d && !b.source_board_id,
    )
    if (recentPublishes.length >= 1) {
      showToast(t('badge.publishMonthlyLimit'), 3000)
      return
    }
    setPublishModalOpen(true)
  }, [selectedBoard, tier, progress.percent, boards, showToast, t])

  const handlePublishConfirm = useCallback(
    async (description: string) => {
      if (!selectedBoard) return
      const result = await publishBoard(selectedBoard.id, description)
      if (result === 'ok') {
        showToast(t('badge.published'), 3000)
      } else if (result === 'monthly_limit') {
        showToast(t('badge.publishMonthlyLimit'), 3000)
      } else if (result === 'incomplete') {
        showToast(t('badge.publishRequireAll'), 3000)
      } else if (result === 'error') {
        showToast(t('badge.publishError'), 3000)
      }
      setPublishModalOpen(false)
    },
    [selectedBoard, publishBoard, showToast, t],
  )

  const handleSaveBoard = useCallback(async () => {
    if (!selectedBoard || !user) return
    const saved = await saveBoard(user.id, selectedBoard, boardPlaces)
    if (saved) {
      showToast(t('badge.boardSaved'), 3000)
      await fetchBoards()
    }
  }, [selectedBoard, user, boardPlaces, saveBoard, showToast, t, fetchBoards])

  const handleUnsaveBoard = useCallback(async () => {
    if (!selectedBoard) return
    if (!window.confirm(t('badge.removeConfirm'))) return
    const savedCopy = boards.find((b) => b.source_board_id === selectedBoard.id)
    if (!savedCopy) return
    const ok = await deleteBoard(savedCopy.id)
    if (ok) {
      showToast(t('badge.removed'), 2500)
      await fetchBoards()
    }
  }, [selectedBoard, boards, deleteBoard, showToast, t, fetchBoards])

  const handleHideBoard = useCallback(() => {
    if (!selectedBoard) return
    const key = 'k_hidden_boards'
    const hidden: string[] = JSON.parse(localStorage.getItem(key) || '[]')
    if (!hidden.includes(selectedBoard.id)) {
      hidden.push(selectedBoard.id)
      localStorage.setItem(key, JSON.stringify(hidden))
    }
    closeBoard()
    showToast(t('badge.hiddenToast'), 2500)
  }, [selectedBoard, closeBoard, showToast, t])

  // Edit mode handlers
  const handleStartEdit = useCallback(() => {
    if (!selectedBoard) return
    setEditTitle(selectedBoard.title)
    setEditDesc(selectedBoard.description || '')
    setEditEmoji(selectedBoard.icon_emoji)
    setEditMode(true)
  }, [selectedBoard])

  const handleSaveEdit = useCallback(async () => {
    if (!selectedBoard || !editTitle.trim()) return
    setSaving(true)
    const ok = await updateBoard(selectedBoard.id, {
      title: editTitle.trim(),
      description: editDesc.trim(),
      icon_emoji: editEmoji,
    })
    setSaving(false)
    if (ok) {
      setEditMode(false)
      showToast(t('badge.editSaved'), 2500)
    }
  }, [selectedBoard, editTitle, editDesc, editEmoji, updateBoard, showToast, t])

  const handleRemovePlace = useCallback(
    async (placeId: string) => {
      if (!selectedBoard) return
      if (boardPlaces.length <= 2) {
        showToast(t('badge.err.places'), 3000)
        return
      }
      await removePlaceFromBoard(selectedBoard.id, placeId)
    },
    [selectedBoard, boardPlaces.length, removePlaceFromBoard, showToast, t],
  )

  const handleEditSearch = useCallback((q: string) => {
    setEditSearchQuery(q)
    if (editDebounceRef.current) clearTimeout(editDebounceRef.current)
    if (!q.trim()) {
      setEditSearchResults([])
      return
    }
    editDebounceRef.current = setTimeout(async () => {
      setEditSearching(true)
      try {
        const res = await searchPlaces(q)
        setEditSearchResults(res.documents.slice(0, 6))
      } catch {
        setEditSearchResults([])
      }
      setEditSearching(false)
    }, 300)
  }, [])

  const handleAddPlace = useCallback(async (place: PlaceResult) => {
    if (!selectedBoard) return
    await addPlaceToBoard(selectedBoard.id, place)
    setEditSearchQuery('')
    setEditSearchResults([])
  }, [selectedBoard, addPlaceToBoard])

  if (!selectedBoard) return null

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <button
          type="button"
          onClick={() => { setEditMode(false); closeBoard() }}
          className="rounded-full p-1 text-text-muted transition-colors hover:bg-bg hover:text-text-primary"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {editMode ? (
          <>
            <span
              className="cursor-pointer text-lg"
              onClick={() => {
                const idx = EMOJI_OPTIONS.indexOf(editEmoji)
                setEditEmoji(EMOJI_OPTIONS[(idx + 1) % EMOJI_OPTIONS.length])
              }}
            >
              {editEmoji}
            </span>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              maxLength={30}
              className="min-w-0 flex-1 rounded-lg border border-border bg-bg px-2 py-1 font-serif text-sm font-semibold text-text-primary focus:border-accent focus:outline-none max-sm:text-base"
            />
          </>
        ) : (
          <>
            <span className="mr-1 text-lg">{selectedBoard.icon_emoji}</span>
            <span className="flex-1 truncate font-serif text-sm font-semibold">
              {selectedBoard.title}
            </span>
          </>
        )}

        {!editMode && isEditable && (
          <button
            type="button"
            onClick={handleStartEdit}
            className="rounded-full p-1.5 text-text-muted transition-colors hover:bg-bg hover:text-text-primary"
            aria-label={t('badge.edit')}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        )}
        {!editMode && isOriginalCreator && !selectedBoard.is_public && (
          <button
            type="button"
            onClick={handlePublish}
            className="rounded-full bg-accent/10 px-2 py-1 text-xs font-semibold text-accent transition-colors hover:bg-accent/20"
          >
            {t('badge.publish')}
          </button>
        )}
        {!editMode && isCreator && (
          <button
            type="button"
            onClick={handleDelete}
            className="rounded-full px-2 py-1 text-xs text-danger transition-colors hover:bg-danger/10"
          >
            {isSavedBoard ? t('badge.removeFromList') : t('badge.delete')}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {/* Progress bar */}
        <div className="mb-4">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium text-text-muted">
              {t('badge.progress', { 0: progress.reviewed, 1: progress.total })}
            </span>
            {isCompleted && (
              <span className="font-semibold text-accent">
                {t('badge.completed')}
              </span>
            )}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>

        {/* Description (edit mode: textarea, otherwise: text) */}
        {editMode ? (
          <div className="mb-3">
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              maxLength={60}
              rows={2}
              placeholder={t('badge.boardDesc')}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none max-sm:text-base"
            />
          </div>
        ) : (
          selectedBoard.description && (
            <p className="mb-3 text-xs text-text-muted">
              {selectedBoard.description}
            </p>
          )
        )}

        {/* Emoji selector in edit mode */}
        {editMode && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {EMOJI_OPTIONS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEditEmoji(e)}
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-base transition-colors ${
                  editEmoji === e
                    ? 'bg-accent/20 ring-2 ring-accent'
                    : 'bg-bg hover:bg-border'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        )}

        {/* Place search in edit mode */}
        {editMode && (
          <div className="relative mb-3">
            <label className="mb-1 block text-xs font-semibold text-text-muted">
              {t('badge.addPlace')}
            </label>
            <input
              type="text"
              value={editSearchQuery}
              onChange={(e) => handleEditSearch(e.target.value)}
              placeholder={t('badge.searchPlace')}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none max-sm:text-base"
            />
            {editSearching && (
              <div className="absolute right-3 top-[calc(1.25rem+50%)] -translate-y-1/2 text-xs text-text-muted">
                ...
              </div>
            )}
            {editSearchResults.length > 0 && (
              <ul className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-lg bg-surface shadow-lg ring-1 ring-border">
                {editSearchResults.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => handleAddPlace(r)}
                      disabled={boardPlaces.some((p) => p.place_id === r.id)}
                      className="w-full px-3 py-2 text-left text-sm transition-colors hover:bg-bg disabled:opacity-40"
                    >
                      <div className="font-medium text-text-primary">{r.place_name}</div>
                      <div className="text-xs text-text-muted">{r.address_name}</div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Place list */}
        <div className="space-y-1.5">
          {boardPlaces.map((place) => (
            <div key={place.id} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => !editMode && handlePlaceClick(place)}
                className={`flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                  editMode
                    ? 'cursor-default'
                    : place.reviewed
                      ? 'bg-accent/5 text-text-primary'
                      : 'text-text-muted hover:bg-bg'
                }`}
              >
                {/* Check icon */}
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                    place.reviewed
                      ? 'border-accent bg-accent text-white'
                      : 'border-border'
                  }`}
                >
                  {place.reviewed && (
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>

                {/* Place info */}
                <div className="min-w-0 flex-1">
                  <div className={`truncate text-sm font-medium ${place.reviewed ? '' : 'text-text-muted'}`}>
                    {place.place_name}
                  </div>
                  <div className="truncate text-[11px] text-text-muted">
                    {place.place_address}
                  </div>
                </div>
              </button>

              {/* Creator review button for saved boards */}
              {!editMode && isSavedBoard && creatorReviews.some((r) => r.place_id === place.place_id) && (
                <button
                  type="button"
                  onClick={() => {
                    const crReviews = creatorReviews.filter((r) => r.place_id === place.place_id)
                    openDetail(crReviews, 0)
                  }}
                  className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent transition-colors hover:bg-accent/20"
                >
                  {t('badge.creatorReview')}
                </button>
              )}

              {/* Remove button in edit mode */}
              {editMode && (
                <button
                  type="button"
                  onClick={() => handleRemovePlace(place.place_id)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Edit mode save/cancel */}
        {editMode && (
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setEditMode(false)}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-text-muted transition-colors hover:border-accent hover:text-accent"
            >
              {t('review.cancel')}
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              disabled={saving || !editTitle.trim()}
              className="flex-1 rounded-xl bg-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-50"
            >
              {saving ? '...' : t('badge.save')}
            </button>
          </div>
        )}

        {/* Add to my boards (non-creator viewing) */}
        {!editMode && !isCreator && !isSavedBoard && (
          <div className="mt-4 space-y-2">
            {alreadySaved ? (
              <button
                type="button"
                onClick={handleUnsaveBoard}
                className="w-full rounded-xl border border-danger/30 py-2.5 text-sm font-semibold text-danger transition-colors hover:bg-danger/10"
              >
                {t('badge.removeFromList')}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleSaveBoard}
                  className="w-full rounded-xl bg-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-dark"
                >
                  {t('badge.addToMyBoards')}
                </button>
                <button
                  type="button"
                  onClick={handleHideBoard}
                  className="w-full rounded-xl py-2 text-xs text-text-muted transition-colors hover:bg-bg"
                >
                  {t('badge.hideBoard')}
                </button>
              </>
            )}
          </div>
        )}

        {/* Share code (creator of original board, any tier) */}
        {!editMode && selectedBoard.share_code && isOriginalCreator && (
          <div className="mt-4 flex items-center justify-between rounded-lg bg-bg px-3 py-2">
            <div>
              <span className="text-[10px] text-text-muted">{t('badge.shareCode')}</span>
              <div className="font-mono text-sm font-bold tracking-widest text-accent">
                {selectedBoard.share_code}
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopyCode}
              className="rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold text-text-muted transition-colors hover:border-accent hover:text-accent"
            >
              {t('badge.copyCode')}
            </button>
          </div>
        )}
      </div>

      {/* Publish modal */}
      {publishModalOpen && (
        <PublishModal
          currentDescription={selectedBoard.description ?? ''}
          onConfirm={handlePublishConfirm}
          onCancel={() => setPublishModalOpen(false)}
        />
      )}
    </div>
  )
}
