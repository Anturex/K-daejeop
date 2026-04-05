import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from '../../src/stores/authStore'

describe('authStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.setState({
      user: null,
      session: null,
      tier: 'free',
      isAuthenticated: false,
      isLoading: true,
      tutorialSeen: false,
      isGuest: false,
      showLoginModal: false,
      showLoginPrompt: false,
    })
  })

  it('starts unauthenticated', () => {
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.user).toBeNull()
    expect(state.session).toBeNull()
  })

  it('setSession updates authentication state', () => {
    const mockSession = {
      access_token: 'test',
      refresh_token: 'test',
      user: { id: 'u1', email: 'test@test.com' },
    } as never

    useAuthStore.getState().setSession(mockSession)
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(true)
    expect(state.session).toBe(mockSession)
  })

  it('setSession(null) clears authentication', () => {
    useAuthStore.setState({ isAuthenticated: true })
    useAuthStore.getState().setSession(null)
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('setTier updates tier', () => {
    useAuthStore.getState().setTier('premium')
    expect(useAuthStore.getState().tier).toBe('premium')
  })

  it('logout resets all state', () => {
    useAuthStore.setState({
      isAuthenticated: true,
      tier: 'premium',
      tutorialSeen: true,
    })
    useAuthStore.getState().logout()
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.tier).toBe('free')
    expect(state.tutorialSeen).toBe(false)
    expect(state.user).toBeNull()
    expect(state.session).toBeNull()
  })

  it('setTutorialSeen persists', () => {
    useAuthStore.getState().setTutorialSeen(true)
    expect(useAuthStore.getState().tutorialSeen).toBe(true)
  })

  it('setLoading updates loading state', () => {
    useAuthStore.getState().setLoading(false)
    expect(useAuthStore.getState().isLoading).toBe(false)
  })

  it('loginAsGuest sets guest auth state', () => {
    useAuthStore.getState().loginAsGuest()
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(true)
    expect(state.isGuest).toBe(true)
    expect(state.user?.id).toBe('guest-demo-user')
    expect(state.session).toBeNull()
    expect(state.tutorialSeen).toBe(false)
  })

  it('loginAsGuest reads tutorialSeen from localStorage', () => {
    localStorage.setItem('k_tutorial_seen_guest', '1')
    useAuthStore.getState().loginAsGuest()
    expect(useAuthStore.getState().tutorialSeen).toBe(true)
  })

  it('setSession clears isGuest flag', () => {
    useAuthStore.getState().loginAsGuest()
    expect(useAuthStore.getState().isGuest).toBe(true)
    const mockSession = {
      access_token: 'test',
      refresh_token: 'test',
      user: { id: 'u1', email: 'test@test.com' },
    } as never
    useAuthStore.getState().setSession(mockSession)
    expect(useAuthStore.getState().isGuest).toBe(false)
  })

  it('setShowLoginModal toggles modal state', () => {
    useAuthStore.getState().setShowLoginModal(true)
    expect(useAuthStore.getState().showLoginModal).toBe(true)
    useAuthStore.getState().setShowLoginModal(false)
    expect(useAuthStore.getState().showLoginModal).toBe(false)
  })

  it('setShowLoginPrompt toggles prompt state', () => {
    useAuthStore.getState().setShowLoginPrompt(true)
    expect(useAuthStore.getState().showLoginPrompt).toBe(true)
  })

  it('logout clears login modal and prompt', () => {
    useAuthStore.setState({ showLoginModal: true, showLoginPrompt: true })
    useAuthStore.getState().logout()
    const state = useAuthStore.getState()
    expect(state.showLoginModal).toBe(false)
    expect(state.showLoginPrompt).toBe(false)
  })

  it('logout clears guest state', () => {
    useAuthStore.getState().loginAsGuest()
    useAuthStore.getState().logout()
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.isGuest).toBe(false)
    expect(state.user).toBeNull()
  })
})
