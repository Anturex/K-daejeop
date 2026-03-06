import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  SUPPORTED_LANGS,
  LANG_LABELS,
  LANG_SHORT,
  type SupportedLang,
} from '../i18n'

interface LanguageSelectorProps {
  className?: string
}

export function LanguageSelector({ className = '' }: LanguageSelectorProps) {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

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
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-text-muted transition-colors hover:border-accent hover:text-accent"
        aria-label="Language"
      >
        <GlobeIcon />
        <span>{LANG_SHORT[i18n.language as SupportedLang] || 'KO'}</span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 min-w-[120px] overflow-hidden rounded-xl bg-surface py-1 shadow-lg ring-1 ring-border">
          {SUPPORTED_LANGS.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => {
                i18n.changeLanguage(code)
                setOpen(false)
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-bg ${
                i18n.language === code
                  ? 'font-semibold text-accent'
                  : 'text-text-primary'
              }`}
            >
              {i18n.language === code && (
                <span className="text-accent">&#10003;</span>
              )}
              <span className={i18n.language === code ? '' : 'ml-5'}>
                {LANG_LABELS[code]}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function GlobeIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}
