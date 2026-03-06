/** Haversine distance in km between two lat/lng pairs */
export function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Calculate appropriate zoom level based on max distance between results */
export function zoomLevelForDistance(maxDistKm: number): number {
  if (maxDistKm > 10) return 7
  if (maxDistKm > 3) return 6
  if (maxDistKm > 1) return 5
  if (maxDistKm > 0.5) return 4
  return 3
}
