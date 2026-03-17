import { useRef, useEffect, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { loadKakaoSdk } from '../../services/kakao'
import { useMapStore } from '../../stores/mapStore'
import { useUiStore } from '../../stores/uiStore'
import { useGeolocation } from '../../hooks/useGeolocation'

const DEFAULT_LEVEL = window.innerWidth <= 640 ? 13 : 12
const DEFAULT_CENTER = { lat: 36.5, lng: 127.5 } // Korea center
const MY_LOCATION_ZOOM = 3

// Korea bounding box (generous padding for islands like Jeju, Ulleungdo, Dokdo)
const KOREA_BOUNDS = {
  swLat: 33.0,
  swLng: 124.5,
  neLat: 38.7,
  neLng: 132.0,
}

function isInKorea(lat: number, lng: number) {
  return (
    lat >= KOREA_BOUNDS.swLat &&
    lat <= KOREA_BOUNDS.neLat &&
    lng >= KOREA_BOUNDS.swLng &&
    lng <= KOREA_BOUNDS.neLng
  )
}

export function KakaoMap() {
  const containerRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<kakao.maps.CustomOverlay | null>(null)
  const { setMap, map } = useMapStore()
  const showToast = useUiStore((s) => s.showToast)
  const { t } = useTranslation()
  const { lat, lng, error, loading, requestLocation } = useGeolocation()
  const [locating, setLocating] = useState(false)

  useEffect(() => {
    let mounted = true

    async function initMap() {
      try {
        await loadKakaoSdk()
      } catch (err) {
        console.error('[map] SDK load failed:', err)
        return
      }

      if (!mounted || !containerRef.current) return

      const map = new kakao.maps.Map(containerRef.current, {
        center: new kakao.maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng),
        level: DEFAULT_LEVEL,
      })

      // Restrict panning to Korea bounds
      const constrainToKorea = () => {
        const center = map.getCenter()
        const lat = center.getLat()
        const lng = center.getLng()

        if (lat < KOREA_BOUNDS.swLat || lat > KOREA_BOUNDS.neLat ||
            lng < KOREA_BOUNDS.swLng || lng > KOREA_BOUNDS.neLng) {
          const clampedLat = Math.min(Math.max(lat, KOREA_BOUNDS.swLat), KOREA_BOUNDS.neLat)
          const clampedLng = Math.min(Math.max(lng, KOREA_BOUNDS.swLng), KOREA_BOUNDS.neLng)
          // Stop momentum animation by toggling draggable off/on
          map.setDraggable(false)
          map.setCenter(new kakao.maps.LatLng(clampedLat, clampedLng))
          requestAnimationFrame(() => map.setDraggable(true))
        }
      }

      kakao.maps.event.addListener(map, 'center_changed', constrainToKorea)
      kakao.maps.event.addListener(map, 'idle', constrainToKorea)

      setMap(map)
    }

    initMap()

    return () => {
      mounted = false
      setMap(null)
    }
  }, [setMap])

  // Handle geolocation result
  useEffect(() => {
    if (!locating) return
    if (loading) return

    if (error) {
      const msg = error === 'denied' ? t('map.gpsDenied') : t('map.gpsUnavailable')
      showToast(msg)
      setLocating(false)
      return
    }

    if (lat != null && lng != null && map) {
      if (!isInKorea(lat, lng)) {
        showToast(t('map.gpsOutOfRange'))
        setLocating(false)
        return
      }

      map.setCenter(new kakao.maps.LatLng(lat, lng))
      map.setLevel(MY_LOCATION_ZOOM)

      // Show/update blue dot overlay
      if (overlayRef.current) {
        overlayRef.current.setMap(null)
      }
      const dot = document.createElement('div')
      dot.className = 'my-location-dot'
      const overlay = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(lat, lng),
        content: dot,
        yAnchor: 0.5,
        xAnchor: 0.5,
        zIndex: 100,
      })
      overlay.setMap(map)
      overlayRef.current = overlay

      setLocating(false)
    }
  }, [lat, lng, error, loading, locating, map, showToast, t])

  const handleMyLocation = useCallback(() => {
    setLocating(true)
    requestLocation()
  }, [requestLocation])

  return (
    <div className="relative h-full w-full">
      <div
        ref={containerRef}
        className="h-full w-full"
        id="map"
      />

      {/* My location button */}
      <button
        type="button"
        onClick={handleMyLocation}
        disabled={locating}
        className="absolute bottom-20 right-3 z-[100] flex h-11 w-11 items-center justify-center rounded-full bg-surface shadow-md transition-transform active:scale-95 disabled:opacity-50 sm:bottom-6"
        aria-label={t('map.myLocation')}
      >
        {locating ? (
          <svg className="h-5 w-5 animate-spin text-accent" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        ) : (
          <svg className="h-5 w-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
          </svg>
        )}
      </button>
    </div>
  )
}
