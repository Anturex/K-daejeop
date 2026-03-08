import { useTranslation } from 'react-i18next'
import { SearchBar } from './SearchBar'
import { UserMenu } from './UserMenu'
import { useUiStore } from '../../stores/uiStore'

export function Header() {
  const { t } = useTranslation()
  const { myReviewsActive, setMyReviewsActive, badgePanelActive, setBadgePanelActive } =
    useUiStore()

  return (
    <header className="relative z-[9000] flex items-center gap-2 bg-surface px-3 pb-2 pl-[calc(0.75rem+env(safe-area-inset-left,0px))] pr-[calc(0.75rem+env(safe-area-inset-right,0px))] pt-[calc(0.5rem+env(safe-area-inset-top,0px))] shadow-sm">
      {/* Brand — click to refresh */}
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="flex items-center gap-1.5"
      >
        <div className="h-7 w-7 overflow-hidden rounded-full bg-[#C4A265] shadow-sm">
          <img
            src="/icon-256.png"
            alt="K-daejeop"
            className="h-full w-full scale-[1.12] object-cover"
          />
        </div>
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

      {/* Badge toggle */}
      <button
        type="button"
        onClick={() => setBadgePanelActive(!badgePanelActive)}
        className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
          badgePanelActive
            ? 'bg-accent text-white'
            : 'border border-border text-text-muted hover:border-accent hover:text-accent'
        }`}
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill={badgePanelActive ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="8" r="6" />
          <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
        </svg>
        <span className="hidden sm:inline">{t('badge.title')}</span>
      </button>

      {/* User menu */}
      <UserMenu />
    </header>
  )
}
