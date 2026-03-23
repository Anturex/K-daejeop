import { create } from 'zustand'
import type { PlaceResult } from '../services/api'

interface MapState {
  map: kakao.maps.Map | null
  searchResults: PlaceResult[]
  markers: kakao.maps.Marker[]
  infoWindows: kakao.maps.InfoWindow[]
  searchActive: boolean

  setMap: (map: kakao.maps.Map | null) => void
  setSearchResults: (results: PlaceResult[]) => void
  setMarkers: (markers: kakao.maps.Marker[]) => void
  addInfoWindow: (iw: kakao.maps.InfoWindow) => void
  clearMarkers: () => void
}

export const useMapStore = create<MapState>((set, get) => ({
  map: null,
  searchResults: [],
  markers: [],
  infoWindows: [],
  searchActive: false,

  setMap: (map) => set({ map }),
  setSearchResults: (results) => set({ searchResults: results }),
  setMarkers: (markers) => set({ markers, searchActive: markers.length > 0 }),
  addInfoWindow: (iw) => set((s) => ({ infoWindows: [...s.infoWindows, iw] })),

  clearMarkers: () => {
    const { markers, infoWindows } = get()
    markers.forEach((m) => m.setMap(null))
    infoWindows.forEach((iw) => iw.close())
    set({ markers: [], searchResults: [], infoWindows: [], searchActive: false })
  },
}))
