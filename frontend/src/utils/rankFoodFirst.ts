import type { PlaceResult } from '../services/api'

/** Move restaurants (FD6) and cafes (CE7) to the front of the results */
export function rankFoodFirst(docs: PlaceResult[]): PlaceResult[] {
  const food: PlaceResult[] = []
  const rest: PlaceResult[] = []

  for (const d of docs) {
    if (d.category_group_code === 'FD6' || d.category_group_code === 'CE7') {
      food.push(d)
    } else {
      rest.push(d)
    }
  }

  return [...food, ...rest]
}
