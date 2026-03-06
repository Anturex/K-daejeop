import { useTranslation } from 'react-i18next'
import { SearchBar } from './SearchBar'
import { UserMenu } from './UserMenu'
import { useUiStore } from '../../stores/uiStore'

export function Header() {
  const { t } = useTranslation()
  const { myReviewsActive, setMyReviewsActive } = useUiStore()

  return (
    <header className="relative z-[9000] flex items-center gap-2 bg-surface px-3 py-2 shadow-sm">
      {/* Brand — click to refresh */}
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="flex items-center gap-1.5"
      >
        <img
          src="/icon-256.png"
          alt="K-daejeop"
          className="h-7 w-7"
        />
        <span className="hidden font-serif text-sm font-bold text-dark sm:inline">
          K-daejeop
        </span>
      </button>

      {/* Search */}
      <div className="flex-1">
        <SearchBar />
      </div>

      {/* My Reviews toggle */}
      <button
        type="button"
        onClick={() => setMyReviewsActive(!myReviewsActive)}
        className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
          myReviewsActive
            ? 'bg-accent text-white'
            : 'border border-border text-text-muted hover:border-accent hover:text-accent'
        }`}
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill={myReviewsActive ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="2"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
        <span className="hidden sm:inline">{t('myReviews.title')}</span>
      </button>

      {/* User menu */}
      <UserMenu />
    </header>
  )
}
