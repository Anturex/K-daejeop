import { describe, it, expect, beforeEach } from 'vitest'
import { useMapStore } from '../../src/stores/mapStore'

describe('mapStore', () => {
  beforeEach(() => {
    useMapStore.setState({
      markers: [],
      infoWindows: [],
      searchResults: [],
      searchActive: false,
    })
  })

  it('defaults searchActive to false', () => {
    expect(useMapStore.getState().searchActive).toBe(false)
  })

  it('sets searchActive to true when setMarkers is called with markers', () => {
    const fakeMarker = { setMap: () => {} } as unknown as kakao.maps.Marker
    useMapStore.getState().setMarkers([fakeMarker])
    expect(useMapStore.getState().searchActive).toBe(true)
  })

  it('keeps searchActive false when setMarkers is called with empty array', () => {
    useMapStore.getState().setMarkers([])
    expect(useMapStore.getState().searchActive).toBe(false)
  })

  it('sets searchActive to false when clearMarkers is called', () => {
    // First set markers to make searchActive true
    useMapStore.setState({ searchActive: true })
    useMapStore.getState().clearMarkers()
    expect(useMapStore.getState().searchActive).toBe(false)
  })
})
