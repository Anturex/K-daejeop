import { useTranslation } from 'react-i18next'
import type { RatingCounts } from './useCluster'

type RatingKey = 'all' | '0' | '1' | '2' | '3'

const RATINGS: RatingKey[] = ['all', '0', '1', '2', '3']

const RATING_DISPLAY: Record<RatingKey, string> = {
  all: '',
  '0': '\u2715',
  '1': '\u2605',
  '2': '\u2605\u2605',
  '3': '\u2605\u2605\u2605',
}

interface RatingFilterProps {
  activeRating: string
  counts: RatingCounts
  onSelect: (rating: string) => void
}

export function RatingFilter({
  activeRating,
  counts,
  onSelect,
}: RatingFilterProps) {
  const { t } = useTranslation()

  return (
    <div className="flex gap-1.5 overflow-x-auto px-3 py-1.5 scrollbar-none">
      {RATINGS.map((key) => {
        const isActive = activeRating === key
        const count = counts[key]
        const isDanger = key === '0'
        const label =
          key === 'all' ? t('ratingFilter.all') : RATING_DISPLAY[key]

        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              isActive
                ? isDanger
                  ? 'bg-danger text-white'
                  : 'bg-accent text-white'
                : 'border border-border bg-surface text-text-muted hover:border-accent hover:text-accent'
            }`}
          >
            <span className={isDanger && !isActive ? 'text-danger' : ''}>
              {label}
            </span>
            {count > 0 && (
              <span
                className={`inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                  isActive
                    ? 'bg-white/25 text-white'
                    : 'bg-border/50 text-text-muted'
                }`}
              >
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
