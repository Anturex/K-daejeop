import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from '../../src/stores/authStore'

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      session: null,
      tier: 'free',
      isAuthenticated: false,
      isLoading: true,
      tutorialSeen: false,
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
})
