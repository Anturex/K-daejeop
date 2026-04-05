import { create } from 'zustand'
import type { User, Session } from '@supabase/supabase-js'

export type UserTier = 'free' | 'premium'

const GUEST_TUTORIAL_KEY = 'k_tutorial_seen_guest'

interface AuthState {
  user: User | null
  session: Session | null
  tier: UserTier
  isAuthenticated: boolean
  isLoading: boolean
  tutorialSeen: boolean
  isGuest: boolean
  showLoginModal: boolean
  showLoginPrompt: boolean

  setSession: (session: Session | null) => void
  setUser: (user: User | null) => void
  setTier: (tier: UserTier) => void
  setTutorialSeen: (seen: boolean) => void
  setLoading: (loading: boolean) => void
  setShowLoginModal: (show: boolean) => void
  setShowLoginPrompt: (show: boolean) => void
  loginAsGuest: () => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  tier: 'free',
  isAuthenticated: false,
  isLoading: true,
  tutorialSeen: false,
  isGuest: false,
  showLoginModal: false,
  showLoginPrompt: false,

  setSession: (session) =>
    set({
      session,
      isAuthenticated: !!session,
      user: session?.user ?? null,
      isGuest: false,
    }),

  setUser: (user) => set({ user }),
  setTier: (tier) => set({ tier }),
  setTutorialSeen: (seen) => set({ tutorialSeen: seen }),
  setLoading: (loading) => set({ isLoading: loading }),
  setShowLoginModal: (show) => set({ showLoginModal: show }),
  setShowLoginPrompt: (show) => set({ showLoginPrompt: show }),

  loginAsGuest: () =>
    set({
      user: {
        id: 'guest-demo-user',
        email: 'guest@k-daejeop.demo',
        app_metadata: {},
        user_metadata: { full_name: 'Guest' },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      } as User,
      session: null,
      tier: 'free',
      isAuthenticated: true,
      isLoading: false,
      isGuest: true,
      tutorialSeen: localStorage.getItem(GUEST_TUTORIAL_KEY) === '1',
    }),

  logout: () =>
    set({
      user: null,
      session: null,
      tier: 'free',
      isAuthenticated: false,
      isGuest: false,
      tutorialSeen: false,
      showLoginModal: false,
      showLoginPrompt: false,
    }),
}))
