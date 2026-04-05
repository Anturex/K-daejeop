import { useAuthStore } from './stores/authStore'
import { AppLayout } from './components/AppLayout'
import { useAuth } from './hooks/useAuth'

function SplashScreen() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-bg">
      <div className="mb-4 h-16 w-16 overflow-hidden rounded-full bg-[#C4A265] shadow-md">
        <img
          src="/icon-256.png"
          alt="K-daejeop"
          className="h-full w-full scale-[1.12] object-cover"
        />
      </div>
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
    </div>
  )
}

export default function App() {
  useAuth()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isGuest = useAuthStore((s) => s.isGuest)

  if (!isAuthenticated) {
    return <SplashScreen />
  }

  // key forces full remount on guest↔auth transition (refreshes all data)
  return <AppLayout key={isGuest ? 'guest' : 'auth'} />
}
