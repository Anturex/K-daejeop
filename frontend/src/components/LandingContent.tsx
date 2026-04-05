import { useTranslation } from 'react-i18next'

export function LandingContent() {
  const { t } = useTranslation()

  return (
    <div className="bg-bg px-4 py-8">
      <div className="mx-auto max-w-sm space-y-6">
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
                  <span className="shrink-0 text-accent">&bull;</span>
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
  )
}
