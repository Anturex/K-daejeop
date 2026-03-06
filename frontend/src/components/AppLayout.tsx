import { useAuthStore } from '../stores/authStore'
import { useReviewStore } from '../stores/reviewStore'
import { useUiStore } from '../stores/uiStore'
import { Header } from './Header/Header'
import { KakaoMap } from './Map/KakaoMap'
import { ReviewModal } from './Reviews/ReviewModal'
import { ReviewDetail } from './Reviews/ReviewDetail'
import { MyReviewsPanel } from './MyReviews/MyReviewsPanel'
import { TutorialOverlay } from './Tutorial/TutorialOverlay'
import { AdBanner } from './Ads/AdBanner'
import { Toast } from './Toast'

export function AppLayout() {
  const tier = useAuthStore((s) => s.tier)
  const modalOpen = useReviewStore((s) => s.modalOpen)
  const detailOpen = useReviewStore((s) => s.detailOpen)
  const myReviewsActive = useUiStore((s) => s.myReviewsActive)
  const showTutorial = useUiStore((s) => s.showTutorial)

  return (
    <div className="fixed inset-0 flex flex-col bg-bg max-sm:overflow-hidden">
      <Header />

      <div className="relative z-0 flex-1">
        <KakaoMap />

        {myReviewsActive && <MyReviewsPanel />}

        {tier === 'free' && <AdBanner position="banner" />}
      </div>

      {modalOpen && <ReviewModal />}
      {detailOpen && <ReviewDetail />}
      {showTutorial && <TutorialOverlay />}

      <Toast />
    </div>
  )
}
