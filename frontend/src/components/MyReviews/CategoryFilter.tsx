import { useTranslation } from 'react-i18next'
import type { CategoryCounts } from './useCluster'

type CategoryKey = 'all' | 'restaurant' | 'cafe' | 'attraction' | 'etc'

const CATEGORIES: CategoryKey[] = [
  'all',
  'restaurant',
  'cafe',
  'attraction',
  'etc',
]

const CATEGORY_EMOJI: Record<CategoryKey, string> = {
  all: '📍',
  restaurant: '🍽️',
  cafe: '☕',
  attraction: '🏛️',
  etc: '📌',
}

interface CategoryFilterProps {
  activeCategory: string
  counts: CategoryCounts
  onSelect: (category: string) => void
}

export function CategoryFilter({
  activeCategory,
  counts,
  onSelect,
}: CategoryFilterProps) {
  const { t } = useTranslation()

  return (
    <div className="flex gap-1.5 overflow-x-auto px-3 py-2 scrollbar-none">
      {CATEGORIES.map((cat) => {
        const isActive = activeCategory === cat
        const count = counts[cat]

        return (
          <button
            key={cat}
            type="button"
            onClick={() => onSelect(cat)}
            className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              isActive
                ? 'bg-accent text-white'
                : 'border border-border bg-surface text-text-muted hover:border-accent hover:text-accent'
            }`}
          >
            <span>{CATEGORY_EMOJI[cat]} {t(`category.${cat}`)}</span>
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
