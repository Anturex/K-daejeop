import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App'
import { loadKakaoSdk } from './services/kakao'
import { startKeepAlive } from './keepAlive'

// Start Kakao Maps SDK download early (before auth completes)
loadKakaoSdk()

// Keep-alive polling to prevent Render server from sleeping
startKeepAlive()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
