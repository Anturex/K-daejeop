/**
 * 리뷰 캐시 모듈
 *
 * 세션 동안 내 리뷰 데이터를 메모리에 캐싱하여 DB 호출을 최소화.
 * - getMyReviews(): 캐시 히트 시 즉시 반환, 미스 시 fetch + 캐시
 * - invalidate(): 리뷰 저장/삭제 후 호출 → 다음 조회 시 재로드
 * - getReviewedPlaceIds(placeIds): 캐시에서 place_id 필터링 (DB 0회)
 * - getVisitCount(placeId): 캐시에서 방문 횟수 계산 (DB 0회)
 */

const CACHE_TTL = 5 * 60_000; // 5분

let cachedReviews = null;
let cachedAt = 0;

function isStale() {
  return !cachedReviews || Date.now() - cachedAt > CACHE_TTL;
}

async function fetchAndCache() {
  const sb = window.__getSupabase?.();
  if (!sb) return null;

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return null;

  const { data, error } = await sb
    .from("reviews")
    .select("*")
    .eq("user_id", user.id)
    .order("visited_at", { ascending: false });

  if (error) {
    console.warn("[reviewCache] fetch error:", error.message);
    return null;
  }

  cachedReviews = data ?? [];
  cachedAt = Date.now();
  return cachedReviews;
}

/**
 * 내 리뷰 전체 조회 (캐시 우선)
 * @param {boolean} [forceRefresh=false] 강제 갱신
 * @returns {Promise<Array|null>}
 */
async function getMyReviews(forceRefresh = false) {
  if (!forceRefresh && !isStale()) {
    return cachedReviews;
  }
  return fetchAndCache();
}

/**
 * 캐시 무효화 — 리뷰 저장/삭제 후 호출
 */
function invalidate() {
  cachedReviews = null;
  cachedAt = 0;
}

/**
 * 주어진 placeId 목록 중 내가 리뷰한 장소의 방문 횟수 Map 반환
 * 캐시가 있으면 DB 호출 없이 필터링, 없으면 fetch 후 필터링
 * @param {string[]} placeIds
 * @returns {Promise<Map<string, number>>}
 */
async function getReviewedPlaceIds(placeIds) {
  if (!placeIds?.length) return new Map();

  const reviews = await getMyReviews();
  if (!reviews) return new Map();

  const counts = new Map();
  const idSet = new Set(placeIds);
  reviews.forEach((r) => {
    if (idSet.has(r.place_id)) {
      counts.set(r.place_id, (counts.get(r.place_id) ?? 0) + 1);
    }
  });
  return counts;
}

/**
 * 특정 장소의 방문 횟수 반환
 * @param {string} placeId
 * @returns {Promise<number>}
 */
async function getVisitCount(placeId) {
  if (!placeId) return 0;
  const reviews = await getMyReviews();
  if (!reviews) return 0;
  return reviews.filter((r) => r.place_id === placeId).length;
}

// 글로벌 API 노출
window.__reviewCache = {
  getMyReviews,
  invalidate,
  getReviewedPlaceIds,
  getVisitCount,
};
