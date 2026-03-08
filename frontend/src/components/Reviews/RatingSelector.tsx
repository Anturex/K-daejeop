import { useTranslation } from 'react-i18next'

interface RatingSelectorProps {
  value: number | null
  onChange: (rating: number) => void
}

const RATINGS = [0, 1, 2, 3] as const

const STAR_DISPLAY: Record<number, string> = {
  0: '\u2715',
  1: '\u2605',
  2: '\u2605\u2605',
  3: '\u2605\u2605\u2605',
}

export function RatingSelector({ value, onChange }: RatingSelectorProps) {
  const { t } = useTranslation()

  return (
    <div className="grid grid-cols-2 gap-2.5">
      {RATINGS.map((rating) => {
        const isSelected = value === rating
        const isZero = rating === 0

        return (
          <button
            key={rating}
            type="button"
            onClick={() => onChange(rating)}
            className={`flex cursor-pointer flex-col items-center rounded-xl border-2 px-2 py-3 transition-all ${
              isSelected
                ? isZero
                  ? 'border-danger bg-danger/10 shadow-sm'
                  : 'border-accent bg-accent/10 shadow-sm'
                : 'border-border bg-surface hover:border-accent-light'
            }`}
          >
            <span
              className={`mb-1 text-lg ${
                isSelected
                  ? isZero
                    ? 'text-danger'
                    : 'text-star'
                  : 'text-text-muted'
              }`}
            >
              {STAR_DISPLAY[rating]}
            </span>
            <span
              className={`text-sm font-semibold ${
                isSelected
                  ? isZero
                    ? 'text-danger'
                    : 'text-accent-dark'
                  : 'text-text-primary'
              }`}
            >
              {t(`review.rating${rating}.title`)}
            </span>
            <span className="mt-0.5 text-center text-xs text-text-muted">
              {t(`review.rating${rating}.desc`)}
            </span>
          </button>
        )
      })}
    </div>
  )
}
