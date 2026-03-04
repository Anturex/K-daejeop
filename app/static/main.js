/* ===== DOM ===== */
const statusEl = document.getElementById("status");
const statusTextEl = document.getElementById("status-text");
const noResultsEl = document.getElementById("no-results");
const noResultsTextEl = document.getElementById("no-results-text");
const inputEl = document.getElementById("search-input");
const buttonEl = document.getElementById("search-button");
const suggestionsEl = document.getElementById("suggestions");

/* ===== State ===== */
let map = null;
let infoWindow = null;
const markers = [];
let debounceTimer = null;
let activeIndex = -1;
let currentSuggestions = [];
let statusTimer = null;
let noResultsTimer = null;
let searchSeq = 0; // 검색 순서 ID (stale 응답 무시용)

const MAX_LOCAL_RESULTS = 12;
const FAR_SPREAD_KM = 20;
const DEBOUNCE_MS = 200;
const SUGGESTIONS_LIMIT = 8;

/* ===== Toast (단일 상태 관리) ===== */
function showStatus(message, duration = 0) {
  clearTimeout(statusTimer);
  statusTextEl.textContent = message;
  statusEl.classList.add("is-visible");
  if (duration > 0) {
    statusTimer = setTimeout(() => {
      statusEl.classList.remove("is-visible");
    }, duration);
  }
}

function hideStatus() {
  clearTimeout(statusTimer);
  statusEl.classList.remove("is-visible");
}

function showNoResults(query) {
  clearTimeout(noResultsTimer);
  noResultsTextEl.textContent = window.__i18n?.tf("search.noResults", query) ?? `"${query}" 검색 결과가 없습니다`;
  noResultsEl.classList.add("is-visible");
  noResultsTimer = setTimeout(() => {
    noResultsEl.classList.remove("is-visible");
  }, 4000);
}

function hideNoResults() {
  clearTimeout(noResultsTimer);
  noResultsEl.classList.remove("is-visible");
}

/* ===== Markers ===== */
function clearMarkers() {
  while (markers.length) markers.pop().setMap(null);
}

/* ===== 내 리뷰 장소 조회 (캐시 경유) ===== */
async function fetchMyReviewedIds(placeIds) {
  if (!placeIds.length) return new Map();
  try {
    return await window.__reviewCache?.getReviewedPlaceIds(placeIds) ?? new Map();
  } catch {
    return new Map();
  }
}

/* ===== Info Window ===== */
function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

