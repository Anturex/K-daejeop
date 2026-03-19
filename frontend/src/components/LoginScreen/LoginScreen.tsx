import { useTranslation, Trans } from 'react-i18next'
import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useAuthStore } from '../../stores/authStore'
import { LegalModal } from './LegalModal'
import { LanguageSelector } from '../LanguageSelector'

export function LoginScreen() {
  const { t } = useTranslation()
  const { handleGoogleLogin, isLoggingIn } = useAuth()
  const loginAsGuest = useAuthStore((s) => s.loginAsGuest)
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | null>(
    null,
  )

  return (
    <div className="fixed inset-0 z-[10000] overflow-y-auto bg-bg">
      {/* Background gradient */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/10 via-transparent to-accent/5" />
      </div>

      <div className="relative z-10 flex min-h-full flex-col items-center px-4 py-10">
        {/* Login card */}
        <div className="w-full max-w-sm rounded-2xl bg-surface p-8 shadow-xl">
          {/* Top bar: spacer + language */}
          <div className="mb-4 flex items-center justify-end">
            <LanguageSelector />
          </div>

          {/* Header */}
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 h-16 w-16 overflow-hidden rounded-full bg-[#C4A265] shadow-md">
              <img
                src="/icon-256.png"
                alt="K-daejeop"
                className="h-full w-full scale-[1.12] object-cover"
              />
            </div>
            <h1 className="font-serif text-2xl font-bold text-dark">
              K-daejeop
            </h1>
            <p
              className="mt-2 text-sm text-text-muted"
              dangerouslySetInnerHTML={{ __html: t('login.subtitle') }}
            />
          </div>

          {/* Features */}
          <div className="mb-6 space-y-3">
            <Feature icon="search" text={t('login.feature.search')} />
            <Feature icon="star" text={t('login.feature.rating')} />
            <Feature icon="users" text={t('login.feature.unlock')} />
          </div>

          {/* Google Login button */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoggingIn}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 active:bg-gray-100 disabled:opacity-60"
          >
            <GoogleIcon />
            {isLoggingIn ? '...' : t('login.google')}
          </button>

          {/* Guest demo button */}
          <button
            onClick={loginAsGuest}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-transparent px-4 py-2.5 text-xs text-text-muted transition-colors hover:bg-gray-50 active:bg-gray-100"
          >
            {t('login.guest')}
          </button>

          {/* Footer */}
          <p className="mt-4 text-center text-xs text-text-muted">
            <Trans
              i18nKey="login.footer"
              components={{
                a: (
                  // eslint-disable-next-line jsx-a11y/anchor-has-content
                  <a
                    href="#"
                    className="underline hover:text-accent"
                    onClick={(e) => {
                      e.preventDefault()
                      const target = e.currentTarget.getAttribute('href')
                      if (target === '#terms') setLegalModal('terms')
                      else if (target === '#privacy') setLegalModal('privacy')
                    }}
                  />
                ),
              }}
            />
          </p>

          {/* Loading spinner */}
          {isLoggingIn && (
            <div className="mt-4 flex justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            </div>
          )}
        </div>

        {/* Service intro sections */}
        <div className="mt-8 w-full max-w-sm space-y-6">
          {/* About */}
          <section className="rounded-2xl bg-surface p-6 shadow-sm">
            <h2 className="mb-3 font-serif text-lg font-bold text-dark">
              {t('landing.aboutTitle')}
            </h2>
            <p className="text-sm leading-relaxed text-text-primary">
              {t('landing.aboutDesc')}
            </p>
          </section>

          {/* How to use */}
          <section className="rounded-2xl bg-surface p-6 shadow-sm">
            <h2 className="mb-3 font-serif text-lg font-bold text-dark">
              {t('landing.howTitle')}
            </h2>
            <ol className="space-y-2 text-sm leading-relaxed text-text-primary">
              {[1, 2, 3, 4].map((n) => (
                <li key={n} className="flex gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent">
                    {n}
                  </span>
                  <span>{t(`landing.step${n}`)}</span>
                </li>
              ))}
            </ol>
          </section>

          {/* Features */}
          <section className="rounded-2xl bg-surface p-6 shadow-sm">
            <h2 className="mb-3 font-serif text-lg font-bold text-dark">
              {t('landing.featuresTitle')}
            </h2>
            <ul className="space-y-2 text-sm leading-relaxed text-text-primary">
              {(['rating', 'verified', 'cluster', 'badge'] as const).map(
                (key) => (
                  <li key={key} className="flex gap-2">
                    <span className="shrink-0 text-accent">•</span>
                    <span>{t(`landing.feat.${key}`)}</span>
                  </li>
                ),
              )}
            </ul>
          </section>

          {/* FAQ */}
          <section className="rounded-2xl bg-surface p-6 shadow-sm">
            <h2 className="mb-3 font-serif text-lg font-bold text-dark">
              {t('landing.faqTitle')}
            </h2>
            <dl className="space-y-3 text-sm leading-relaxed text-text-primary">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n}>
                  <dt className="font-semibold text-dark">
                    {t(`landing.faq.q${n}`)}
                  </dt>
                  <dd className="mt-0.5 text-text-muted">
                    {t(`landing.faq.a${n}`)}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </div>

      {legalModal && (
        <LegalModal
          type={legalModal}
          onClose={() => setLegalModal(null)}
        />
      )}
    </div>
  )
}

function Feature({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-text-primary">
      <FeatureIcon type={icon} />
      <span>{text}</span>
    </div>
  )
}

function FeatureIcon({ type }: { type: string }) {
  const cls = 'h-[18px] w-[18px] text-accent'
  switch (type) {
    case 'search':
      return (
        <svg
          className={cls}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      )
    case 'star':
      return (
        <svg
          className={cls}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      )
    case 'users':
      return (
        <svg
          className={cls}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    default:
      return null
  }
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}
