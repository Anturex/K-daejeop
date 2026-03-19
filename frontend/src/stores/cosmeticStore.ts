import { create } from 'zustand'
import { getSupabase } from '../services/supabase'
import { useAuthStore } from './authStore'

// ─── Milestone tiers ───────────────────────────────────────────
export interface Milestone {
  level: number
  required: number
  emoji: string
  titleKey: string // i18n key
}

export const MILESTONES: Milestone[] = [
  { level: 1, required: 10, emoji: '🥄', titleKey: 'cosmetic.tier.1' },
  { level: 2, required: 30, emoji: '🥢', titleKey: 'cosmetic.tier.2' },
  { level: 3, required: 75, emoji: '🍳', titleKey: 'cosmetic.tier.3' },
  { level: 4, required: 150, emoji: '🔪', titleKey: 'cosmetic.tier.4' },
  { level: 5, required: 300, emoji: '🏅', titleKey: 'cosmetic.tier.5' },
  { level: 6, required: 500, emoji: '👨‍🍳', titleKey: 'cosmetic.tier.6' },
]

export function getMilestone(reviewCount: number): Milestone | null {
  for (let i = MILESTONES.length - 1; i >= 0; i--) {
    if (reviewCount >= MILESTONES[i].required) return MILESTONES[i]
  }
  return null
}

export function getNextMilestone(reviewCount: number): Milestone | null {
  return MILESTONES.find((m) => reviewCount < m.required) ?? null
}

// ─── Cosmetic item definitions ────────────────────────────────
export type CosmeticCategory =
  | 'star_color'
  | 'pin_frame'
  | 'pin_effect'
  | 'pin_tail'
  | 'stamp'

export interface CosmeticItem {
  id: string
  category: CosmeticCategory
  nameKey: string // i18n key
  required: number // review count to unlock
  cssClass: string // CSS class applied to pin
}

export const COSMETIC_ITEMS: CosmeticItem[] = [
  // ── Star Colors ──
  { id: 'star_default', category: 'star_color', nameKey: 'cosmetic.star.default', required: 0, cssClass: '' },
  { id: 'star_rose_gold', category: 'star_color', nameKey: 'cosmetic.star.roseGold', required: 10, cssClass: 'rv-pin--star-rose' },
  { id: 'star_jade', category: 'star_color', nameKey: 'cosmetic.star.jade', required: 30, cssClass: 'rv-pin--star-jade' },
  { id: 'star_amethyst', category: 'star_color', nameKey: 'cosmetic.star.amethyst', required: 75, cssClass: 'rv-pin--star-amethyst' },
  { id: 'star_cherry', category: 'star_color', nameKey: 'cosmetic.star.cherry', required: 150, cssClass: 'rv-pin--star-cherry' },
  { id: 'star_obsidian', category: 'star_color', nameKey: 'cosmetic.star.obsidian', required: 300, cssClass: 'rv-pin--star-obsidian' },
  { id: 'star_aurora', category: 'star_color', nameKey: 'cosmetic.star.aurora', required: 500, cssClass: 'rv-pin--star-aurora' },

  // ── Pin Frames ──
  { id: 'frame_default', category: 'pin_frame', nameKey: 'cosmetic.frame.default', required: 0, cssClass: '' },
  { id: 'frame_wood', category: 'pin_frame', nameKey: 'cosmetic.frame.wood', required: 10, cssClass: 'rv-pin--frame-wood' },
  { id: 'frame_hanji', category: 'pin_frame', nameKey: 'cosmetic.frame.hanji', required: 30, cssClass: 'rv-pin--frame-hanji' },
  { id: 'frame_dancheong', category: 'pin_frame', nameKey: 'cosmetic.frame.dancheong', required: 75, cssClass: 'rv-pin--frame-dancheong' },
  { id: 'frame_gold', category: 'pin_frame', nameKey: 'cosmetic.frame.gold', required: 150, cssClass: 'rv-pin--frame-gold' },
  { id: 'frame_lacquer', category: 'pin_frame', nameKey: 'cosmetic.frame.lacquer', required: 300, cssClass: 'rv-pin--frame-lacquer' },
  { id: 'frame_dragon', category: 'pin_frame', nameKey: 'cosmetic.frame.dragon', required: 500, cssClass: 'rv-pin--frame-dragon' },

  // ── Pin Effects ──
  { id: 'effect_none', category: 'pin_effect', nameKey: 'cosmetic.effect.none', required: 0, cssClass: '' },
  { id: 'effect_steam', category: 'pin_effect', nameKey: 'cosmetic.effect.steam', required: 30, cssClass: 'rv-pin--fx-steam' },
  { id: 'effect_sparkle', category: 'pin_effect', nameKey: 'cosmetic.effect.sparkle', required: 75, cssClass: 'rv-pin--fx-sparkle' },
  { id: 'effect_halo', category: 'pin_effect', nameKey: 'cosmetic.effect.halo', required: 150, cssClass: 'rv-pin--fx-halo' },
  { id: 'effect_sakura', category: 'pin_effect', nameKey: 'cosmetic.effect.sakura', required: 300, cssClass: 'rv-pin--fx-sakura' },
  { id: 'effect_flame', category: 'pin_effect', nameKey: 'cosmetic.effect.flame', required: 500, cssClass: 'rv-pin--fx-flame' },

  // ── Pin Tails ──
  { id: 'tail_default', category: 'pin_tail', nameKey: 'cosmetic.tail.default', required: 0, cssClass: '' },
  { id: 'tail_ocher', category: 'pin_tail', nameKey: 'cosmetic.tail.ocher', required: 10, cssClass: 'rv-pin__tail--ocher' },
  { id: 'tail_heart', category: 'pin_tail', nameKey: 'cosmetic.tail.heart', required: 75, cssClass: 'rv-pin__tail--heart' },
  { id: 'tail_star', category: 'pin_tail', nameKey: 'cosmetic.tail.star', required: 150, cssClass: 'rv-pin__tail--star' },
  { id: 'tail_chopsticks', category: 'pin_tail', nameKey: 'cosmetic.tail.chopsticks', required: 300, cssClass: 'rv-pin__tail--chopsticks' },
  { id: 'tail_crown', category: 'pin_tail', nameKey: 'cosmetic.tail.crown', required: 500, cssClass: 'rv-pin__tail--crown' },

  // ── Stamps ──
  { id: 'stamp_none', category: 'stamp', nameKey: 'cosmetic.stamp.none', required: 0, cssClass: '' },
  { id: 'stamp_taste', category: 'stamp', nameKey: 'cosmetic.stamp.taste', required: 30, cssClass: 'rv-pin--stamp-taste' },
  { id: 'stamp_fivestar', category: 'stamp', nameKey: 'cosmetic.stamp.fiveStar', required: 75, cssClass: 'rv-pin--stamp-fivestar' },
  { id: 'stamp_gourmet', category: 'stamp', nameKey: 'cosmetic.stamp.gourmet', required: 150, cssClass: 'rv-pin--stamp-gourmet' },
  { id: 'stamp_vip', category: 'stamp', nameKey: 'cosmetic.stamp.vip', required: 300, cssClass: 'rv-pin--stamp-vip' },
  { id: 'stamp_royal', category: 'stamp', nameKey: 'cosmetic.stamp.royal', required: 500, cssClass: 'rv-pin--stamp-royal' },
]

