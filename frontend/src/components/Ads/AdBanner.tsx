import { useEffect, useRef } from 'react'
import { useAuthStore } from '../../stores/authStore'

interface AdBannerProps {
  position: 'banner' | 'panel'
}

export function AdBanner({ position }: AdBannerProps) {
  const tier = useAuthStore((s) => s.tier)
  const adRef = useRef<HTMLDivElement>(null)
  const scriptLoaded = useRef(false)

  useEffect(() => {
    if (tier !== 'free' || scriptLoaded.current) return

    // Load AdSense script
    const existingScript = document.querySelector(
      'script[src*="adsbygoogle"]',
    )
    if (!existingScript) {
      const script = document.createElement('script')
      script.src =
        'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6570449864880886'
      script.async = true
      script.crossOrigin = 'anonymous'
      document.head.appendChild(script)
    }

    scriptLoaded.current = true

    // Push ad
    try {
      ;(window as unknown as { adsbygoogle: unknown[] }).adsbygoogle =
        (window as unknown as { adsbygoogle: unknown[] }).adsbygoogle || []
      ;(window as unknown as { adsbygoogle: unknown[] }).adsbygoogle.push({})
    } catch {
      // AdSense not ready yet
    }
  }, [tier])

  if (tier !== 'free') return null

  const isPanel = position === 'panel'

  return (
    <div
      ref={adRef}
      className={
        isPanel
          ? 'p-2'
          : 'absolute bottom-0 left-0 right-0 max-h-[90px] overflow-hidden bg-surface/90 backdrop-blur-sm safe-bottom'
      }
    >
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-6570449864880886"
        data-ad-slot={isPanel ? 'panel-slot' : 'banner-slot'}
        data-ad-format={isPanel ? 'fluid' : 'auto'}
        data-full-width-responsive="true"
      />
    </div>
  )
}
