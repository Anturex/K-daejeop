import { useAuthStore } from './stores/authStore'
import { LoginScreen } from './components/LoginScreen/LoginScreen'
import { AppLayout } from './components/AppLayout'

export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  if (!isAuthenticated) {
    return <LoginScreen />
  }

  return <AppLayout />
}
