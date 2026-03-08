import { useState, useCallback, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { searchPlaces, type PlaceResult } from '../../services/api'
import { useBadgeStore } from '../../stores/badgeStore'
import { useAuthStore } from '../../stores/authStore'
import { useUiStore } from '../../stores/uiStore'

const EMOJI_OPTIONS = ['🏆', '🍜', '🍣', '☕', '🏔️', '🌊', '🎯', '🗺️', '🎪', '🍕', '🍺', '🌸']
const DEBOUNCE_MS = 300

export function BadgeBoardCreate() {
  const { t } = useTranslation()
  const { createBoard, setCreateOpen, fetchBoards } = useBadgeStore()
  const user = useAuthStore((s) => s.user)
  const showToast = useUiStore((s) => s.showToast)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [emoji, setEmoji] = useState('🏆')
  const [places, setPlaces] = useState<PlaceResult[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([])
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const searchAreaRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to search area when results appear
  useEffect(() => {
    if (searchResults.length > 0 && searchAreaRef.current) {
      searchAreaRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [searchResults])

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!q.trim()) {
      setSearchResults([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await searchPlaces(q)
        setSearchResults(res.documents.slice(0, 6))
      } catch {
        setSearchResults([])
      }
      setSearching(false)
    }, DEBOUNCE_MS)
  }, [])

  const addPlace = useCallback(
    (place: PlaceResult) => {
      if (places.some((p) => p.id === place.id)) return
      setPlaces((prev) => [...prev, place])
      setSearchQuery('')
      setSearchResults([])
    },
    [places],
  )

  const removePlace = useCallback((placeId: string) => {
    setPlaces((prev) => prev.filter((p) => p.id !== placeId))
  }, [])

  const handleSave = useCallback(async () => {
    setError('')

    if (!title.trim()) {
      setError(t('badge.err.title'))
      return
    }
    if (places.length < 2) {
      setError(t('badge.err.places'))
      return
    }
    if (!user) return

    setSaving(true)
    const board = await createBoard(
      user.id,
      title.trim(),
      description.trim(),
      emoji,
      false,
      places,
    )
    setSaving(false)

    if (board) {
      showToast(t('badge.saved'), 3000)
      await fetchBoards()
      setCreateOpen(false)
    }
  }, [title, places, user, createBoard, description, emoji, showToast, t, fetchBoards, setCreateOpen])

  return (
    <div
      className="fixed inset-0 z-[10001] flex items-end justify-center bg-black/50 sm:items-center"
      onClick={(e) => e.target === e.currentTarget && setCreateOpen(false)}
    >
      <div className="flex max-h-[85vh] w-full flex-col rounded-t-2xl bg-surface sm:max-w-md sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="font-serif text-sm font-semibold">
            {t('badge.createTitle')}
          </span>
          <button
            type="button"
            onClick={() => setCreateOpen(false)}
            className="rounded-full p-1 text-text-muted hover:text-text-primary"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {/* Error */}
          {error && (
            <div className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-xs font-medium text-danger">
              {error}
            </div>
          )}

          {/* Emoji selector */}
          <label className="mb-1 block text-xs font-semibold text-text-muted">
            {t('badge.boardEmoji')}
          </label>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {EMOJI_OPTIONS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg transition-colors ${
                  emoji === e
                    ? 'bg-accent/10 ring-2 ring-accent'
                    : 'bg-bg hover:bg-border/50'
                }`}
              >
                {e}
              </button>
            ))}
          </div>

          {/* Title */}
          <label className="mb-1 block text-xs font-semibold text-text-muted">
            {t('badge.boardTitle')}
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="라멘 원정기"
            maxLength={30}
            className="mb-3 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none max-sm:text-base"
          />

          {/* Description */}
          <label className="mb-1 block text-xs font-semibold text-text-muted">
            {t('badge.boardDesc')}
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="서울 주요 라멘집 5곳 탐방"
            maxLength={60}
            className="mb-3 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none max-sm:text-base"
          />

          {/* Place search */}
          <label ref={searchAreaRef} className="mb-1 block text-xs font-semibold text-text-muted">
            {t('badge.addPlace')}
          </label>
          <div className="relative mb-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={t('badge.searchPlace')}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none max-sm:text-base"
            />
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted">
                ...
              </div>
            )}

            {/* Search results dropdown */}
            {searchResults.length > 0 && (
              <ul className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-lg bg-surface shadow-lg ring-1 ring-border">
                {searchResults.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => addPlace(r)}
                      disabled={places.some((p) => p.id === r.id)}
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

          {/* Added places */}
          {places.length > 0 && (
            <div className="space-y-1">
              {places.map((p, i) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 rounded-lg bg-bg px-3 py-2"
                >
                  <span className="text-xs font-bold text-text-muted">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-text-primary">
                      {p.place_name}
                    </div>
                    <div className="truncate text-[10px] text-text-muted">
                      {p.address_name}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removePlace(p.id)}
                    className="shrink-0 rounded-full p-1 text-text-muted hover:text-danger"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-border px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
          <button
            type="button"
            onClick={() => setCreateOpen(false)}
            className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-text-muted transition-colors hover:border-accent hover:text-accent"
          >
            {t('review.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-xl bg-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-50"
          >
            {saving ? '...' : t('badge.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
