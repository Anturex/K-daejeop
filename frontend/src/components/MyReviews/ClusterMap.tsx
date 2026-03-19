import { useEffect, useRef, useCallback } from 'react'
import { useMapStore } from '../../stores/mapStore'
import { useReviewStore, type Review } from '../../stores/reviewStore'
import {
  type Cluster,
  computeClusters,
  getFilteredReviews,
  ANIM_MS,
  MAX_CLUSTER_PHOTOS,
  useCluster,
} from './useCluster'
import { escapeAttr } from '../../utils/escapeHtml'
import { getThumbUrl } from '../../utils/imageUrl'
import { buildReviewPin } from '../../utils/buildReviewPin'
import { useCosmeticStore } from '../../stores/cosmeticStore'

/* ===== Screen pixel helper for flying animation ===== */
function getScreenPx(
  map: kakao.maps.Map,
  lat: number,
  lng: number,
): kakao.maps.Point | null {
  try {
    const proj = map.getProjection()
    const ll = new kakao.maps.LatLng(lat, lng)
    return (
      proj.containerPointFromCoords?.(ll) ??
      proj.containerPixelFromCoords?.(ll) ??
      null
    )
  } catch {
    return null
  }
}

/* ===== Overlay builders ===== */
function buildCluster(cluster: Cluster): HTMLDivElement {
  // Deduplicate by place_id, show only unique place photos
  const seen = new Set<string>()
  const uniqueReviews = cluster.reviews.filter((r) => {
    const key = r.place_id || `${r.lat},${r.lng}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  const count = uniqueReviews.length
  const photos = uniqueReviews
    .slice(0, MAX_CLUSTER_PHOTOS)
    .map((r) => r.photo_url)

  const el = document.createElement('div')
  el.className = 'rv-cluster'
  el.innerHTML = `
    <div class="rv-cluster__box">
      <div class="rv-cluster__grid">
        ${photos
          .map(
            (src) =>
              `<div class="rv-cluster__cell"><img src="${escapeAttr(getThumbUrl(src))}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${escapeAttr(src)}'" /></div>`,
          )
          .join('')}
      </div>
    </div>
    <div class="rv-cluster__tail"></div>
    <div class="rv-cluster__badge">${count}</div>
  `
  return el
}

function buildPin(cluster: Cluster): HTMLDivElement {
  const cosmeticClasses = useCosmeticStore.getState().getPinClasses()
  return buildReviewPin(cluster.reviews[0], cosmeticClasses)
}

/* ===== Props ===== */
interface ClusterMapProps {
  allReviews: Review[]
  activeCategory: string
  activeRating: string
  isActive: boolean
}

export function ClusterMap({
  allReviews,
  activeCategory,
  activeRating,
  isActive,
}: ClusterMapProps) {
  const map = useMapStore((s) => s.map)
  const { openDetail } = useReviewStore()

  const {
    initialRenderDoneRef,
    zoomDebounceRef,
    setActiveClusters,
    getActiveClusters,
  } = useCluster()

  // Stable refs for values used inside imperative callbacks
  const allReviewsRef = useRef(allReviews)
  const activeCategoryRef = useRef(activeCategory)
  const activeRatingRef = useRef(activeRating)
  const isActiveRef = useRef(isActive)
  const mapRef = useRef(map)

  allReviewsRef.current = allReviews
  activeCategoryRef.current = activeCategory
  activeRatingRef.current = activeRating
  isActiveRef.current = isActive
  mapRef.current = map

  /* ===== Animation helpers ===== */
  const animateOut = useCallback(
    (
      cluster: Cluster,
      targetNc: Cluster | null,
    ) => {
      if (!cluster.element) return
      let dx = 0
      let dy = 0

      if (targetNc && mapRef.current) {
        const oPx = getScreenPx(mapRef.current, cluster.lat, cluster.lng)
        const nPx = getScreenPx(mapRef.current, targetNc.lat, targetNc.lng)
        if (oPx && nPx) {
          dx = nPx.x - oPx.x
          dy = nPx.y - oPx.y
          const dist = Math.hypot(dx, dy)
          if (dist > 280) {
            dx = (dx / dist) * 280
            dy = (dy / dist) * 280
          }
        }
      }

      const el = cluster.element
      el.style.transition = `transform ${Math.round(ANIM_MS * 0.75)}ms ease-in, opacity ${Math.round(ANIM_MS * 0.45)}ms ease`
      el.style.transform = `translate(${dx}px, ${dy}px) scale(0.3)`
      el.style.opacity = '0'
      const ref = cluster.overlay
      setTimeout(() => ref?.setMap(null), ANIM_MS + 40)
    },
    [],
  )

  const findNewForOld = useCallback(
    (
      oldCluster: Cluster,
      newToOld: Map<Cluster, Cluster | null>,
    ): Cluster | null => {
      for (const [nc, oc] of newToOld) {
        if (oc === oldCluster) return nc
      }
      return null
    },
    [],
  )

  const animateTransition = useCallback(
    (
      oldClusters: Cluster[],
      newClusters: Cluster[],
    ) => {
      const currentMap = mapRef.current
      if (!currentMap) return

      // Match new clusters to nearest old cluster
      const newToOld = new Map<Cluster, Cluster | null>()
      for (const nc of newClusters) {
        let best: Cluster | null = null
        let bestDist = Infinity
        for (const oc of oldClusters) {
          const d = Math.hypot(nc.lat - oc.lat, nc.lng - oc.lng)
          if (d < bestDist) {
            bestDist = d
            best = oc
          }
        }
        newToOld.set(nc, best)
      }

      // Animate old clusters out
      for (const oc of oldClusters) {
        animateOut(oc, findNewForOld(oc, newToOld))
      }

      // Animate new clusters in (fly from old position)
      for (const nc of newClusters) {
        const oldMatch = newToOld.get(nc)
        const { overlay, element } = createOverlay(nc, currentMap, openDetail)
        nc.overlay = overlay
        nc.element = element

        let startDx = 0
        let startDy = 0

        if (oldMatch) {
          const oPx = getScreenPx(currentMap, oldMatch.lat, oldMatch.lng)
          const nPx = getScreenPx(currentMap, nc.lat, nc.lng)
          if (oPx && nPx) {
            startDx = oPx.x - nPx.x
            startDy = oPx.y - nPx.y
            const dist = Math.hypot(startDx, startDy)
            if (dist > 280) {
              startDx = (startDx / dist) * 280
              startDy = (startDy / dist) * 280
            }
          }
        }

        element.style.transition = 'none'
        element.style.transform = `translate(${startDx}px, ${startDy}px) scale(0.35)`
        element.style.opacity = '0'
        overlay.setMap(currentMap)

        // Double rAF to ensure 'transition: none' takes effect first
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            element.style.transition = `transform ${ANIM_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity ${Math.round(ANIM_MS * 0.65)}ms ease`
            element.style.transform = 'translate(0, 0) scale(1)'
            element.style.opacity = '1'
          }),
        )
      }
    },
    [animateOut, findNewForOld, openDetail],
  )

  /* ===== Render clusters ===== */
  const renderClusters = useCallback(
    (
      newClusters: Cluster[],
      oldClusters: Cluster[] | null,
    ) => {
      const currentMap = mapRef.current
      if (!currentMap) return

      if (oldClusters && oldClusters.length > 0) {
        animateTransition(oldClusters, newClusters)
      } else {
        // Initial render: stagger pop-in
        newClusters.forEach((c, i) => {
          const { overlay, element } = createOverlay(c, currentMap, openDetail)
          c.overlay = overlay
          c.element = element
          element.style.opacity = '0'
          element.style.transform = 'scale(0.4)'
          overlay.setMap(currentMap)

          setTimeout(
            () =>
              requestAnimationFrame(() =>
                requestAnimationFrame(() => {
                  element.style.transition =
                    'opacity 280ms ease, transform 350ms cubic-bezier(0.34, 1.56, 0.64, 1)'
                  element.style.opacity = '1'
                  element.style.transform = 'scale(1)'
                }),
              ),
            Math.min(i * 25, 200),
          )
        })
      }

      setActiveClusters(newClusters)
    },
    [animateTransition, openDetail, setActiveClusters],
  )

  /* ===== Recompute on filter change ===== */
  const recomputeAndRender = useCallback(() => {
    const currentMap = mapRef.current
    if (!currentMap || !isActiveRef.current) return

    const filtered = getFilteredReviews(
      allReviewsRef.current,
      activeCategoryRef.current,
      activeRatingRef.current,
    )
    const old = getActiveClusters()
    setActiveClusters([])
    renderClusters(computeClusters(filtered, currentMap), old)
  }, [getActiveClusters, renderClusters, setActiveClusters])

  /* ===== Fit map to all reviews ===== */
  const fitMapToReviews = useCallback(() => {
    const currentMap = mapRef.current
    if (!currentMap) return

    const bounds = new kakao.maps.LatLngBounds()
    let count = 0

    for (const r of allReviewsRef.current) {
      const lat = r.lat
      const lng = r.lng
      if (!isNaN(lat) && !isNaN(lng)) {
        bounds.extend(new kakao.maps.LatLng(lat, lng))
        count++
      }
    }

    if (count === 1) {
      currentMap.setCenter(bounds.getSouthWest())
      currentMap.setLevel(5)
    } else if (count > 1) {
      currentMap.setBounds(bounds)
    }
  }, [])

  /* ===== Activation lifecycle ===== */
  useEffect(() => {
    if (!isActive || !map) return

    const currentMap = map
    initialRenderDoneRef.current = false

    // Manual once pattern: idle after fitBounds triggers first cluster render
    let idleRendered = false
    const onFirstIdle = () => {
      kakao.maps.event.removeListener(currentMap, 'idle', onFirstIdle)
      if (!isActiveRef.current || idleRendered) return
      idleRendered = true
      initialRenderDoneRef.current = true

      const filtered = getFilteredReviews(
        allReviewsRef.current,
        activeCategoryRef.current,
        activeRatingRef.current,
      )
      renderClusters(computeClusters(filtered, currentMap), null)
    }
    kakao.maps.event.addListener(currentMap, 'idle', onFirstIdle)

    // Fit map to reviews (triggers idle event)
    fitMapToReviews()

    // Fallback: if setBounds doesn't trigger idle (already at those bounds)
    const fallbackTimer = setTimeout(() => {
      if (!isActiveRef.current || idleRendered) return
      idleRendered = true
      initialRenderDoneRef.current = true

      const filtered = getFilteredReviews(
        allReviewsRef.current,
        activeCategoryRef.current,
        activeRatingRef.current,
      )
      renderClusters(computeClusters(filtered, currentMap), null)
    }, 1500)

    // Zoom change handler
    const onZoomChanged = () => {
      if (!isActiveRef.current || !initialRenderDoneRef.current) return
      if (zoomDebounceRef.current) clearTimeout(zoomDebounceRef.current)
      zoomDebounceRef.current = setTimeout(() => {
        if (!isActiveRef.current) return
        const filtered = getFilteredReviews(
          allReviewsRef.current,
          activeCategoryRef.current,
          activeRatingRef.current,
        )
        const old = getActiveClusters()
        setActiveClusters([])
        renderClusters(computeClusters(filtered, currentMap), old)
      }, 60)
    }
    kakao.maps.event.addListener(currentMap, 'zoom_changed', onZoomChanged)

    return () => {
      kakao.maps.event.removeListener(currentMap, 'idle', onFirstIdle)
      kakao.maps.event.removeListener(
        currentMap,
        'zoom_changed',
        onZoomChanged,
      )
      clearTimeout(fallbackTimer)
      if (zoomDebounceRef.current) clearTimeout(zoomDebounceRef.current)

      // Animate out all clusters
      const current = getActiveClusters()
      for (const c of current) {
        animateOut(c, null)
      }
      setActiveClusters([])
      initialRenderDoneRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, map])

  /* ===== Re-render on filter or reviews change ===== */
  const prevCategoryRef = useRef(activeCategory)
  const prevRatingRef = useRef(activeRating)
  const prevReviewsLenRef = useRef(allReviews.length)

  useEffect(() => {
    if (!isActive || !map || !initialRenderDoneRef.current) return

    const categoryChanged = prevCategoryRef.current !== activeCategory
    const ratingChanged = prevRatingRef.current !== activeRating
    const reviewsChanged = prevReviewsLenRef.current !== allReviews.length

    prevCategoryRef.current = activeCategory
    prevRatingRef.current = activeRating
    prevReviewsLenRef.current = allReviews.length

    if (categoryChanged || ratingChanged || reviewsChanged) {
      recomputeAndRender()
    }
  }, [isActive, map, activeCategory, activeRating, allReviews, recomputeAndRender])

  // This component manages overlays imperatively; it renders nothing to React DOM
  return null
}

/* ===== Overlay factory (outside component to avoid recreating) ===== */
function createOverlay(
  cluster: Cluster,
  map: kakao.maps.Map,
  openDetail: (reviews: Review[], index?: number) => void,
): { overlay: kakao.maps.CustomOverlay; element: HTMLDivElement } {
  const uniquePlaces = new Set(
    cluster.reviews.map((r) => r.place_id || `${r.lat},${r.lng}`),
  ).size
  const isSingle = uniquePlaces === 1
  const element = isSingle ? buildPin(cluster) : buildCluster(cluster)

  const overlay = new kakao.maps.CustomOverlay({
    position: new kakao.maps.LatLng(cluster.lat, cluster.lng),
    content: element,
    zIndex: isSingle ? 4 : 3,
    yAnchor: 1.0,
  })

  element.addEventListener('click', () => {
    if (isSingle) {
      openDetail(cluster.reviews, 0)
    } else {
      // Zoom into the cluster
      map.setCenter(new kakao.maps.LatLng(cluster.lat, cluster.lng))
      map.setLevel(Math.max(1, map.getLevel() - 2))
    }
  })

  return { overlay, element }
}
