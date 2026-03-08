import { create } from 'zustand'

interface Toast {
  message: string
  id: number
}

interface UiState {
  // My Reviews panel
  myReviewsActive: boolean
  setMyReviewsActive: (active: boolean) => void

  // Badge panel
  badgePanelActive: boolean
  setBadgePanelActive: (active: boolean) => void

  // Tutorial
  showTutorial: boolean
  setShowTutorial: (show: boolean) => void

  // Toast
  toast: Toast | null
  showToast: (message: string, duration?: number) => void

  // User menu
  userMenuOpen: boolean
  setUserMenuOpen: (open: boolean) => void
}

let toastCounter = 0
let toastTimer: ReturnType<typeof setTimeout> | null = null

export const useUiStore = create<UiState>((set) => ({
  myReviewsActive: false,
  setMyReviewsActive: (active) =>
    set({ myReviewsActive: active, ...(active ? { badgePanelActive: false } : {}) }),

  badgePanelActive: false,
  setBadgePanelActive: (active) =>
    set({ badgePanelActive: active, ...(active ? { myReviewsActive: false } : {}) }),

  showTutorial: false,
  setShowTutorial: (show) => set({ showTutorial: show }),

  toast: null,
  showToast: (message, duration = 3000) => {
    if (toastTimer) clearTimeout(toastTimer)
    const id = ++toastCounter
    set({ toast: { message, id } })
    if (duration > 0) {
      toastTimer = setTimeout(() => {
        set((s) => (s.toast?.id === id ? { toast: null } : s))
      }, duration)
    }
  },

  userMenuOpen: false,
  setUserMenuOpen: (open) => set({ userMenuOpen: open }),
}))
