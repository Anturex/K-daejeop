import { useCallback, useRef, useState } from 'react'

interface GeoState {
  lat: number | null
  lng: number | null
  error: string | null
  loading: boolean
}

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 5000,
  maximumAge: 60_000,
}

export function useGeolocation() {
  const [state, setState] = useState<GeoState>({
    lat: null,
    lng: null,
    error: null,
    loading: false,
  })
  const requestedRef = useRef(false)

  const requestLocation = useCallback(() => {
    if (requestedRef.current) return
    if (!navigator.geolocation) {
      setState((s) => ({ ...s, error: 'not-supported' }))
      return
    }

    requestedRef.current = true
    setState((s) => ({ ...s, loading: true, error: null }))

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          error: null,
          loading: false,
        })
      },
      (err) => {
        setState({
          lat: null,
          lng: null,
          error: err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable',
          loading: false,
        })
      },
      GEO_OPTIONS,
    )
  }, [])

  return { ...state, requestLocation }
}
