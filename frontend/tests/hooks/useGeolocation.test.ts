import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGeolocation } from '../../src/hooks/useGeolocation'

describe('useGeolocation', () => {
  let mockGetCurrentPosition: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockGetCurrentPosition = vi.fn()
    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition: mockGetCurrentPosition },
      writable: true,
      configurable: true,
    })
  })

  it('starts with idle state', () => {
    const { result } = renderHook(() => useGeolocation())
    expect(result.current.lat).toBeNull()
    expect(result.current.lng).toBeNull()
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('sets loading then resolves with coordinates on success', async () => {
    mockGetCurrentPosition.mockImplementation(
      (success: PositionCallback) => {
        success({
          coords: { latitude: 37.5665, longitude: 126.978 },
        } as GeolocationPosition)
      },
    )

    const { result } = renderHook(() => useGeolocation())

    act(() => {
      result.current.requestLocation()
    })

    expect(result.current.lat).toBeCloseTo(37.5665)
    expect(result.current.lng).toBeCloseTo(126.978)
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('sets error on permission denied', () => {
    mockGetCurrentPosition.mockImplementation(
      (_: PositionCallback, error: PositionErrorCallback) => {
        error({
          code: 1,
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
          message: 'denied',
        } as GeolocationPositionError)
      },
    )

    const { result } = renderHook(() => useGeolocation())

    act(() => {
      result.current.requestLocation()
    })

    expect(result.current.error).toBe('denied')
    expect(result.current.lat).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('sets error on timeout/unavailable', () => {
    mockGetCurrentPosition.mockImplementation(
      (_: PositionCallback, error: PositionErrorCallback) => {
        error({
          code: 3,
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
          message: 'timeout',
        } as GeolocationPositionError)
      },
    )

    const { result } = renderHook(() => useGeolocation())

    act(() => {
      result.current.requestLocation()
    })

    expect(result.current.error).toBe('unavailable')
  })

  it('sets error when geolocation not supported', () => {
    Object.defineProperty(navigator, 'geolocation', {
      value: undefined,
      writable: true,
      configurable: true,
    })

    const { result } = renderHook(() => useGeolocation())

    act(() => {
      result.current.requestLocation()
    })

    expect(result.current.error).toBe('not-supported')
  })

  it('guards against concurrent requests but allows sequential calls', () => {
    // First call: async (does not resolve immediately)
    mockGetCurrentPosition.mockImplementationOnce(() => {
      // pending — does not call success/error
    })

    const { result } = renderHook(() => useGeolocation())

    act(() => {
      result.current.requestLocation()
      result.current.requestLocation() // ignored while first is pending
    })

    expect(mockGetCurrentPosition).toHaveBeenCalledTimes(1)
  })

  it('allows re-request after success', () => {
    mockGetCurrentPosition.mockImplementation(
      (success: PositionCallback) => {
        success({
          coords: { latitude: 37.5, longitude: 127.0 },
        } as GeolocationPosition)
      },
    )

    const { result } = renderHook(() => useGeolocation())

    act(() => {
      result.current.requestLocation()
    })

    act(() => {
      result.current.requestLocation()
    })

    expect(mockGetCurrentPosition).toHaveBeenCalledTimes(2)
  })
})
