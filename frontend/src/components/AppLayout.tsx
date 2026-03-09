import { useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useReviewStore } from '../stores/reviewStore'
import { useUiStore } from '../stores/uiStore'
import { useBadgeStore } from '../stores/badgeStore'
import { useBoardPins } from '../hooks/useBoardPins'
import { Header } from './Header/Header'
import { KakaoMap } from './Map/KakaoMap'
import { ReviewModal } from './Reviews/ReviewModal'
import { ReviewDetail } from './Reviews/ReviewDetail'
import { MyReviewsPanel } from './MyReviews/MyReviewsPanel'
import { BadgePanel } from './Badges/BadgePanel'
import { AddToBoardModal } from './Badges/AddToBoardModal'
import { TutorialOverlay } from './Tutorial/TutorialOverlay'
import { AdBanner } from './Ads/AdBanner'
import { ChangelogModal } from './ChangelogModal'
import { Toast } from './Toast'

export function AppLayout() {
  const tier = useAuthStore((s) => s.tier)
  const modalOpen = useReviewStore((s) => s.modalOpen)
  const detailOpen = useReviewStore((s) => s.detailOpen)
  const myReviewsActive = useUiStore((s) => s.myReviewsActive)
  const badgePanelActive = useUiStore((s) => s.badgePanelActive)
  const showTutorial = useUiStore((s) => s.showTutorial)
  const addToBoardPlace = useBadgeStore((s) => s.addToBoardPlace)
  const boardPinsActive = useBadgeStore((s) => s.boardPinsActive)

  // Manage board pins on map (decoupled from BadgePanel lifecycle)
  useBoardPins()

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

      <ChangelogModal />
      <Toast />
    </div>
  )
}
