import { useEffect, useRef, useState, useCallback } from 'react'
import { getSupabase } from '../services/supabase'
import { useAuthStore } from '../stores/authStore'
import { useUiStore } from '../stores/uiStore'
import type { UserTier } from '../stores/authStore'

const OAUTH_PENDING_KEY = 'k_oauth_pending'

export function useAuth() {
  const {
    setSession,
    setTier,
    setTutorialSeen,
    setLoading,
    logout,
    loginAsGuest,
  } = useAuthStore()
  const { setShowTutorial } = useUiStore()
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const authResolved = useRef(false)

  useEffect(() => {
    const sb = getSupabase()

    const isOAuthCallback = new URLSearchParams(window.location.search).has(
      'code',
    )
    const hadOAuthPending =
      sessionStorage.getItem(OAUTH_PENDING_KEY) === '1'
    sessionStorage.removeItem(OAUTH_PENDING_KEY)
    const isOAuthRelated = isOAuthCallback || hadOAuthPending

    // Start as guest immediately — upgrade to real session if found
    if (!isOAuthRelated && !useAuthStore.getState().isAuthenticated) {
      loginAsGuest()
    } else if (isOAuthRelated) {
      setLoading(true)
    }

    // iOS Safari bfcache
    const handlePageShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return
      if (useAuthStore.getState().isGuest) return
      sb.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setSession(session)
          checkTutorialAndTier(session.user.id)
        } else {
          loginAsGuest()
        }
      })
    }
    window.addEventListener('pageshow', handlePageShow)

    // OAuth fallback timeout
    let fallbackId: ReturnType<typeof setTimeout> | undefined
    if (isOAuthRelated) {
      fallbackId = setTimeout(() => {
        if (!authResolved.current && !useAuthStore.getState().isGuest) {
          authResolved.current = true
          loginAsGuest()
        }
      }, 10000)
    }

    // Auth state change listener — upgrades guest to real session
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        authResolved.current = true
        setSession(session)
        checkTutorialAndTier(session.user.id)
        setLoading(false)
        setIsLoggingIn(false)
      } else if (
        event === 'INITIAL_SESSION' &&
        isOAuthRelated &&
        !authResolved.current
      ) {
        // Waiting for PKCE code exchange
      } else if (event === 'SIGNED_OUT') {
        if (useAuthStore.getState().isGuest) return
        authResolved.current = true
        loginAsGuest()
        setIsLoggingIn(false)
      }
    })

    // Fallback getSession — try to upgrade guest to real session
    sb.auth.getSession().then(({ data: { session } }) => {
      if (authResolved.current) return
      if (session?.user) {
        authResolved.current = true
        setSession(session)
        checkTutorialAndTier(session.user.id)
        setLoading(false)
      }
    }).catch(() => {
      // Supabase unreachable — already in guest mode, nothing to do
    })

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('pageshow', handlePageShow)
      if (fallbackId) clearTimeout(fallbackId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkTutorialAndTier = useCallback(
    async (userId: string) => {
      const sb = getSupabase()
      try {
        const { data, error } = await sb
          .from('user_profiles')
          .select('tutorial_seen, tier')
          .eq('user_id', userId)
          .single()

        if (error && error.code === 'PGRST116') {
          await sb.from('user_profiles').insert({ user_id: userId })
          setTier('free')
          setShowTutorial(true)
          return
        }

        setTier((data?.tier as UserTier) || 'free')
        setTutorialSeen(data?.tutorial_seen ?? false)

        if (!data?.tutorial_seen) {
          setShowTutorial(true)
        }
      } catch (err) {
        console.warn('[auth] tutorial check failed:', err)
      }
    },
    [setTier, setTutorialSeen, setShowTutorial],
  )

  const handleGoogleLogin = useCallback(async () => {
    const sb = getSupabase()
    setIsLoggingIn(true)
    sessionStorage.setItem(OAUTH_PENDING_KEY, '1')

    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/' },
    })

    if (error) {
      sessionStorage.removeItem(OAUTH_PENDING_KEY)
      console.error('[auth] Google login failed:', error.message)
      setIsLoggingIn(false)
    }
  }, [])

  const handleLogout = useCallback(async () => {
    const sb = getSupabase()
    await sb.auth.signOut()
    loginAsGuest()
  }, [loginAsGuest])

  const markTutorialSeen = useCallback(async () => {
    if (useAuthStore.getState().isGuest) {
      localStorage.setItem('k_tutorial_seen_guest', '1')
      setTutorialSeen(true)
      return
    }
    const sb = getSupabase()
    try {
      const {
        data: { user },
      } = await sb.auth.getUser()
      if (!user) return
      await sb
        .from('user_profiles')
        .update({ tutorial_seen: true })
        .eq('user_id', user.id)
      setTutorialSeen(true)
    } catch (err) {
      console.warn('[auth] tutorial mark failed:', err)
    }
  }, [setTutorialSeen])

  return {
    handleGoogleLogin,
    handleLogout,
    markTutorialSeen,
    isLoggingIn,
  }
}
