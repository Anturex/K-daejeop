import { useCallback } from 'react'
import { useReviewStore, mapRawReview } from '../stores/reviewStore'
import { getSupabase } from '../services/supabase'
import { useAuthStore } from '../stores/authStore'

export function useReviewedPlaces() {
  const { cachedReviews, isCacheValid, setCachedReviews } = useReviewStore()
  const user = useAuthStore((s) => s.user)

  const getMyReviews = useCallback(
    async (forceRefresh = false) => {
      if (!forceRefresh && isCacheValid() && cachedReviews) {
        return cachedReviews
      }

      if (!user) return []

      const sb = getSupabase()
      const { data, error } = await sb
        .from('reviews')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[reviewCache] fetch error:', error)
        return cachedReviews ?? []
      }

      const mapped = (data ?? []).map(mapRawReview)
      setCachedReviews(mapped)
      return mapped
    },
    [user, cachedReviews, isCacheValid, setCachedReviews],
  )

  const getReviewedPlaceIds = useCallback(
    async (placeIds: string[]): Promise<Map<string, number>> => {
      const reviews = await getMyReviews()
      const countMap = new Map<string, number>()

      for (const r of reviews) {
        if (placeIds.includes(r.place_id)) {
          countMap.set(r.place_id, (countMap.get(r.place_id) ?? 0) + 1)
        }
      }

      return countMap
    },
    [getMyReviews],
  )

  const getVisitCount = useCallback(
    async (placeId: string): Promise<number> => {
      const reviews = await getMyReviews()
      return reviews.filter((r) => r.place_id === placeId).length
    },
    [getMyReviews],
  )

  return { getMyReviews, getReviewedPlaceIds, getVisitCount }
}
