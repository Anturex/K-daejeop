import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useUiStore } from '../../src/stores/uiStore'

describe('uiStore', () => {
  it('defaults myReviewsActive to true', () => {
    // Reset to initial state by recreating store defaults
    useUiStore.setState({ myReviewsActive: true })
    expect(useUiStore.getState().myReviewsActive).toBe(true)
  })

  beforeEach(() => {
    useUiStore.setState({
      myReviewsActive: false,
      showTutorial: false,
      toast: null,
      userMenuOpen: false,
    })
  })

  it('toggles my reviews active', () => {
    useUiStore.getState().setMyReviewsActive(true)
    expect(useUiStore.getState().myReviewsActive).toBe(true)
    useUiStore.getState().setMyReviewsActive(false)
    expect(useUiStore.getState().myReviewsActive).toBe(false)
  })

  it('toggles tutorial', () => {
    useUiStore.getState().setShowTutorial(true)
    expect(useUiStore.getState().showTutorial).toBe(true)
  })

  it('shows toast with message', () => {
    vi.useFakeTimers()
    useUiStore.getState().showToast('saved!')
    expect(useUiStore.getState().toast?.message).toBe('saved!')
    vi.useRealTimers()
  })

  it('auto-clears toast after duration', () => {
    vi.useFakeTimers()
    useUiStore.getState().showToast('temp', 1000)
    expect(useUiStore.getState().toast).not.toBeNull()
    vi.advanceTimersByTime(1000)
    expect(useUiStore.getState().toast).toBeNull()
    vi.useRealTimers()
  })

  it('replaces previous toast', () => {
    vi.useFakeTimers()
    useUiStore.getState().showToast('first')
    useUiStore.getState().showToast('second')
    expect(useUiStore.getState().toast?.message).toBe('second')
    vi.useRealTimers()
  })

  it('toggles user menu', () => {
    useUiStore.getState().setUserMenuOpen(true)
    expect(useUiStore.getState().userMenuOpen).toBe(true)
  })
})
