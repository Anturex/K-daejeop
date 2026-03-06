/** Kakao Maps SDK type declarations */

declare namespace kakao.maps {
  class Map {
    constructor(container: HTMLElement, options: MapOptions)
    setCenter(latlng: LatLng): void
    getCenter(): LatLng
    setLevel(level: number, options?: { animate?: boolean }): void
    getLevel(): number
    setBounds(bounds: LatLngBounds, paddingTop?: number, paddingRight?: number, paddingBottom?: number, paddingLeft?: number): void
    relayout(): void
    getProjection(): MapProjection
  }

  interface MapOptions {
    center: LatLng
    level?: number
  }

  interface MapProjection {
    containerPointFromCoords?(latlng: LatLng): Point
    containerPixelFromCoords?(latlng: LatLng): Point
  }

  class LatLng {
    constructor(lat: number, lng: number)
    getLat(): number
    getLng(): number
  }

  class LatLngBounds {
    constructor(sw?: LatLng, ne?: LatLng)
    extend(latlng: LatLng): void
    getSouthWest(): LatLng
    getNorthEast(): LatLng
  }

  class Marker {
    constructor(options: MarkerOptions)
    setMap(map: Map | null): void
    getPosition(): LatLng
    setPosition(latlng: LatLng): void
  }

  interface MarkerOptions {
    position: LatLng
    map?: Map
  }

  class InfoWindow {
    constructor(options?: InfoWindowOptions)
    open(map: Map, marker?: Marker): void
    close(): void
    setContent(content: string | HTMLElement): void
    setPosition(latlng: LatLng): void
  }

  interface InfoWindowOptions {
    content?: string | HTMLElement
    position?: LatLng
    removable?: boolean
    zIndex?: number
  }

  class CustomOverlay {
    constructor(options: CustomOverlayOptions)
    setMap(map: Map | null): void
    getPosition(): LatLng
    setPosition(latlng: LatLng): void
    getContent(): HTMLElement | string
  }

  interface CustomOverlayOptions {
    position: LatLng
    content: string | HTMLElement
    map?: Map
    yAnchor?: number
    zIndex?: number
    clickable?: boolean
  }

  class Point {
    constructor(x: number, y: number)
    x: number
    y: number
  }

  namespace event {
    function addListener(
      target: Map | Marker | CustomOverlay,
      type: string,
      handler: (...args: unknown[]) => void
    ): void
    function removeListener(
      target: Map | Marker | CustomOverlay,
      type: string,
      handler: (...args: unknown[]) => void
    ): void
    // Note: addListenerOnce does NOT exist in Kakao Maps SDK
  }

  function load(callback: () => void): void
}

interface Window {
  kakao: typeof kakao
}
