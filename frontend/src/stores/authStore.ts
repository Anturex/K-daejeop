import { create } from 'zustand'
import type { User, Session } from '@supabase/supabase-js'

export type UserTier = 'free' | 'premium'

interface AuthState {
  user: User | null
  session: Session | null
  tier: UserTier
  isAuthenticated: boolean
  isLoading: boolean
  tutorialSeen: boolean
  isGuest: boolean

  setSession: (session: Session | null) => void
  setUser: (user: User | null) => void
  setTier: (tier: UserTier) => void
  setTutorialSeen: (seen: boolean) => void
  setLoading: (loading: boolean) => void
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

  setSession: (session) =>
    set({
      session,
      isAuthenticated: !!session,
      user: session?.user ?? null,
    }),

  setUser: (user) => set({ user }),
  setTier: (tier) => set({ tier }),
  setTutorialSeen: (seen) => set({ tutorialSeen: seen }),
  setLoading: (loading) => set({ isLoading: loading }),

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
      tutorialSeen: true,
    }),

  logout: () =>
    set({
      user: null,
      session: null,
      tier: 'free',
      isAuthenticated: false,
      isGuest: false,
      tutorialSeen: false,
    }),
}))
