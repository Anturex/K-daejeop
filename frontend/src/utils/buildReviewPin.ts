import type { Review } from '../stores/reviewStore'
import { escapeHtml, escapeAttr } from './escapeHtml'
import { getThumbUrl } from './imageUrl'

/**
 * Build a review pin HTML element for Kakao Maps CustomOverlay.
 * Extracted from ClusterMap.tsx to allow reuse in BadgeBoardDetail.
 */
export function buildReviewPin(review: Review): HTMLDivElement {
  const stars =
    review.rating === 0
      ? '\u2715'
      : '\u2605'.repeat(review.rating) + '\u2606'.repeat(3 - review.rating)
  const name = review.place_name || ''
  const verifiedHtml = review.verified_visit
    ? '<div class="rv-pin__verified"></div>'
    : ''

  const el = document.createElement('div')
  el.className = 'rv-pin' + (name.length <= 5 ? ' rv-pin--short-name' : '')
  el.innerHTML = `
    <div class="rv-pin__photo-wrap">
      <div class="rv-pin__name"><span>${escapeHtml(name)}</span></div>
      <img class="rv-pin__photo" src="${escapeAttr(getThumbUrl(review.photo_url))}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${escapeAttr(review.photo_url)}'" />
      <div class="rv-pin__rating">${stars}</div>
      ${verifiedHtml}
    </div>
    <div class="rv-pin__tail"></div>
  `
  return el
}
