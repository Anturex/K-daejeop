import { describe, it, expect, beforeEach } from 'vitest'
import {
  useCosmeticStore,
  getMilestone,
  getNextMilestone,
  getItemsByCategory,
  isUnlocked,
  MILESTONES,
  COSMETIC_ITEMS,
} from '../../src/stores/cosmeticStore'

describe('cosmeticStore', () => {
  beforeEach(() => {
    useCosmeticStore.setState({
      equipped: {
        star_color: null,
        pin_frame: null,
        pin_effect: null,
        pin_tail: null,
        stamp: null,
      },
      reviewCount: 0,
      panelOpen: false,
      loaded: false,
    })
  })

  describe('getMilestone', () => {
    it('returns null for 0 reviews', () => {
      expect(getMilestone(0)).toBeNull()
    })

    it('returns null for fewer than 10 reviews', () => {
      expect(getMilestone(9)).toBeNull()
    })

    it('returns level 1 for exactly 10 reviews', () => {
      const m = getMilestone(10)
      expect(m).not.toBeNull()
      expect(m!.level).toBe(1)
      expect(m!.emoji).toBe('🥄')
    })

    it('returns level 2 for 30 reviews', () => {
      expect(getMilestone(30)!.level).toBe(2)
    })

    it('returns level 3 for 75 reviews', () => {
      expect(getMilestone(75)!.level).toBe(3)
    })

    it('returns level 4 for 150 reviews', () => {
      expect(getMilestone(150)!.level).toBe(4)
    })

    it('returns level 5 for 300 reviews', () => {
      expect(getMilestone(300)!.level).toBe(5)
    })

    it('returns level 6 for 500+ reviews', () => {
      expect(getMilestone(500)!.level).toBe(6)
      expect(getMilestone(999)!.level).toBe(6)
    })

    it('returns highest eligible milestone between tiers', () => {
      expect(getMilestone(74)!.level).toBe(2)
      expect(getMilestone(149)!.level).toBe(3)
    })
  })

  describe('getNextMilestone', () => {
    it('returns level 1 for 0 reviews', () => {
      expect(getNextMilestone(0)!.level).toBe(1)
    })

    it('returns level 2 after reaching level 1', () => {
      expect(getNextMilestone(10)!.level).toBe(2)
    })

    it('returns null when max level reached', () => {
      expect(getNextMilestone(500)).toBeNull()
    })
  })

  describe('getItemsByCategory', () => {
    it('returns star_color items', () => {
      const items = getItemsByCategory('star_color')
      expect(items.length).toBe(7)
      expect(items.every((i) => i.category === 'star_color')).toBe(true)
    })

    it('returns pin_frame items', () => {
      const items = getItemsByCategory('pin_frame')
      expect(items.length).toBe(7)
    })

    it('returns pin_effect items', () => {
      const items = getItemsByCategory('pin_effect')
      expect(items.length).toBe(6)
    })

    it('returns pin_tail items', () => {
      const items = getItemsByCategory('pin_tail')
      expect(items.length).toBe(6)
    })

    it('returns stamp items', () => {
      const items = getItemsByCategory('stamp')
      expect(items.length).toBe(6)
    })
  })

  describe('isUnlocked', () => {
    it('unlocks default items with 0 reviews', () => {
      const defaultItem = COSMETIC_ITEMS.find((i) => i.id === 'star_default')!
      expect(isUnlocked(defaultItem, 0)).toBe(true)
    })

    it('locks items requiring more reviews', () => {
      const roseGold = COSMETIC_ITEMS.find((i) => i.id === 'star_rose_gold')!
      expect(isUnlocked(roseGold, 9)).toBe(false)
      expect(isUnlocked(roseGold, 10)).toBe(true)
    })

    it('locks 500-review items until threshold', () => {
      const aurora = COSMETIC_ITEMS.find((i) => i.id === 'star_aurora')!
      expect(isUnlocked(aurora, 499)).toBe(false)
      expect(isUnlocked(aurora, 500)).toBe(true)
    })
  })

  describe('MILESTONES', () => {
    it('has 6 milestones in ascending order', () => {
      expect(MILESTONES).toHaveLength(6)
      for (let i = 1; i < MILESTONES.length; i++) {
        expect(MILESTONES[i].required).toBeGreaterThan(MILESTONES[i - 1].required)
      }
    })
  })

  describe('store state', () => {
    it('starts with empty equipped state', () => {
      const { equipped } = useCosmeticStore.getState()
      expect(equipped.star_color).toBeNull()
      expect(equipped.pin_frame).toBeNull()
      expect(equipped.pin_effect).toBeNull()
      expect(equipped.pin_tail).toBeNull()
      expect(equipped.stamp).toBeNull()
    })

    it('setPanelOpen toggles panel', () => {
      useCosmeticStore.getState().setPanelOpen(true)
      expect(useCosmeticStore.getState().panelOpen).toBe(true)
      useCosmeticStore.getState().setPanelOpen(false)
      expect(useCosmeticStore.getState().panelOpen).toBe(false)
    })

    it('setReviewCount updates count', () => {
      useCosmeticStore.getState().setReviewCount(42)
      expect(useCosmeticStore.getState().reviewCount).toBe(42)
    })

    it('getPinClasses returns empty string with no equipped items', () => {
      expect(useCosmeticStore.getState().getPinClasses()).toBe('')
    })

    it('getPinClasses returns classes for equipped items', () => {
      useCosmeticStore.setState({
        equipped: {
          star_color: 'star_jade',
          pin_frame: 'frame_wood',
          pin_effect: null,
          pin_tail: null,
          stamp: null,
        },
      })
      const classes = useCosmeticStore.getState().getPinClasses()
      expect(classes).toContain('rv-pin--star-jade')
      expect(classes).toContain('rv-pin--frame-wood')
    })

    it('getPinClasses ignores default items (empty cssClass)', () => {
      useCosmeticStore.setState({
        equipped: {
          star_color: 'star_default',
          pin_frame: null,
          pin_effect: null,
          pin_tail: null,
          stamp: null,
        },
      })
      expect(useCosmeticStore.getState().getPinClasses()).toBe('')
    })

    it('getEquippedItem returns null when nothing equipped', () => {
      expect(useCosmeticStore.getState().getEquippedItem('star_color')).toBeNull()
    })

    it('getEquippedItem returns item when equipped', () => {
      useCosmeticStore.setState({
        equipped: {
          star_color: 'star_jade',
          pin_frame: null,
          pin_effect: null,
          pin_tail: null,
          stamp: null,
        },
      })
      const item = useCosmeticStore.getState().getEquippedItem('star_color')
      expect(item).not.toBeNull()
      expect(item!.id).toBe('star_jade')
    })
  })
})
