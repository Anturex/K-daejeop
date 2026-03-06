import { describe, it, expect } from 'vitest'
import { rankFoodFirst } from '../../src/utils/rankFoodFirst'
import type { PlaceResult } from '../../src/services/api'

function makeMock(code: string, name: string): PlaceResult {
  return {
    id: name,
    place_name: name,
    category_group_code: code,
    category_name: '',
    address_name: '',
    road_address_name: '',
    x: '127',
    y: '37',
    phone: '',
    place_url: '',
  }
}

describe('rankFoodFirst', () => {
  it('moves restaurants (FD6) and cafes (CE7) before others', () => {
    const input = [
      makeMock('AT4', 'attraction'),
      makeMock('FD6', 'restaurant'),
      makeMock('', 'other'),
      makeMock('CE7', 'cafe'),
    ]
    const result = rankFoodFirst(input)
    expect(result.map((r) => r.place_name)).toEqual([
      'restaurant',
      'cafe',
      'attraction',
      'other',
    ])
  })

  it('preserves relative order within food and non-food groups', () => {
    const input = [
      makeMock('FD6', 'r1'),
      makeMock('AT4', 'a1'),
      makeMock('FD6', 'r2'),
      makeMock('AT4', 'a2'),
    ]
    const result = rankFoodFirst(input)
    expect(result.map((r) => r.place_name)).toEqual([
      'r1',
      'r2',
      'a1',
      'a2',
    ])
  })

  it('handles empty array', () => {
    expect(rankFoodFirst([])).toEqual([])
  })

  it('handles all food results', () => {
    const input = [
      makeMock('FD6', 'r1'),
      makeMock('CE7', 'c1'),
    ]
    const result = rankFoodFirst(input)
    expect(result).toHaveLength(2)
    expect(result[0]!.place_name).toBe('r1')
    expect(result[1]!.place_name).toBe('c1')
  })
})
