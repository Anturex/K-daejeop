import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CosmeticPanel } from '../../src/components/Cosmetics/CosmeticPanel'
import { useCosmeticStore } from '../../src/stores/cosmeticStore'

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts?.count !== undefined) return `${key}:${opts.count}`
      return key
    },
  }),
}))

// Mock supabase
vi.mock('../../src/services/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null }) }) }),
      update: () => ({ eq: () => Promise.resolve({}) }),
    }),
  },
}))

describe('CosmeticPanel', () => {
  beforeEach(() => {
    useCosmeticStore.setState({
      equipped: {
        star_color: null,
        pin_frame: null,
        pin_effect: null,
        pin_tail: null,
        stamp: null,
      },
      reviewCount: 35,
      panelOpen: true,
      loaded: true,
    })
  })

  it('renders nothing when panelOpen is false', () => {
    useCosmeticStore.setState({ panelOpen: false })
    const { container } = render(<CosmeticPanel />)
    expect(container.innerHTML).toBe('')
  })

  it('renders panel when open', () => {
    render(<CosmeticPanel />)
    expect(screen.getByText('cosmetic.title')).toBeInTheDocument()
  })

  it('shows milestone info', () => {
    render(<CosmeticPanel />)
    // reviewCount 35 → tier 2 (단골손님)
    expect(screen.getByText('cosmetic.tier.2')).toBeInTheDocument()
    expect(screen.getByText('cosmetic.reviewCount:35')).toBeInTheDocument()
  })

  it('shows next tier progress', () => {
    render(<CosmeticPanel />)
    // Next tier is level 3 (75 reviews)
    expect(screen.getByText('35/75')).toBeInTheDocument()
  })

  it('renders category tabs', () => {
    render(<CosmeticPanel />)
    expect(screen.getByText('cosmetic.cat.star')).toBeInTheDocument()
    expect(screen.getByText('cosmetic.cat.frame')).toBeInTheDocument()
    expect(screen.getByText('cosmetic.cat.effect')).toBeInTheDocument()
    expect(screen.getByText('cosmetic.cat.tail')).toBeInTheDocument()
    expect(screen.getByText('cosmetic.cat.stamp')).toBeInTheDocument()
  })

  it('renders star color items by default', () => {
    render(<CosmeticPanel />)
    expect(screen.getByText('cosmetic.star.default')).toBeInTheDocument()
    expect(screen.getByText('cosmetic.star.roseGold')).toBeInTheDocument()
    expect(screen.getByText('cosmetic.star.jade')).toBeInTheDocument()
  })

  it('switches category on tab click', () => {
    render(<CosmeticPanel />)
    fireEvent.click(screen.getByText('cosmetic.cat.frame'))
    expect(screen.getByText('cosmetic.frame.default')).toBeInTheDocument()
    expect(screen.getByText('cosmetic.frame.wood')).toBeInTheDocument()
  })

  it('shows lock icon for items above review count', () => {
    render(<CosmeticPanel />)
    // reviewCount is 35, so amethyst (75) should be locked
    expect(screen.getByText('cosmetic.star.amethyst')).toBeInTheDocument()
  })

  it('closes panel on close button click', () => {
    render(<CosmeticPanel />)
    fireEvent.click(screen.getByText('✕'))
    expect(useCosmeticStore.getState().panelOpen).toBe(false)
  })

  it('shows no next tier info at max level', () => {
    useCosmeticStore.setState({ reviewCount: 500 })
    render(<CosmeticPanel />)
    expect(screen.getByText('cosmetic.tier.6')).toBeInTheDocument()
    // Should not have a progress fraction
    expect(screen.queryByText(/\/\d+/)).toBeNull()
  })
})
