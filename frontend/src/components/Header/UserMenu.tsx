import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../stores/authStore'
import { useUiStore } from '../../stores/uiStore'
import { useCosmeticStore, getMilestone, isSpecialUnlocked } from '../../stores/cosmeticStore'
import { useAuth } from '../../hooks/useAuth'
import { LanguageSelector } from '../LanguageSelector'

export function UserMenu() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const { setShowTutorial } = useUiStore()
  const reviewCount = useCosmeticStore((s) => s.reviewCount)
  const setPanelOpen = useCosmeticStore((s) => s.setPanelOpen)
  const { handleLogout } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const meta = user?.user_metadata ?? {}
  const name = (meta.full_name as string) || (meta.name as string) || user?.email || ''
  const avatar = (meta.avatar_url as string) || (meta.picture as string) || ''
  const email = user?.email || ''

  const milestone = getMilestone(reviewCount)
  const tier = useAuthStore((s) => s.tier)
  const hasGoldProfile = isSpecialUnlocked('special_gold_profile', reviewCount, tier)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border-2 transition-colors hover:border-accent ${hasGoldProfile ? 'avatar-gold-ring' : 'border-border'}`}
      >
        {avatar ? (
          <img
            src={avatar}
            alt={name}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-xs font-bold text-text-muted">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-[9999] mt-2 w-56 rounded-xl bg-surface py-2 shadow-lg ring-1 ring-border">
          {/* User info */}
          <div className="border-b border-border px-4 pb-2">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-text-primary">
              <span>{name.split(' ')[0] || 'User'}</span>
              {milestone && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold text-accent">
                  {milestone.emoji} {t(milestone.titleKey)}
                </span>
              )}
            </div>
            <div className="text-xs text-text-muted">{email}</div>
          </div>

          {/* My Items */}
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              setPanelOpen(true)
            }}
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-text-primary transition-colors hover:bg-bg"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M20 7h-3a2 2 0 0 1-2-2V2" />
              <path d="M9 18a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h7l4 4v10a2 2 0 0 1-2 2Z" />
              <path d="M3 7.6v12.8A1.6 1.6 0 0 0 4.6 22h9.8" />
            </svg>
            {t('cosmetic.menuItem')}
          </button>

          {/* Tutorial */}
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              setShowTutorial(true)
            }}
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-text-primary transition-colors hover:bg-bg"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            {t('menu.tutorial')}
          </button>

          {/* Language */}
          <div className="flex items-center justify-between px-4 py-2 text-sm text-text-primary">
            <span>{t('menu.language')}</span>
            <LanguageSelector />
          </div>

          {/* Logout */}
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              handleLogout()
            }}
            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-danger transition-colors hover:bg-bg"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {t('menu.logout')}
          </button>
        </div>
      )}
    </div>
  )
}
