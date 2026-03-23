import { useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useReviewStore } from '../stores/reviewStore'
import { useUiStore } from '../stores/uiStore'
import { useBadgeStore } from '../stores/badgeStore'
import { useCosmeticStore, getMilestone, getNewlyUnlockedHidden } from '../stores/cosmeticStore'
import { useBoardPins } from '../hooks/useBoardPins'
import { Header } from './Header/Header'
import { KakaoMap } from './Map/KakaoMap'
import { ReviewModal } from './Reviews/ReviewModal'
import { ReviewDetail } from './Reviews/ReviewDetail'
import { MyReviewsPanel } from './MyReviews/MyReviewsPanel'
import { BadgePanel } from './Badges/BadgePanel'
import { AddToBoardModal } from './Badges/AddToBoardModal'
import { CosmeticPanel } from './Cosmetics/CosmeticPanel'
import { TutorialOverlay } from './Tutorial/TutorialOverlay'
import { AdBanner } from './Ads/AdBanner'
import { ChangelogModal } from './ChangelogModal'
import { Toast } from './Toast'
import { useTranslation } from 'react-i18next'
import { getSupabase } from '../services/supabase'

export function AppLayout() {
  const tier = useAuthStore((s) => s.tier)
  const modalOpen = useReviewStore((s) => s.modalOpen)
  const detailOpen = useReviewStore((s) => s.detailOpen)
  const myReviewsActive = useUiStore((s) => s.myReviewsActive)
  const badgePanelActive = useUiStore((s) => s.badgePanelActive)
  const showTutorial = useUiStore((s) => s.showTutorial)
  const addToBoardPlace = useBadgeStore((s) => s.addToBoardPlace)
  const boardPinsActive = useBadgeStore((s) => s.boardPinsActive)
  const cosmeticPanelOpen = useCosmeticStore((s) => s.panelOpen)
  const { t } = useTranslation()
  const showToast = useUiStore((s) => s.showToast)

  // Manage board pins on map (decoupled from BadgePanel lifecycle)
  useBoardPins()

  // Load cosmetic data + initial review count on mount
  useEffect(() => {
    useCosmeticStore.getState().loadEquipped()
    // Fetch initial review count
    const user = useAuthStore.getState().user
    if (user) {
      getSupabase()
        .from('reviews')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .then(({ count }) => {
          if (count != null) useCosmeticStore.getState().setReviewCount(count)
        })
    }
  }, [])

  // Listen for review:saved to update count + check milestones
  useEffect(() => {
    function handleReviewSaved() {
      const user = useAuthStore.getState().user
      if (!user) return
      const prevCount = useCosmeticStore.getState().reviewCount
      const prevMilestone = getMilestone(prevCount)

      getSupabase()
        .from('reviews')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .then(({ count }) => {
          if (count == null) return
          useCosmeticStore.getState().setReviewCount(count)

          const newMilestone = getMilestone(count)
          if (newMilestone && newMilestone.level !== (prevMilestone?.level ?? 0)) {
            showToast(
              `🎉 ${t(newMilestone.titleKey)} ${t('cosmetic.milestoneReached')}`,
              5000,
            )
          }

          // Check for hidden item unlocks
          const currentTier = useAuthStore.getState().tier
          const newHidden = getNewlyUnlockedHidden(prevCount, count, currentTier)
          if (newHidden.length > 0) {
            setTimeout(() => showToast(t('cosmetic.hiddenUnlocked'), 5000), 2000)
          }
        })
    }

    window.addEventListener('review:saved', handleReviewSaved)
    window.addEventListener('review:deleted', handleReviewSaved)
    return () => {
      window.removeEventListener('review:saved', handleReviewSaved)
      window.removeEventListener('review:deleted', handleReviewSaved)
    }
  }, [showToast, t])

  // Mutual exclusion: MyReviews open → clear board pins
  useEffect(() => {
    if (myReviewsActive && boardPinsActive) {
      useBadgeStore.getState().closeBoard()
    }
  }, [myReviewsActive, boardPinsActive])

  return (
    <div className="fixed inset-0 flex flex-col bg-bg max-sm:overflow-hidden">
      <Header />

      <div className="relative z-0 flex-1">
        <KakaoMap />

        {myReviewsActive && <MyReviewsPanel />}
        {(badgePanelActive || boardPinsActive) && <BadgePanel />}

        {tier === 'free' && <AdBanner position="banner" />}
      </div>

      {modalOpen && <ReviewModal />}
      {detailOpen && <ReviewDetail />}
      {showTutorial && <TutorialOverlay />}
      {addToBoardPlace && <AddToBoardModal />}
      {cosmeticPanelOpen && <CosmeticPanel />}

      <ChangelogModal />
      <Toast />
    </div>
  )
}