function buildInfoContent(place, reviewCount = 0) {
  const name = place.place_name || "";
  const category = place.category_group_name || "";
  const address = place.road_address_name || place.address_name || "";
  const phone = place.phone || "";
  const pid = place.id || "";
  const url = place.place_url || (pid ? `https://place.map.kakao.com/${pid}` : "");

  let h = '<div class="iw-card">';
  h += `<button class="iw-card__close-btn" type="button" aria-label="닫기">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
      stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  </button>`;
  h += `<div class="iw-card__name">${escapeHtml(name)}</div>`;
  if (reviewCount > 0) {
    const t = window.__i18n?.t; const tf = window.__i18n?.tf;
    const visitText = reviewCount === 1
      ? (t?.("iw.reviewedOnce") ?? "내가 리뷰한 곳")
      : (tf?.("iw.reviewedMulti", reviewCount) ?? `${reviewCount}번 방문한 곳`);
    h += `<div class="iw-card__reviewed">⭐ ${escapeHtml(visitText)}</div>`;
  }
  if (category) h += `<span class="iw-card__category">${escapeHtml(category)}</span>`;
  if (address) h += `<div class="iw-card__address">${escapeHtml(address)}</div>`;
  if (phone) h += `<div class="iw-card__phone">📞 ${escapeHtml(phone)}</div>`;

  // 리뷰/상세 버튼 행
  h += '<div class="iw-card__actions">';
  h += `<button class="iw-card__review-btn" data-place-id="${escapeHtml(pid)}" data-place-name="${escapeHtml(name)}" data-place-address="${escapeHtml(address)}" data-place-category="${escapeHtml(category)}" data-place-x="${escapeHtml(place.x || "")}" data-place-y="${escapeHtml(place.y || "")}">`;
  h += `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
  h += ` ${escapeHtml(window.__i18n?.t("iw.reviewBtn") ?? "리뷰 남기기")}</button>`;
  if (url) h += `<a class="iw-card__link" href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(window.__i18n?.t("iw.detailLink") ?? "상세보기 →")}</a>`;
  h += "</div>";

  h += "</div>";
  return h;
}

function renderPlace(place, reviewCount = 0) {
  const pos = new kakao.maps.LatLng(place.y, place.x);
  const marker = new kakao.maps.Marker({ position: pos });
  marker.setMap(map);
  markers.push(marker);

  const content = buildInfoContent(place, reviewCount);
  kakao.maps.event.addListener(marker, "click", () => {
    infoWindow.setContent(content);
    infoWindow.open(map, marker);
    map.panTo(pos);
  });

  // InfoWindow는 호출자가 지도 포지셔닝 완료 후 여는 것이 원칙
  // (auto-pan이 setCenter/setBounds와 충돌하는 것을 방지)
  return { marker, content, pos };
}

/* ===== Geo helpers ===== */
function toLatLng(p) {
  return p?.x && p?.y ? new kakao.maps.LatLng(p.y, p.x) : null;
}

function toRadians(v) {
  return (v * Math.PI) / 180;
}

function distanceKm(a, b) {
  const R = 6371;
  const dLat = toRadians(b.getLat() - a.getLat());
  const dLon = toRadians(b.getLng() - a.getLng());
  const lat1 = toRadians(a.getLat());
  const lat2 = toRadians(b.getLat());
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function getFirstValidPosition(results) {
  const t = results.find((p) => p?.x && p?.y);
  return t ? toLatLng(t) : null;
}

/* ===== 음식점·카페 우선 정렬 =====
 * Kakao category_group_code: FD6 = 음식점, CE7 = 카페
 * 원래 API 순서를 유지하면서 음식 관련 장소를 앞으로 이동 */
const FOOD_CATEGORY_CODES = new Set(["FD6", "CE7"]);

function rankFoodFirst(docs) {
  const food = docs.filter((d) => FOOD_CATEGORY_CODES.has(d.category_group_code));
  const other = docs.filter((d) => !FOOD_CATEGORY_CODES.has(d.category_group_code));
  return [...food, ...other];
}

function getNearbyResults(results, anchor) {
  const valid = results
    .map((place) => ({ place, position: toLatLng(place) }))
    .filter((item) => item.position);
  if (!valid.length || !anchor) return [];
  const distances = valid.map((item) => ({
    ...item,
    distance: distanceKm(anchor, item.position),
  }));
  const maxD = Math.max(...distances.map((d) => d.distance));
  if (maxD > FAR_SPREAD_KM) {
    return distances.filter((d) => d.distance <= FAR_SPREAD_KM).slice(0, MAX_LOCAL_RESULTS);
  }
  return distances.slice(0, MAX_LOCAL_RESULTS);
}

/* ===== API ===== */
async function fetchPlaces(query) {
  const res = await fetch(`/api/places?query=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/* ===== Suggestions ===== */
