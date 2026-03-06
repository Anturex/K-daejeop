import { describe, it, expect } from 'vitest'
import { distanceKm, zoomLevelForDistance, isWithinVisitRange } from '../../src/utils/distance'

describe('distanceKm', () => {
  it('returns 0 for same point', () => {
    expect(distanceKm(37.5665, 126.978, 37.5665, 126.978)).toBe(0)
  })

  it('calculates distance between Seoul and Busan (~325 km)', () => {
    const d = distanceKm(37.5665, 126.978, 35.1796, 129.0756)
    expect(d).toBeGreaterThan(300)
    expect(d).toBeLessThan(350)
  })

  it('calculates short distance accurately', () => {
    // ~1.1 km between two close points in Seoul
    const d = distanceKm(37.5665, 126.978, 37.576, 126.978)
    expect(d).toBeGreaterThan(0.5)
    expect(d).toBeLessThan(2)
  })
})

describe('zoomLevelForDistance', () => {
  it('returns 7 for >10 km', () => {
    expect(zoomLevelForDistance(15)).toBe(7)
  })

  it('returns 6 for >3 km', () => {
    expect(zoomLevelForDistance(5)).toBe(6)
  })

  it('returns 5 for >1 km', () => {
    expect(zoomLevelForDistance(2)).toBe(5)
  })

  it('returns 4 for >0.5 km', () => {
    expect(zoomLevelForDistance(0.7)).toBe(4)
  })

  it('returns 3 for <=0.5 km', () => {
    expect(zoomLevelForDistance(0.3)).toBe(3)
  })
})

describe('isWithinVisitRange', () => {
  it('returns true for same point', () => {
    expect(isWithinVisitRange(37.5665, 126.978, 37.5665, 126.978)).toBe(true)
  })

  it('returns true for points within 200m', () => {
    // ~100m apart
    expect(isWithinVisitRange(37.5665, 126.978, 37.5674, 126.978)).toBe(true)
  })

  it('returns false for points beyond 200m', () => {
    // ~1.1km apart
    expect(isWithinVisitRange(37.5665, 126.978, 37.576, 126.978)).toBe(false)
  })

  it('returns false for far away points', () => {
    expect(isWithinVisitRange(37.5665, 126.978, 35.1796, 129.0756)).toBe(false)
  })
})
