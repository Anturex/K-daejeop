import { describe, it, expect } from 'vitest'
import { markReviewedPlaces, computeProgress } from '../../src/stores/badgeStore'

function makePlace(overrides: Record<string, unknown> = {}) {
  return {
    id: 'bp1',
    board_id: 'b1',
    place_id: 'p1',
    place_name: 'Test Place',
    place_address: 'Seoul',
    place_category: '음식점',
    place_x: '127.0',
    place_y: '37.5',
    sort_order: 0,
    ...overrides,
  }
}

describe('markReviewedPlaces', () => {
  it('marks places as reviewed when place_id is in the set', () => {
    const places = [
      makePlace({ place_id: 'p1' }),
      makePlace({ place_id: 'p2', id: 'bp2' }),
      makePlace({ place_id: 'p3', id: 'bp3' }),
    ]
    const reviewed = new Set(['p1', 'p3'])
    const result = markReviewedPlaces(places, reviewed)

    expect(result[0].reviewed).toBe(true)
    expect(result[1].reviewed).toBe(false)
    expect(result[2].reviewed).toBe(true)
  })

  it('handles empty reviewed set', () => {
    const places = [makePlace()]
    const result = markReviewedPlaces(places, new Set())
    expect(result[0].reviewed).toBe(false)
  })

  it('handles empty places array', () => {
    const result = markReviewedPlaces([], new Set(['p1']))
    expect(result).toHaveLength(0)
  })
})

describe('computeProgress', () => {
  it('computes progress correctly', () => {
    const places = [
      { ...makePlace({ place_id: 'p1' }), reviewed: true },
      { ...makePlace({ place_id: 'p2', id: 'bp2' }), reviewed: true },
      { ...makePlace({ place_id: 'p3', id: 'bp3' }), reviewed: false },
      { ...makePlace({ place_id: 'p4', id: 'bp4' }), reviewed: false },
      { ...makePlace({ place_id: 'p5', id: 'bp5' }), reviewed: false },
    ]
    const progress = computeProgress(places)
    expect(progress.reviewed).toBe(2)
    expect(progress.total).toBe(5)
    expect(progress.percent).toBe(40)
  })

  it('returns 100% when all reviewed', () => {
    const places = [
      { ...makePlace({ place_id: 'p1' }), reviewed: true },
      { ...makePlace({ place_id: 'p2', id: 'bp2' }), reviewed: true },
    ]
    const progress = computeProgress(places)
    expect(progress.percent).toBe(100)
  })

  it('returns 0% when none reviewed', () => {
    const places = [
      { ...makePlace({ place_id: 'p1' }), reviewed: false },
    ]
    const progress = computeProgress(places)
    expect(progress.percent).toBe(0)
  })

  it('handles empty places', () => {
    const progress = computeProgress([])
    expect(progress.reviewed).toBe(0)
    expect(progress.total).toBe(0)
    expect(progress.percent).toBe(0)
  })
})