function openSuggestions(docs, query) {
  currentSuggestions = docs.slice(0, SUGGESTIONS_LIMIT);
  activeIndex = -1;

  if (!currentSuggestions.length) {
    const emptyTitle = window.__i18n?.tf("search.emptyTitle", query) ?? `"${query}" 결과 없음`;
    const emptySub = window.__i18n?.t("search.emptySub") ?? "다른 키워드를 입력해보세요";
    suggestionsEl.innerHTML = `
      <li class="suggestions__empty">
        <span class="suggestions__empty-title">${escapeHtml(emptyTitle)}</span>
        <span class="suggestions__empty-sub">${escapeHtml(emptySub)}</span>
      </li>`;
    suggestionsEl.classList.add("is-open");
    return;
  }

  const headerText = window.__i18n?.tf("search.suggestionsHeader", currentSuggestions.length) ?? `추천 장소 ${currentSuggestions.length}건`;
  let html = `
    <li class="suggestions__header">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      ${escapeHtml(headerText)}
    </li>`;

  currentSuggestions.forEach((place, i) => {
    const name = escapeHtml(place.place_name || "");
    const cat = escapeHtml(place.category_group_name || "");
    const addr = escapeHtml(place.road_address_name || place.address_name || "");
    html += `
      <li class="suggestions__item" role="option" data-index="${i}">
        <span class="suggestions__icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
        </span>
        <div class="suggestions__info">
          <div>
            <span class="suggestions__name">${name}</span>
            ${cat ? `<span class="suggestions__category">${cat}</span>` : ""}
          </div>
          ${addr ? `<div class="suggestions__address">${addr}</div>` : ""}
        </div>
      </li>`;
  });

  suggestionsEl.innerHTML = html;
  suggestionsEl.classList.add("is-open");
}

function closeSuggestions() {
  suggestionsEl.classList.remove("is-open");
  currentSuggestions = [];
  activeIndex = -1;
}

function highlightSuggestion(idx) {
  const items = suggestionsEl.querySelectorAll(".suggestions__item");
  items.forEach((el) => el.classList.remove("is-active"));
  if (idx >= 0 && idx < items.length) {
    items[idx].classList.add("is-active");
    items[idx].scrollIntoView({ block: "nearest" });
  }
  activeIndex = idx;
}

function selectSuggestion(idx) {
  const place = currentSuggestions[idx];
  if (!place) return;
  inputEl.value = place.place_name;
  closeSuggestions();
  clearTimeout(debounceTimer);
  hideNoResults();
  hideStatus();
  showSelectedPlace(place);
}

async function showSelectedPlace(place) {
  if (!place?.x || !place?.y) return;
  clearMarkers();
  infoWindow.close();
  const reviewedMap = await fetchMyReviewedIds([place.id].filter(Boolean));
  try {
    const result = renderPlace(place, reviewedMap.get(place.id) ?? 0);
    const pos = new kakao.maps.LatLng(place.y, place.x);
    // setLevel → setCenter 순서: 줌 먼저 적용해야 setCenter 위치가 유지됨
    // (역순이면 setLevel이 변경 전 센터 기준으로 줌해서 위치가 어긋남)
    map.setLevel(3);
    map.setCenter(pos);
    // setCenter/setLevel 렌더 완료 후 InfoWindow 열기 (auto-pan 충돌 방지)
    setTimeout(() => {
      infoWindow.setContent(result.content);
      infoWindow.open(map, result.marker);
    }, 100);
  } catch (e) {
    console.warn("[K-daejeop] showSelectedPlace:", e);
  }
  showStatus(window.__i18n?.tf("search.resultsStatus", place.place_name, 1) ?? `"${place.place_name}" 근처 1개 결과`, 3000);
}

