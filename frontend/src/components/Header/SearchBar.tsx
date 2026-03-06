import { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { searchPlaces, type PlaceResult } from '../../services/api'
import { useMapStore } from '../../stores/mapStore'
import { useReviewStore } from '../../stores/reviewStore'
import { rankFoodFirst } from '../../utils/rankFoodFirst'
import { distanceKm, zoomLevelForDistance } from '../../utils/distance'
import { escapeHtml } from '../../utils/escapeHtml'
import { useReviewedPlaces } from '../../hooks/useReviewedPlaces'

const DEBOUNCE_MS = 200
const SUGGESTIONS_LIMIT = 8
const MAX_LOCAL_RESULTS = 12

export function SearchBar() {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<PlaceResult[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const searchSeqRef = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const { map, setSearchResults, clearMarkers, setMarkers } = useMapStore()
  const { openModal } = useReviewStore()
  const { getReviewedPlaceIds } = useReviewedPlaces()

  const doSearch = useCallback(
    async (q: string) => {
      if (!q.trim() || !map) return

      const seq = ++searchSeqRef.current
      clearMarkers()

      try {
        const center = map.getCenter()
        const res = await searchPlaces(q, {
          x: center.getLng(),
          y: center.getLat(),
        })

        if (seq !== searchSeqRef.current) return

        const docs = rankFoodFirst(res.documents).slice(0, MAX_LOCAL_RESULTS)
        if (docs.length === 0) return

        setSearchResults(docs)

        // Get reviewed place IDs
        const placeIds = docs.map((d) => d.id)
        const reviewedMap = await getReviewedPlaceIds(placeIds)

        // Calculate zoom level
        const focusDoc = docs[0]!
        const focusLat = parseFloat(focusDoc.y)
        const focusLng = parseFloat(focusDoc.x)

        let maxDist = 0
        for (const d of docs) {
          const dist = distanceKm(
            focusLat,
            focusLng,
            parseFloat(d.y),
            parseFloat(d.x),
          )
          if (dist > maxDist) maxDist = dist
        }

        const level = zoomLevelForDistance(maxDist)
        const focusPos = new kakao.maps.LatLng(focusLat, focusLng)
        map.setCenter(focusPos)
        map.setLevel(level)

        // Create markers
        const infoWindow = new kakao.maps.InfoWindow({ zIndex: 3 })
        const newMarkers: kakao.maps.Marker[] = []

        docs.forEach((doc) => {
          const pos = new kakao.maps.LatLng(
            parseFloat(doc.y),
            parseFloat(doc.x),
          )
          const marker = new kakao.maps.Marker({ position: pos, map })

          const visitCount = reviewedMap.get(doc.id) ?? 0
          let reviewedHtml = ''
          if (visitCount === 1) {
            reviewedHtml = `<div class="iw-card__reviewed">${escapeHtml(t('iw.reviewedOnce'))}</div>`
          } else if (visitCount > 1) {
            reviewedHtml = `<div class="iw-card__reviewed">${escapeHtml(t('iw.reviewedMulti', { 0: visitCount }))}</div>`
          }

          const content = buildInfoContent(doc, reviewedHtml, t)

          kakao.maps.event.addListener(marker, 'click', () => {
            infoWindow.setContent(content)
            infoWindow.open(map, marker)
            bindInfoEvents(infoWindow, doc, openModal)
          })

          newMarkers.push(marker)
        })

        setMarkers(newMarkers)

        // Open first marker's InfoWindow after render
        if (newMarkers.length > 0) {
          setTimeout(() => {
            const firstDoc = docs[0]!
            const firstVisitCount = reviewedMap.get(firstDoc.id) ?? 0
            let firstReviewedHtml = ''
            if (firstVisitCount === 1) {
              firstReviewedHtml = `<div class="iw-card__reviewed">${escapeHtml(t('iw.reviewedOnce'))}</div>`
            } else if (firstVisitCount > 1) {
              firstReviewedHtml = `<div class="iw-card__reviewed">${escapeHtml(t('iw.reviewedMulti', { 0: firstVisitCount }))}</div>`
            }
            const firstContent = buildInfoContent(firstDoc, firstReviewedHtml, t)
            infoWindow.setContent(firstContent)
            infoWindow.open(map, newMarkers[0]!)
            bindInfoEvents(infoWindow, firstDoc, openModal)
          }, 100)
        }
      } catch (err) {
        console.error('[search] error:', err)
      }

      setShowSuggestions(false)
    },
    [map, clearMarkers, setSearchResults, setMarkers, openModal, t, getReviewedPlaceIds],
  )

  const fetchSuggestions = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setSuggestions([])
        return
      }

      try {
        const res = await searchPlaces(q)
        const docs = rankFoodFirst(res.documents).slice(0, SUGGESTIONS_LIMIT)
        setSuggestions(docs)
        setShowSuggestions(docs.length > 0)
        setActiveIndex(-1)
      } catch {
        setSuggestions([])
      }
    },
    [],
  )

  const handleInput = useCallback(
    (value: string) => {
      setQuery(value)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => fetchSuggestions(value), DEBOUNCE_MS)
    },
    [fetchSuggestions],
  )

  const selectSuggestion = useCallback(
    (place: PlaceResult) => {
      setQuery(place.place_name)
      setShowSuggestions(false)
      setSuggestions([])

      if (!map) return

      clearMarkers()
      setSearchResults([place])

      const pos = new kakao.maps.LatLng(
        parseFloat(place.y),
        parseFloat(place.x),
      )
      map.setCenter(pos)
      map.setLevel(3)

      const marker = new kakao.maps.Marker({ position: pos, map })
      setMarkers([marker])

      const infoWindow = new kakao.maps.InfoWindow({ zIndex: 3 })
      const content = buildInfoContent(place, '', t)

      setTimeout(() => {
        infoWindow.setContent(content)
        infoWindow.open(map, marker)
        bindInfoEvents(infoWindow, place, openModal)
      }, 100)
    },
    [map, clearMarkers, setSearchResults, setMarkers, openModal, t],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Korean IME check
      if (e.nativeEvent.isComposing || (e as unknown as { keyCode: number }).keyCode === 229) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((prev) => Math.min(prev + 1, suggestions.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((prev) => Math.max(prev - 1, -1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (activeIndex >= 0 && suggestions[activeIndex]) {
          selectSuggestion(suggestions[activeIndex])
        } else {
          doSearch(query)
        }
      } else if (e.key === 'Escape') {
        setShowSuggestions(false)
      }
    },
    [activeIndex, suggestions, selectSuggestion, doSearch, query],
  )

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.search-container')) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="search-container relative">
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          placeholder={t('search.placeholder')}
          className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none max-sm:text-base"
        />
        <button
          type="button"
          onClick={() => doSearch(query)}
          className="rounded-lg bg-accent p-2 text-white transition-colors hover:bg-accent-dark"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
      </div>

      {/* Autocomplete suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <ul
          className="absolute left-0 right-0 top-full z-[9999] mt-1 max-h-80 overflow-y-auto rounded-lg bg-surface shadow-lg ring-1 ring-border"
          role="listbox"
        >
          {suggestions.map((place, i) => (
            <li
              key={place.id}
              role="option"
              aria-selected={i === activeIndex}
              className={`cursor-pointer px-3 py-2.5 text-sm transition-colors ${
                i === activeIndex ? 'bg-accent/10 text-accent' : 'text-text-primary hover:bg-bg'
              }`}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => selectSuggestion(place)}
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">{place.place_name}</span>
                <CategoryTag code={place.category_group_code} />
              </div>
              <div className="text-xs text-text-muted">
                {place.address_name}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ===== Category tag badge ===== */
const CATEGORY_TAGS: Record<string, { label: string; color: string }> = {
  FD6: { label: '음식점', color: 'bg-orange-100 text-orange-700' },
  CE7: { label: '카페', color: 'bg-amber-100 text-amber-700' },
  AT4: { label: '관광명소', color: 'bg-blue-100 text-blue-700' },
}

function CategoryTag({ code }: { code: string }) {
  const tag = CATEGORY_TAGS[code]
  if (!tag) return null
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${tag.color}`}>
      {tag.label}
    </span>
  )
}

/* ===== InfoWindow HTML builder ===== */
function buildInfoContent(
  doc: PlaceResult,
  reviewedHtml: string,
  t: (key: string) => string,
): string {
  const detailUrl = doc.place_url || `https://place.map.kakao.com/${doc.id}`
  return `
    <div class="iw-card">
      <button class="iw-card__close-btn" data-action="close">&times;</button>
      <div class="iw-card__name">${escapeHtml(doc.place_name)}</div>
      <div class="iw-card__category">${escapeHtml(doc.category_name)}</div>
      <div class="iw-card__address">${escapeHtml(doc.address_name)}</div>
      ${reviewedHtml}
      <div class="iw-card__actions">
        <a class="iw-card__link" href="${escapeHtml(detailUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t('iw.detailLink'))}</a>
        <button class="iw-card__btn" data-action="review">${escapeHtml(t('iw.reviewBtn'))}</button>
      </div>
    </div>
  `
}

/* ===== InfoWindow event binding (robust) ===== */
function bindInfoEvents(
  infoWindow: kakao.maps.InfoWindow,
  doc: PlaceResult,
  openModal: (place: PlaceResult) => void,
) {
  setTimeout(() => {
    // Find the latest .iw-card in DOM (Kakao renders InfoWindow content)
    const cards = document.querySelectorAll('.iw-card')
    const iwEl = cards[cards.length - 1]
    if (!iwEl) return
    iwEl.addEventListener('click', (e) => {
      const action = (e.target as HTMLElement)
        .closest('[data-action]')
        ?.getAttribute('data-action')
      if (action === 'close') infoWindow.close()
      if (action === 'review') {
        infoWindow.close()
        openModal(doc)
      }
    })
  }, 80)
}
