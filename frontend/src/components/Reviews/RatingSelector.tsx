import { useTranslation } from 'react-i18next'

interface RatingSelectorProps {
  value: number
  onChange: (rating: number) => void
}

const RATINGS = [1, 2, 3] as const

const STAR_DISPLAY: Record<number, string> = {
  1: '\u2605',
  2: '\u2605\u2605',
  3: '\u2605\u2605\u2605',
}

export function RatingSelector({ value, onChange }: RatingSelectorProps) {
  const { t } = useTranslation()

  return (
    <div className="flex gap-2.5">
      {RATINGS.map((rating) => (
        <button
          key={rating}
          type="button"
          onClick={() => onChange(rating)}
          className={`flex flex-1 cursor-pointer flex-col items-center rounded-xl border-2 px-2 py-3 transition-all ${
            value === rating
              ? 'border-accent bg-accent/10 shadow-sm'
              : 'border-border bg-surface hover:border-accent-light'
          }`}
        >
          <span
            className={`mb-1 text-lg ${
              value === rating ? 'text-star' : 'text-text-muted'
            }`}
          >
            {STAR_DISPLAY[rating]}
          </span>
          <span
            className={`text-sm font-semibold ${
              value === rating ? 'text-accent-dark' : 'text-text-primary'
            }`}
          >
            {t(`review.rating${rating}.title`)}
          </span>
          <span className="mt-0.5 text-xs text-text-muted">
            {t(`review.rating${rating}.desc`)}
          </span>
        </button>
      ))}
    </div>
  )
}
