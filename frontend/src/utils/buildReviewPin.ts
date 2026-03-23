import type { Review } from '../stores/reviewStore'
import { escapeHtml, escapeAttr } from './escapeHtml'
import { getThumbUrl } from './imageUrl'

/**
 * Build a review pin HTML element for Kakao Maps CustomOverlay.
 * Extracted from ClusterMap.tsx to allow reuse in BadgeBoardDetail.
 * @param cosmeticClasses – extra CSS classes from cosmeticStore.getPinClasses()
 */
export function buildReviewPin(review: Review, cosmeticClasses = ''): HTMLDivElement {
  const stars =
    review.rating === 0
      ? '\u2715'
      : '\u2605'.repeat(review.rating) + '\u2606'.repeat(3 - review.rating)
  const name = review.place_name || ''
  const verifiedHtml = review.verified_visit
    ? '<div class="rv-pin__verified"></div>'
    : ''

  // Separate tail classes (rv-pin__tail--*) from root classes
  const classes = cosmeticClasses ? cosmeticClasses.split(' ') : []
  const tailClasses = classes.filter((c) => c.startsWith('rv-pin__tail--'))
  const rootClasses = classes.filter((c) => !c.startsWith('rv-pin__tail--'))

  const baseClass = 'rv-pin' + (name.length <= 5 ? ' rv-pin--short-name' : '')
  const el = document.createElement('div')
  el.className = rootClasses.length ? `${baseClass} ${rootClasses.join(' ')}` : baseClass
  const tailClass = tailClasses.length ? `rv-pin__tail ${tailClasses.join(' ')}` : 'rv-pin__tail'
  el.innerHTML = `
    <div class="rv-pin__photo-wrap">
      <div class="rv-pin__name"><span>${escapeHtml(name)}</span></div>
      <img class="rv-pin__photo" src="${escapeAttr(getThumbUrl(review.photo_url))}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${escapeAttr(review.photo_url)}'" />
      <div class="rv-pin__rating">${stars}</div>
      ${verifiedHtml}
    </div>
    <div class="${tailClass}"></div>
  `
  return el
}

/**
 * Build a mini pin (small circle dot) for collapsed review display during search.
 * Shows thumbnail photo in a small circle with white border.
 */
export function buildMiniPin(review: Review): HTMLDivElement {
  const el = document.createElement('div')
  el.className = 'rv-pin-mini'
  el.innerHTML = `<img src="${escapeAttr(getThumbUrl(review.photo_url))}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${escapeAttr(review.photo_url)}'" />`
  return el
}

/**
 * Build a mini cluster dot for collapsed cluster display during search.
 * Shows count number in a small circle.
 */
export function buildMiniCluster(count: number): HTMLDivElement {
  const el = document.createElement('div')
  el.className = 'rv-pin-mini rv-pin-mini--cluster'
  el.innerHTML = `<span>${count}</span>`
  return el
}

/**
 * Build an unreviewed place pin for badge board map display.
 * Shows place name + dashed placeholder + "미방문" label.
 */
export function buildUnreviewedPin(placeName: string, label: string): HTMLDivElement {
  const name = placeName || ''
  const el = document.createElement('div')
  el.className = 'rv-pin rv-pin--unreviewed' + (name.length <= 5 ? ' rv-pin--short-name' : '')
  el.innerHTML = `
    <div class="rv-pin__photo-wrap">
      <div class="rv-pin__name"><span>${escapeHtml(name)}</span></div>
      <div class="rv-pin__placeholder">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>
      <div class="rv-pin__unvisited-label">${escapeHtml(label)}</div>
    </div>
    <div class="rv-pin__tail rv-pin__tail--muted"></div>
  `
  return el
}