export function getItemsByCategory(category: CosmeticCategory): CosmeticItem[] {
  return COSMETIC_ITEMS.filter((i) => i.category === category)
}

export function isUnlocked(item: CosmeticItem, reviewCount: number): boolean {
  return reviewCount >= item.required
}

// ─── Equipped state (persisted in Supabase) ───────────────────
export interface EquippedCosmetics {
  star_color: string | null
  pin_frame: string | null
  pin_effect: string | null
  pin_tail: string | null
  stamp: string | null
}

const DEFAULT_EQUIPPED: EquippedCosmetics = {
  star_color: null,
  pin_frame: null,
  pin_effect: null,
  pin_tail: null,
  stamp: null,
}

interface CosmeticState {
  equipped: EquippedCosmetics
  reviewCount: number
  panelOpen: boolean
  loaded: boolean

  setPanelOpen: (open: boolean) => void
  setReviewCount: (count: number) => void
  loadEquipped: () => Promise<void>
  equip: (category: CosmeticCategory, itemId: string | null) => Promise<void>
  getEquippedItem: (category: CosmeticCategory) => CosmeticItem | null
  getPinClasses: () => string
}

export const useCosmeticStore = create<CosmeticState>((set, get) => ({
  equipped: { ...DEFAULT_EQUIPPED },
  reviewCount: 0,
  panelOpen: false,
  loaded: false,

  setPanelOpen: (open) => set({ panelOpen: open }),
  setReviewCount: (count) => set({ reviewCount: count }),

  loadEquipped: async () => {
    const user = useAuthStore.getState().user
    if (!user) return

    const { data } = await getSupabase()
      .from('user_profiles')
      .select('equipped_cosmetics')
      .eq('user_id', user.id)
      .single()

    if (data?.equipped_cosmetics) {
      set({ equipped: { ...DEFAULT_EQUIPPED, ...data.equipped_cosmetics }, loaded: true })
    } else {
      set({ loaded: true })
    }
  },

  equip: async (category, itemId) => {
    const user = useAuthStore.getState().user
    if (!user) return

    const next = { ...get().equipped, [category]: itemId }
    set({ equipped: next })

    await getSupabase()
      .from('user_profiles')
      .update({ equipped_cosmetics: next })
      .eq('user_id', user.id)
  },

  getEquippedItem: (category) => {
    const id = get().equipped[category]
    if (!id) return null
    return COSMETIC_ITEMS.find((i) => i.id === id) ?? null
  },

  getPinClasses: () => {
    const { equipped } = get()
    const classes: string[] = []
    for (const cat of ['star_color', 'pin_frame', 'pin_effect', 'pin_tail', 'stamp'] as CosmeticCategory[]) {
      const id = equipped[cat]
      if (!id) continue
      const item = COSMETIC_ITEMS.find((i) => i.id === id)
      if (item?.cssClass) classes.push(item.cssClass)
    }
    return classes.join(' ')
  },
}))
