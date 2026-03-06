export interface PlaceResult {
  id: string
  place_name: string
  category_name: string
  category_group_code: string
  address_name: string
  road_address_name: string
  phone: string
  x: string // longitude
  y: string // latitude
  place_url: string
  distance?: string
}

export interface PlacesResponse {
  documents: PlaceResult[]
  meta: {
    total_count: number
    pageable_count: number
    is_end: boolean
    same_name?: {
      region: string[]
      keyword: string
      selected_region: string
    }
  }
}

/** Search places via the FastAPI proxy (avoids exposing Kakao REST key) */
export async function searchPlaces(
  query: string,
  options?: { x?: number; y?: number; radius?: number },
): Promise<PlacesResponse> {
  const params = new URLSearchParams({ query })
  if (options?.x) params.set('x', String(options.x))
  if (options?.y) params.set('y', String(options.y))
  if (options?.radius) params.set('radius', String(options.radius))

  const res = await fetch(`/api/places?${params}`)
  if (!res.ok) throw new Error(`Search failed: ${res.status}`)
  return res.json()
}
