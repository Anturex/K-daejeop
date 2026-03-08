import { useState, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useBadgeStore } from '../../stores/badgeStore'
import type { BadgeBoard } from '../../stores/badgeStore'
import { useAuthStore } from '../../stores/authStore'
import { useUiStore } from '../../stores/uiStore'

export function AddToBoardModal() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const showToast = useUiStore((s) => s.showToast)
  const {
    addToBoardPlace,
    closeAddToBoard,
    boards,
    fetchBoards,
    addPlaceToBoard,
    setCreateOpen,
  } = useBadgeStore()

  const [adding, setAdding] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!loaded) {
      fetchBoards().then(() => setLoaded(true))
    }
  }, [loaded, fetchBoards])

  const myBoards = boards.filter((b) => b.creator_id === user?.id)

  const handleAdd = useCallback(
    async (board: BadgeBoard) => {
      if (!addToBoardPlace || adding) return
      setAdding(board.id)

      const ok = await addPlaceToBoard(board.id, addToBoardPlace)
      setAdding(null)

      if (ok) {
        showToast(t('badge.addedToBoard', { 0: board.title }), 3000)
        closeAddToBoard()
      } else {
        showToast(t('badge.alreadyInBoard'), 3000)
      }
    },
    [addToBoardPlace, adding, addPlaceToBoard, showToast, t, closeAddToBoard],
  )

  const handleCreateNew = useCallback(() => {
    closeAddToBoard()
    setCreateOpen(true)
  }, [closeAddToBoard, setCreateOpen])

  if (!addToBoardPlace) return null

  return (
    <div
      className="fixed inset-0 z-[10001] flex items-end justify-center bg-black/50 sm:items-center"
      onClick={(e) => e.target === e.currentTarget && closeAddToBoard()}
    >
      <div className="flex max-h-[60vh] w-full flex-col rounded-t-2xl bg-surface sm:max-w-sm sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="font-serif text-sm font-semibold">
            {t('badge.addToBoardTitle')}
          </span>
          <button
            type="button"
            onClick={closeAddToBoard}
            className="rounded-full p-1 text-text-muted hover:text-text-primary"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Place being added */}
        <div className="border-b border-border px-4 py-2">
          <div className="truncate text-sm font-medium text-text-primary">
            {addToBoardPlace.place_name}
          </div>
          <div className="truncate text-xs text-text-muted">
            {addToBoardPlace.address_name}
          </div>
        </div>

        {/* Board list */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {!loaded ? (
            <div className="py-6 text-center text-xs text-text-muted">...</div>
          ) : myBoards.length === 0 ? (
            <div className="py-6 text-center">
              <div className="mb-2 text-2xl">📋</div>
              <div className="mb-3 text-sm text-text-muted">
                {t('badge.noBoardsOwned')}
              </div>
              <button
                type="button"
                onClick={handleCreateNew}
                className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-dark"
              >
                {t('badge.create')}
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                {myBoards.map((board) => (
                  <button
                    key={board.id}
                    type="button"
                    onClick={() => handleAdd(board)}
                    disabled={adding === board.id}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-bg active:bg-accent/5 disabled:opacity-50"
                  >
                    <span className="text-lg">{board.icon_emoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-text-primary">
                        {board.title}
                      </div>
                      <div className="text-[10px] text-text-muted">
                        {t('badge.places', { 0: board.place_count })}
                      </div>
                    </div>
                    {adding === board.id && (
                      <span className="text-xs text-text-muted">...</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Create new board option */}
              <button
                type="button"
                onClick={handleCreateNew}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-accent/30 py-2.5 text-xs font-semibold text-accent transition-colors hover:border-accent hover:bg-accent/5"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                {t('badge.create')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
