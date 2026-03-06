import { env } from '../env'

let loadPromise: Promise<void> | null = null

/** Load the Kakao Maps SDK script and call kakao.maps.load() */
export function loadKakaoSdk(): Promise<void> {
  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    // Already loaded
    if (window.kakao?.maps) {
      kakao.maps.load(() => resolve())
      return
    }

    const script = document.createElement('script')
    script.src = `${env.kakaoSdkUrl}?appkey=${env.kakaoJsKey}&autoload=false&libraries=services`
    script.async = true
    script.onload = () => {
      kakao.maps.load(() => resolve())
    }
    script.onerror = () => reject(new Error('Failed to load Kakao Maps SDK'))
    document.head.appendChild(script)
  })

  return loadPromise
}
