import { useTranslation } from 'react-i18next'
import type { BadgeBoard } from '../../stores/badgeStore'

interface Props {
  board: BadgeBoard
  progress: { reviewed: number; total: number; percent: number }
  completed: boolean
  onClick: () => void
  isSaved?: boolean
}

export function BadgeBoardCard({ board, progress, completed, onClick, isSaved }: Props) {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border border-border bg-surface p-3 text-left transition-colors hover:border-accent/40 active:bg-bg"
    >
      <div className="flex items-start gap-3">
        {/* Emoji icon */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-bg text-xl">
          {board.icon_emoji}
        </div>

        <div className="min-w-0 flex-1">
          {/* Title */}
          <div className="flex items-center gap-1.5">
            <span className="truncate font-serif text-sm font-semibold text-text-primary">
              {board.title}
            </span>
            {completed && (
              <span className="shrink-0 text-xs text-accent">
                {t('badge.completed')}
              </span>
            )}
            {isSaved && !completed && (
              <span className="shrink-0 text-[10px] text-text-muted">
                {t('badge.savedLabel')}
              </span>
            )}
          </div>

          {/* Description */}
          {board.description && (
            <div className="mt-0.5 truncate text-xs text-text-muted">
              {board.description}
            </div>
          )}

          {/* Progress */}
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-accent transition-all duration-300"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <span className="shrink-0 text-[10px] font-semibold text-text-muted">
              {progress.reviewed}/{progress.total}
            </span>
          </div>
        </div>
      </div>
    </button>
  )
}
