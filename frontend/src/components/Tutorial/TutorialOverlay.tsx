import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useUiStore } from '../../stores/uiStore'
import { useAuthStore } from '../../stores/authStore'
import { useAuth } from '../../hooks/useAuth'
import { LanguageSelector } from '../LanguageSelector'

const STEPS = [1, 2, 3, 4, 5] as const

export function TutorialOverlay() {
  const { t } = useTranslation()
  const { setShowTutorial } = useUiStore()
  const { markTutorialSeen, handleGoogleLogin } = useAuth()
  const isGuest = useAuthStore((s) => s.isGuest)
  const [step, setStep] = useState(0)

  const close = () => {
    setShowTutorial(false)
    markTutorialSeen()
  }

  const currentStep = STEPS[step]!
  const isLastStep = step === STEPS.length - 1

  return (
    <div className="fixed inset-0 z-[10010] flex items-center justify-center bg-black/50">
      <div className="relative mx-4 w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl">
        <LanguageSelector className="absolute right-4 top-4" />

        {/* Step indicator */}
        <div className="mb-4 flex justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? 'w-6 bg-accent' : 'w-1.5 bg-border'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="mb-6 text-center">
          <h3 className="mb-3 font-serif text-lg font-bold text-dark">
            {t(`tutorial.step${currentStep}.title`)}
          </h3>
          <p className="whitespace-pre-line text-sm leading-relaxed text-text-muted">
            {t(`tutorial.step${currentStep}.body`)}
          </p>
        </div>

        {/* Guest login hint on last step */}
        {isLastStep && isGuest && (
          <button
            type="button"
            onClick={() => {
              close()
              handleGoogleLogin()
            }}
            className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 active:bg-gray-100"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {t('tutorial.loginHint')}
          </button>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="rounded-lg border border-border px-4 py-2 text-sm text-text-muted transition-colors hover:border-accent hover:text-accent"
            >
              {t('tutorial.btn.prev')}
            </button>
          ) : (
            <button
              type="button"
              onClick={close}
              className="rounded-lg border border-border px-4 py-2 text-sm text-text-muted transition-colors hover:border-accent hover:text-accent"
            >
              {t('tutorial.btn.skip')}
            </button>
          )}

          {!isLastStep ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-dark"
            >
              {t('tutorial.btn.next')}
            </button>
          ) : (
            <button
              type="button"
              onClick={close}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-dark"
            >
              {t('tutorial.btn.start')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
