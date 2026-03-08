import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  currentDescription: string
  onConfirm: (description: string) => void
  onCancel: () => void
}

export function PublishModal({ currentDescription, onConfirm, onCancel }: Props) {
  const { t } = useTranslation()
  const [desc, setDesc] = useState(currentDescription)

  return (
    <div
      className="fixed inset-0 z-[10001] flex items-end justify-center bg-black/50 sm:items-center"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="w-full rounded-t-2xl bg-surface sm:max-w-md sm:rounded-2xl">
        {/* Header */}
        <div className="border-b border-border px-4 py-3">
          <span className="font-serif text-sm font-semibold">
            {t('badge.publishTitle')}
          </span>
        </div>

        {/* Body */}
        <div className="px-4 py-3">
          <p className="mb-2 text-xs text-text-muted">
            {t('badge.publishDescHint')}
          </p>
          <div className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
            </svg>
            <p className="text-xs font-medium text-amber-800">
              {t('badge.publishWarning')}
            </p>
          </div>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            maxLength={120}
            rows={3}
            placeholder={t('badge.publishDescPlaceholder')}
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none max-sm:text-base"
          />
          <div className="mt-1 text-right text-[10px] text-text-muted">
            {desc.length}/120
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-border px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-text-muted transition-colors hover:border-accent hover:text-accent"
          >
            {t('review.cancel')}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(desc.trim())}
            className="flex-1 rounded-xl bg-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-dark"
          >
            {t('badge.publish')}
          </button>
        </div>
      </div>
    </div>
  )
}
