import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { useAuthStore } from '../stores/authStore'

export function LoginPromptModal() {
  const { t } = useTranslation()
  const { handleGoogleLogin, isLoggingIn } = useAuth()
  const setShowLoginPrompt = useAuthStore((s) => s.setShowLoginPrompt)

  return (
    <div
      className="fixed inset-0 z-[10001] flex items-end justify-center sm:items-center"
      onClick={() => setShowLoginPrompt(false)}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative mx-4 mb-0 w-full max-w-sm rounded-t-2xl bg-surface p-6 shadow-xl sm:mb-0 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="mb-4 text-center text-4xl">📝</div>

        {/* Title & Description */}
        <h3 className="mb-2 text-center font-serif text-lg font-bold text-dark">
          {t('loginPrompt.title')}
        </h3>
        <p className="mb-6 text-center text-sm leading-relaxed text-text-muted">
          {t('loginPrompt.desc')}
        </p>

        {/* Google Login */}
        <button
          onClick={() => {
            setShowLoginPrompt(false)
            handleGoogleLogin()
          }}
          disabled={isLoggingIn}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 active:bg-gray-100 disabled:opacity-60"
        >
          <GoogleIcon />
          {isLoggingIn ? '...' : t('login.google')}
        </button>

        {/* Dismiss */}
        <button
          onClick={() => setShowLoginPrompt(false)}
          className="mt-2 flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm text-text-muted transition-colors hover:bg-gray-50 active:bg-gray-100"
        >
          {t('loginPrompt.later')}
        </button>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}
