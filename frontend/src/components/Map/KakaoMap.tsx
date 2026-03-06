import { useRef, useEffect } from 'react'
import { loadKakaoSdk } from '../../services/kakao'
import { useMapStore } from '../../stores/mapStore'

const DEFAULT_LEVEL = window.innerWidth <= 640 ? 13 : 12
const DEFAULT_CENTER = { lat: 36.5, lng: 127.5 } // Korea center

// Korea bounding box (generous padding for islands like Jeju, Ulleungdo, Dokdo)
const KOREA_BOUNDS = {
  swLat: 33.0,
  swLng: 124.5,
  neLat: 38.7,
  neLng: 132.0,
}

export function KakaoMap() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { setMap } = useMapStore()

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

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      id="map"
    />
  )
}