/* ===== Search (지도 이동) ===== */
async function doSearch(query) {
  if (!query) return;

  // 진행 중인 자동완성 타이머 취소 (race condition 방지)
  clearTimeout(debounceTimer);
  closeSuggestions();
  hideNoResults();
  hideStatus();

  const mySeq = ++searchSeq;

  // ── 1) API 호출 (네트워크 오류만 catch) ──
  let data;
  try {
    data = await fetchPlaces(query);
  } catch (err) {
    // 더 새로운 검색이 시작됐으면 무시
    if (mySeq !== searchSeq) return;
    console.error("[K-daejeop] API error:", err);
    showStatus(window.__i18n?.t("search.error") ?? "검색 중 오류가 발생했습니다", 3000);
    return;
  }

  // 응답 도착 시점에 더 새로운 검색이 진행 중이면 무시
  if (mySeq !== searchSeq) return;

  const results = rankFoodFirst(data?.documents ?? []);

  if (!results.length) {
    showNoResults(query);
    return;
  }

  // ── 2) 지도 렌더링 (SDK 오류는 별도 처리) ──
  clearMarkers();

  const focusPos = getFirstValidPosition(results);
  if (!focusPos) {
    showNoResults(query);
    return;
  }

  const local = getNearbyResults(results, focusPos);
  if (!local.length) {
    showNoResults(query);
    return;
  }

  // 내 리뷰 여부 조회 (실패해도 마커 렌더링은 계속)
  const placeIds = local.map(({ place }) => place.id).filter(Boolean);
  const reviewedMap = await fetchMyReviewedIds(placeIds);

  // 마커 렌더링 (InfoWindow는 포지셔닝 후 열기)
  infoWindow.close();
  let firstResult = null;
  local.forEach(({ place }, idx) => {
    try {
      const result = renderPlace(place, reviewedMap.get(place.id) ?? 0);
      if (idx === 0) firstResult = result;
    } catch (e) {
      console.warn("[K-daejeop] marker render skip:", e);
    }
  });

  // ── 3) 첫 번째 결과를 지도 중심에 고정 ──
  // setBounds는 내부 비동기 애니메이션이 setCenter를 덮어써서 사용하지 않음.
  // 결과 분포 거리로 줌 레벨을 직접 계산.
  try {
    let level = 3;
    if (local.length > 1) {
      let maxDist = 0;
      for (const item of local) {
        const d = distanceKm(focusPos, item.position);
        if (d > maxDist) maxDist = d;
      }
      if (maxDist > 10) level = 7;
      else if (maxDist > 3) level = 6;
      else if (maxDist > 1) level = 5;
      else if (maxDist > 0.5) level = 4;
    }
    // setLevel → setCenter 순서: 줌 먼저 적용해야 setCenter 위치가 유지됨
    map.setLevel(level);
    map.setCenter(focusPos);
  } catch (e) {
    console.warn("[K-daejeop] map adjust:", e);
  }

  // InfoWindow는 setCenter/setLevel 렌더 완료 후 열기 (auto-pan 충돌 방지)
  if (firstResult) {
    setTimeout(() => {
      infoWindow.setContent(firstResult.content);
      infoWindow.open(map, firstResult.marker);
    }, 100);
  }

  const placeName = results[0]?.place_name || query;
  showStatus(window.__i18n?.tf("search.resultsStatus", placeName, local.length) ?? `"${placeName}" 근처 ${local.length}개 결과`, 3000);
}

/* ===== Autocomplete (debounce) ===== */
function scheduleAutocomplete() {
  clearTimeout(debounceTimer);
  const query = inputEl.value.trim();

  if (!query) {
    closeSuggestions();
    return;
  }

  debounceTimer = setTimeout(async () => {
    try {
      const data = await fetchPlaces(query);
      const docs = rankFoodFirst(data?.documents ?? []);
      // 입력값이 바뀌었으면 무시
      if (inputEl.value.trim() !== query) return;
      openSuggestions(docs, query);
    } catch (_err) {
      // API 실패 시 조용히 닫기 (토스트 표시 안 함)
      closeSuggestions();
    }
  }, DEBOUNCE_MS);
}

