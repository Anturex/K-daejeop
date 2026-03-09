import { useEffect, useRef, useCallback } from 'react'
import { useMapStore } from '../stores/mapStore'
import { useReviewStore, type Review } from '../stores/reviewStore'
import { useBadgeStore } from '../stores/badgeStore'
import { buildReviewPin, buildUnreviewedPin } from '../utils/buildReviewPin'
import { escapeHtml, escapeAttr } from '../utils/escapeHtml'
import type { PlaceResult } from '../services/api'
import { useTranslation } from 'react-i18next'

/**
 * Manages badge board pin overlays on the map at AppLayout level.
 * Decoupled from BadgeBoardDetail so pins survive panel hide/swipe.
 */
export function useBoardPins() {
  const { t } = useTranslation()
  const map = useMapStore((s) => s.map)
  const boardPlaces = useBadgeStore((s) => s.boardPlaces)
  const boardPinsActive = useBadgeStore((s) => s.boardPinsActive)
  const cachedReviews = useReviewStore((s) => s.cachedReviews)
  const openDetail = useReviewStore((s) => s.openDetail)
  const openModal = useReviewStore((s) => s.openModal)
  const overlaysRef = useRef<kakao.maps.CustomOverlay[]>([])
  const infoOverlayRef = useRef<kakao.maps.CustomOverlay | null>(null)

  const clearInfoOverlay = useCallback(() => {
    if (infoOverlayRef.current) {
      infoOverlayRef.current.setMap(null)
      infoOverlayRef.current = null
    }
  }, [])

  const clearOverlays = useCallback(() => {
    clearInfoOverlay()
    for (const ov of overlaysRef.current) {
      ov.setMap(null)
    }
    overlaysRef.current = []
  }, [clearInfoOverlay])

  useEffect(() => {
    if (!map || !boardPinsActive || boardPlaces.length === 0) {
      clearOverlays()
      return
    }

    // Clear previous before creating new
    clearOverlays()

    const bounds = new kakao.maps.LatLngBounds()
    const newOverlays: kakao.maps.CustomOverlay[] = []

    boardPlaces.forEach((place, index) => {
      const lat = parseFloat(place.place_y)
      const lng = parseFloat(place.place_x)
      if (isNaN(lat) || isNaN(lng)) return

      const position = new kakao.maps.LatLng(lat, lng)
      bounds.extend(position)

      // Find matching review for reviewed places
      let pinEl: HTMLDivElement
      let matchedReviews: Review[] = []

      if (place.reviewed && cachedReviews) {
        matchedReviews = cachedReviews.filter((r) => r.place_id === place.place_id)
        if (matchedReviews.length > 0) {
          pinEl = buildReviewPin(matchedReviews[0])
        } else {
          pinEl = buildUnreviewedPin(place.place_name, t('badge.unvisited'))
        }
      } else {
        pinEl = buildUnreviewedPin(place.place_name, t('badge.unvisited'))
      }

      // Click handler
      const reviews = matchedReviews
      const isUnreviewed = reviews.length === 0
      pinEl.addEventListener('click', () => {
        if (!map) return
        clearInfoOverlay()
        map.setCenter(new kakao.maps.LatLng(lat, lng))
        map.setLevel(3)

        if (reviews.length > 0) {
          openDetail(reviews, 0)
        } else {
          // Show info card for unreviewed place
          const cardEl = document.createElement('div')
          cardEl.className = 'iw-card iw-card--standalone'
          cardEl.style.width = '220px'
          cardEl.innerHTML = `
            <button class="iw-card__close-btn" type="button">&times;</button>
            <div class="iw-card__name">${escapeHtml(place.place_name)}</div>
            ${place.place_address ? `<div class="iw-card__address">${escapeHtml(place.place_address)}</div>` : ''}
            <div class="iw-card__actions">
              <a class="iw-card__link" href="https://place.map.kakao.com/${escapeAttr(place.place_id)}" target="_blank" rel="noopener noreferrer">
                ${escapeHtml(t('review.viewDetail'))}
              </a>
              <button class="iw-card__btn" data-action="review">${escapeHtml(t('iw.reviewBtn'))}</button>
            </div>
          `
          // Close button handler
          const closeBtn = cardEl.querySelector('.iw-card__close-btn')
          if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
              e.stopPropagation()
              clearInfoOverlay()
            })
          }
          // Review button handler
          const reviewBtn = cardEl.querySelector('[data-action="review"]')
          if (reviewBtn) {
            reviewBtn.addEventListener('click', (e) => {
              e.stopPropagation()
              clearInfoOverlay()
              const placeResult: PlaceResult = {
                id: place.place_id,
                place_name: place.place_name,
                category_name: place.place_category ?? '',
                category_group_code: '',
                address_name: place.place_address ?? '',
                road_address_name: '',
                phone: '',
                x: place.place_x,
                y: place.place_y,
                place_url: `https://place.map.kakao.com/${place.place_id}`,
              }
              openModal(placeResult)
            })
          }

          const infoOv = new kakao.maps.CustomOverlay({
            position: new kakao.maps.LatLng(lat, lng),
            content: cardEl,
            yAnchor: 2.5,
            zIndex: 10,
          })
          infoOv.setMap(map)
          infoOverlayRef.current = infoOv
        }
      })

      // Stagger animation
      pinEl.style.opacity = '0'
      pinEl.style.transform = 'scale(0.5)'
      pinEl.style.transition = 'opacity 0.2s ease, transform 0.2s ease'

      const overlay = new kakao.maps.CustomOverlay({
        position,
        content: pinEl,
        yAnchor: 1.0,
        zIndex: isUnreviewed ? 4 : 5,
      })

      overlay.setMap(map)
      newOverlays.push(overlay)

      // Stagger pop-in
      const delay = Math.min(index * 30, 300)
      setTimeout(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            pinEl.style.opacity = ''
            pinEl.style.transform = ''
          })
        })
      }, delay)
    })

    overlaysRef.current = newOverlays

    // Fit map to show all pins
    // Mobile: normal padding (user swipes panel down to see pins)
    // Desktop: extra right padding for 320px sidebar
    if (newOverlays.length > 0) {
      const isMobile = window.innerWidth <= 640
      const rightPad = isMobile ? 20 : 340
      map.setBounds(bounds, 60, rightPad, 40, 20)
    }

    return () => {
      clearOverlays()
    }
  }, [map, boardPinsActive, boardPlaces, cachedReviews, openDetail, openModal, clearOverlays, clearInfoOverlay, t])
}
