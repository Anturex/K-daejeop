import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useUiStore } from '../../stores/uiStore'
import { useAuth } from '../../hooks/useAuth'
import { LanguageSelector } from '../LanguageSelector'

const STEPS = [1, 2, 3, 4, 5] as const

export function TutorialOverlay() {
  const { t } = useTranslation()
  const { setShowTutorial } = useUiStore()
  const { markTutorialSeen } = useAuth()
  const [step, setStep] = useState(0)

  const close = () => {
    setShowTutorial(false)
    markTutorialSeen()
  }

  const currentStep = STEPS[step]!

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

          {step < STEPS.length - 1 ? (
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
