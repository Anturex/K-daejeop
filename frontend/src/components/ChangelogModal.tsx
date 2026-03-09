import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

const CHANGELOG_VERSION = '2026-03-10b'
const STORAGE_KEY = 'k_changelog_seen'

interface ChangelogEntry {
  emoji: string
  key: string
}

const ENTRIES: ChangelogEntry[] = [
  { emoji: '🏆', key: 'changelog.badgeIntro' },
  { emoji: '📝', key: 'changelog.badgePersonal' },
  { emoji: '🔗', key: 'changelog.badgeShare' },
  { emoji: '🌍', key: 'changelog.badgePublish' },
]

export function ChangelogModal() {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY)
    if (seen !== CHANGELOG_VERSION) {
      setVisible(true)
    }
  }, [])

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, CHANGELOG_VERSION)
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-[10005] flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl">
        <div className="mb-4 text-center">
          <div className="mb-1 text-2xl">🎉</div>
          <h2 className="font-serif text-lg font-bold text-text-primary">
            {t('changelog.title')}
          </h2>
        </div>

        <ul className="mb-6 space-y-3">
          {ENTRIES.map((entry) => (
            <li key={entry.key} className="flex items-start gap-3 text-sm text-text-primary">
              <span className="shrink-0 text-base">{entry.emoji}</span>
              <span>{t(entry.key)}</span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={handleClose}
          className="w-full rounded-xl bg-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-dark"
        >
          {t('changelog.close')}
        </button>
      </div>
    </div>
  )
}
