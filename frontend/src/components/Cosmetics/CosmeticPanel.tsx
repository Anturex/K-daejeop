import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useCosmeticStore,
  getMilestone,
  getNextMilestone,
  getItemsByCategory,
  isUnlocked,
  isSpecialUnlocked,
  type CosmeticCategory,
  type CosmeticItem,
} from '../../stores/cosmeticStore'
import { useAuthStore } from '../../stores/authStore'

const CATEGORIES: { key: CosmeticCategory; icon: string; labelKey: string }[] = [
  { key: 'star_color', icon: '⭐', labelKey: 'cosmetic.cat.star' },
  { key: 'pin_frame', icon: '📌', labelKey: 'cosmetic.cat.frame' },
  { key: 'pin_effect', icon: '✨', labelKey: 'cosmetic.cat.effect' },
  { key: 'pin_tail', icon: '📍', labelKey: 'cosmetic.cat.tail' },
  { key: 'stamp', icon: '🔖', labelKey: 'cosmetic.cat.stamp' },
  { key: 'special', icon: '🎁', labelKey: 'cosmetic.cat.special' },
]

const IS_DEV = new URLSearchParams(window.location.search).has('dev')

export function CosmeticPanel() {
  const { t } = useTranslation()
  const { equipped, reviewCount, panelOpen, setPanelOpen, equip, setReviewCount } =
    useCosmeticStore()
  const tier = useAuthStore((s) => s.tier)
  const [activeTab, setActiveTab] = useState<CosmeticCategory>('star_color')

  if (!panelOpen) return null

  const milestone = getMilestone(reviewCount)
  const next = getNextMilestone(reviewCount)
  const items = getItemsByCategory(activeTab)
  const equippedId = activeTab !== 'special' ? equipped[activeTab] : null

  const progressPercent = next
    ? Math.min(100, (reviewCount / next.required) * 100)
    : 100

  return (
    <div className="fixed inset-0 z-[10001] flex items-end justify-center bg-black/40 sm:items-center">
      <div className="animate-slide-up flex max-h-[85vh] w-full max-w-md flex-col rounded-t-2xl bg-surface sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-serif text-base font-bold text-text-primary">
            {t('cosmetic.title')}
          </h2>
          <button
            type="button"
            onClick={() => setPanelOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-bg"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {/* Milestone info */}
          <div className="mb-4 rounded-xl bg-bg p-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">{milestone?.emoji ?? '🍽️'}</span>
              <div className="flex-1">
                <div className="text-sm font-semibold text-text-primary">
                  {milestone ? t(milestone.titleKey) : t('cosmetic.tier.none')}
                </div>
                <div className="text-xs text-text-muted">
                  {t('cosmetic.reviewCount', { count: reviewCount })}
                </div>
              </div>
            </div>

            {next && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-[10px] text-text-muted">
                  <span>
                    {t('cosmetic.nextTier', { emoji: next.emoji, name: t(next.titleKey) })}
                  </span>
                  <span>{reviewCount}/{next.required}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-accent transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* DEV: review count slider (localStorage k_dev=1) */}
            {IS_DEV && (
              <div className="mt-3 border-t border-border pt-2">
                <div className="flex items-center justify-between text-[10px] font-bold text-amber-600">
                  <span>🛠 DEV: 리뷰 수 조절</span>
                  <span>{reviewCount}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1200}
                  step={10}
                  value={reviewCount}
                  onChange={(e) => setReviewCount(Number(e.target.value))}
                  className="mt-1 w-full accent-amber-600"
                />
                <div className="mt-1 flex flex-wrap gap-1">
                  {[0, 10, 30, 75, 150, 200, 300, 400, 500, 600, 1000].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setReviewCount(v)}
                      className={`rounded px-1.5 py-0.5 text-[9px] font-bold transition-colors ${
                        reviewCount >= v
                          ? 'bg-amber-600 text-white'
                          : 'bg-border text-text-muted'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    equip('star_color', null)
                    equip('pin_frame', null)
                    equip('pin_effect', null)
                    equip('pin_tail', null)
                    equip('stamp', null)
                  }}
                  className="mt-2 w-full rounded-lg bg-border px-2 py-1 text-[10px] font-bold text-text-muted"
                >
                  기본 템 초기화
                </button>
              </div>
            )}
          </div>

          {/* Category tabs */}
          <div className="no-scrollbar -mx-4 mb-4 flex gap-1 overflow-x-auto px-4">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setActiveTab(cat.key)}
                className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  activeTab === cat.key
                    ? 'bg-accent text-white'
                    : 'border border-border text-text-muted hover:border-accent'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{t(cat.labelKey)}</span>
              </button>
            ))}
          </div>

          {/* Item grid (normal categories) */}
          {activeTab !== 'special' && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {items.map((item) => {
                const unlocked = isUnlocked(item, reviewCount)
                const isEquipped = equippedId === item.id || (!equippedId && item.required === 0)
                const isDefault = item.required === 0

                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => {
                      if (!unlocked) return
                      if (isDefault) {
                        equip(activeTab, null)
                      } else if (isEquipped) {
                        equip(activeTab, null)
                      } else {
                        equip(activeTab, item.id)
                      }
                    }}
                    className={`relative flex flex-col items-center gap-1 rounded-xl border-2 p-2.5 text-center transition-all ${
                      isEquipped
                        ? 'border-accent bg-accent/10'
                        : unlocked
                          ? 'border-border bg-surface hover:border-accent/40'
                          : 'border-border/50 bg-bg/50 opacity-50'
                    }`}
                  >
                    <ItemPreview item={item} />
                    <span className="text-[10px] font-medium leading-tight text-text-primary">
                      {t(item.nameKey)}
                    </span>
                    {!unlocked && (
                      <span className="text-[9px] text-text-muted">
                        🔒 {item.required}{t('cosmetic.reviewsNeeded')}
                      </span>
                    )}
                    {isEquipped && (
                      <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[8px] text-white">
                        ✓
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* Special (hidden) items — list card layout */}
          {activeTab === 'special' && (
            <div className="flex flex-col gap-2">
              {tier !== 'premium' && (
                <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
                  🔒 {t('cosmetic.special.premiumOnly')}
                </div>
              )}
              {items.map((item) => {
                const unlocked = isSpecialUnlocked(item.id, reviewCount, tier)
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 rounded-xl border-2 p-3 transition-all ${
                      unlocked
                        ? 'border-accent/50 bg-accent/5'
                        : 'border-border/50 bg-bg/50'
                    }`}
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl ${
                      unlocked ? 'bg-accent/15' : 'bg-border/50 animate-pulse'
                    }`}>
                      {unlocked ? '🎁' : '❓'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-text-primary">
                        {unlocked ? t(item.nameKey) : '???'}
                      </div>
                      <div className="text-xs text-text-muted">
                        {unlocked && item.descKey
                          ? t(item.descKey)
                          : `${item.required}${t('cosmetic.reviewsNeeded')}`}
                      </div>
                    </div>
                    {unlocked && (
                      <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-white">
                        {t('cosmetic.special.active')}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* Small visual preview for each item type */
function ItemPreview({ item }: { item: CosmeticItem }) {
  if (item.category === 'star_color') {
    const colorMap: Record<string, string> = {
      star_default: '#F9A825',
      star_rose_gold: '#E8967D',
      star_jade: '#4CAF50',
      star_amethyst: '#9C6ADE',
      star_cherry: '#F48FB1',
      star_obsidian: '#2D2D2D',
      star_aurora: '',
    }
    const color = colorMap[item.id]
    if (item.id === 'star_aurora') {
      return (
        <span
          className="text-lg"
          style={{
            background: 'linear-gradient(90deg, #F9A825, #E8967D, #9C6ADE, #4CAF50, #F48FB1)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          ★★★
        </span>
      )
    }
    return <span className="text-lg" style={{ color: color || '#F9A825' }}>★★★</span>
  }

  if (item.category === 'pin_frame') {
    const previewMap: Record<string, string> = {
      frame_default: '□',
      frame_wood: '🪵',
      frame_hanji: '📜',
      frame_dancheong: '🎨',
      frame_gold: '🏆',
      frame_lacquer: '🏺',
      frame_dragon: '🐉',
    }
    return <span className="text-xl">{previewMap[item.id] ?? '□'}</span>
  }

  if (item.category === 'pin_effect') {
    const previewMap: Record<string, string> = {
      effect_none: '—',
      effect_steam: '♨️',
      effect_sparkle: '✨',
      effect_halo: '💫',
      effect_sakura: '🌸',
      effect_flame: '🔥',
    }
    return <span className="text-xl">{previewMap[item.id] ?? '—'}</span>
  }

  if (item.category === 'pin_tail') {
    const previewMap: Record<string, string> = {
      tail_default: '▼',
      tail_ocher: '▼',
      tail_heart: '♥',
      tail_star: '★',
      tail_chopsticks: '🥢',
      tail_crown: '👑',
    }
    return <span className="text-xl">{previewMap[item.id] ?? '▼'}</span>
  }

  if (item.category === 'stamp') {
    const previewMap: Record<string, string> = {
      stamp_none: '—',
      stamp_taste: '味',
      stamp_fivestar: '⭐',
      stamp_gourmet: '美',
      stamp_vip: '🏅',
      stamp_royal: '🌺',
    }
    return (
      <span className="text-xl" style={item.id === 'stamp_taste' ? { color: '#C23B22', fontFamily: 'serif', fontWeight: 900 } : undefined}>
        {previewMap[item.id] ?? '—'}
      </span>
    )
  }

  return <span className="text-xl">—</span>
}