/* ===== Events ===== */
function bindEvents() {
  // 검색 버튼
  buttonEl.addEventListener("click", () => {
    const q = inputEl.value.trim();
    clearTimeout(debounceTimer);
    closeSuggestions();
    if (q) doSearch(q);
  });

  // 타이핑 → 자동완성 (한글 IME 포함 모든 input)
  inputEl.addEventListener("input", scheduleAutocomplete);

  // 키보드 네비게이션
  inputEl.addEventListener("keydown", (e) => {
    // IME 조합 중 keyCode 229는 무시 (Enter 오작동 방지)
    if (e.keyCode === 229) return;

    if (e.key === "Enter") {
      e.preventDefault();
      clearTimeout(debounceTimer);
      if (activeIndex >= 0 && currentSuggestions.length) {
        selectSuggestion(activeIndex);
      } else {
        const q = inputEl.value.trim();
        closeSuggestions();
        if (q) doSearch(q);
      }
      return;
    }

    if (e.key === "Escape") {
      closeSuggestions();
      return;
    }

    const open = suggestionsEl.classList.contains("is-open");
    const len = currentSuggestions.length;
    if (!open || !len) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      highlightSuggestion(activeIndex < len - 1 ? activeIndex + 1 : 0);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      highlightSuggestion(activeIndex > 0 ? activeIndex - 1 : len - 1);
    }
  });

  // 포커스 복귀 시
  inputEl.addEventListener("focus", () => {
    if (inputEl.value.trim() && !suggestionsEl.classList.contains("is-open")) {
      scheduleAutocomplete();
    }
  });

  // 추천 항목 클릭
  suggestionsEl.addEventListener("mousedown", (e) => {
    // mousedown을 사용해야 blur보다 먼저 처리됨
    const item = e.target.closest(".suggestions__item");
    if (!item) return;
    e.preventDefault();
    selectSuggestion(parseInt(item.dataset.index, 10));
  });

  // 바깥 클릭
  document.addEventListener("mousedown", (e) => {
    if (!e.target.closest(".search-wrapper")) {
      closeSuggestions();
    }
  });

  // 인포윈도우 닫기 버튼 (이벤트 위임)
  document.addEventListener("click", (e) => {
    if (e.target.closest(".iw-card__close-btn")) {
      infoWindow.close();
    }
  });

  // 인포윈도우 내 "리뷰 남기기" 버튼 (이벤트 위임)
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".iw-card__review-btn");
    if (!btn) return;
    e.preventDefault();
    const place = {
      id: btn.dataset.placeId,
      name: btn.dataset.placeName,
      address: btn.dataset.placeAddress,
      category: btn.dataset.placeCategory,
      x: btn.dataset.placeX,
      y: btn.dataset.placeY,
    };
    if (window.__openReviewModal) {
      window.__openReviewModal(place);
    }
  });
}

/* ===== Init ===== */
const KOREA_CENTER = { lat: 36.5, lng: 127.0 };
const DEFAULT_LEVEL = window.innerWidth <= 640 ? 13 : 12;
let mapInitialized = false;

function initMap() {
  const container = document.getElementById("map");
  map = new kakao.maps.Map(container, {
    center: new kakao.maps.LatLng(KOREA_CENTER.lat, KOREA_CENTER.lng),
    level: DEFAULT_LEVEL,
  });
  infoWindow = new kakao.maps.InfoWindow({ zIndex: 2 });
  mapInitialized = true;
  // myreviews.js에서 접근할 수 있도록 노출
  window.__getMap = () => map;
  window.__clearSearchMarkers = () => {
    clearMarkers();
    infoWindow.close();
  };
  bindEvents();
}

function relayoutMap() {
  if (!map) return;
  // 현재 위치·줄 레벨 보존 (탭 전환 시 초기화 방지)
  const center = map.getCenter();
  const level = map.getLevel();
  map.relayout();
  map.setCenter(center);
  map.setLevel(level);
}

function boot() {
  if (!window.kakao || !window.kakao.maps) {
    showStatus(window.__i18n?.t("search.sdkError") ?? "지도 SDK 로딩에 실패했습니다", 0);
    return;
  }
  window.kakao.maps.load(() => {
    if (mapInitialized) {
      relayoutMap();
    } else {
      initMap();
    }
  });
}

// 앱 화면이 보인 후 지도 초기화/재배치
window.addEventListener("app:visible", () => {
  if (mapInitialized) {
    // 이미 초기화됐으면 relayout만 (로그인 상태 유지 후 복귀)
    setTimeout(relayoutMap, 50);
  } else {
    boot();
  }
});
