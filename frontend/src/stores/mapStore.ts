import { create } from 'zustand'
import type { PlaceResult } from '../services/api'

interface MapState {
  map: kakao.maps.Map | null
  searchResults: PlaceResult[]
  markers: kakao.maps.Marker[]

  setMap: (map: kakao.maps.Map | null) => void
  setSearchResults: (results: PlaceResult[]) => void
  setMarkers: (markers: kakao.maps.Marker[]) => void
  clearMarkers: () => void
}

export const useMapStore = create<MapState>((set, get) => ({
  map: null,
  searchResults: [],
  markers: [],

  setMap: (map) => set({ map }),
  setSearchResults: (results) => set({ searchResults: results }),
  setMarkers: (markers) => set({ markers }),

  clearMarkers: () => {
    const { markers } = get()
    markers.forEach((m) => m.setMap(null))
    set({ markers: [], searchResults: [] })
  },
}))
