/* ===== 내 맛집 클러스터 맵 모듈 =====
 * - 내 리뷰 로드 → 지리 격자 기반 클러스터링 → 커스텀 오버레이 렌더
 * - 줌 변경 시 재클러스터링 + 플라잉 애니메이션
 * - 사이드 패널: 지역별 리뷰 그룹 목록
 * - 개별 핀 클릭 → 리뷰 상세 bottom sheet
 */

/* ===== 상수 ===== */
const ANIM_MS = 380;
const MAX_CLUSTER_PHOTOS = 4;

/**
 * 줌 레벨별 지리 격자 크기 (도 단위)
 * Kakao Maps: level 1 = 가장 확대, level 14 = 가장 축소
 * containerPixelFromCoords 가 버전에 따라 없을 수 있어 지리 거리 기반 클러스터링 사용
 */
const GRID_DEG = [
  0,      // 0 unused
  0,      // 1  개별 핀
  0,      // 2  개별 핀
  0.003,  // 3
  0.006,  // 4
  0.012,  // 5
  0.025,  // 6
  0.05,   // 7  동네 레벨
  0.1,    // 8
  0.2,    // 9  도시 레벨
  0.3,    // 10
  0.8,    // 11
  1.6,    // 12 (기본, 전국 뷰)
  3.2,    // 13
  6.4,    // 14
];

/* ===== 상태 ===== */
let myMap = null;
let allReviews = [];
let activeClusters = [];
let isActive = false;
let initialRenderDone = false;
let zoomHandler = null;
let zoomDebounce = null;
let detailCluster = null;
let detailIdx = 0;

/* ===== 유틸 ===== */
function escAttr(str) {
  return String(str ?? "").replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function escHtml(str) {
  const d = document.createElement("div");
  d.textContent = String(str ?? "");
  return d.innerHTML;
}

/** "경기도 김포시 운양동 …" → "경기도 김포시" */
function extractRegion(address) {
  if (!address) return "기타";
  const parts = address.trim().split(/\s+/);
  return parts.length >= 2 ? `${parts[0]} ${parts[1]}` : parts[0] || "기타";
}

/** 애니메이션용 화면 픽셀 좌표 취득 (Kakao Maps API 버전 차이 대응) */
function getScreenPx(lat, lng) {
  try {
    const proj = myMap.getProjection();
    const ll = new kakao.maps.LatLng(lat, lng);
    return (
      proj.containerPointFromCoords?.(ll) ||
      proj.containerPixelFromCoords?.(ll) ||
      null
    );
  } catch (_) {
    return null;
  }
}

/* ===== 외부 인터페이스 ===== */
window.__activateMyReviews = activate;
window.__deactivateMyReviews = deactivate;
window.__refreshMyReviews = refresh;

/* ===== 활성화 ===== */
async function activate() {
  if (isActive) return;

  myMap = window.__getMap?.();
  if (!myMap) return;

  const sb = window.__getSupabase?.();
  if (!sb) return;

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return;

  isActive = true;
  initialRenderDone = false;
  showToast("내 맛집 불러오는 중…");

  const { data, error } = await sb
    .from("reviews")
    .select("*")
    .eq("user_id", user.id)
    .order("visited_at", { ascending: false });

  if (!isActive) return; // 로딩 중 비활성화된 경우

  if (error || !data?.length) {
    showToast(data ? "저장된 맛집 리뷰가 없습니다" : "불러오기 실패", 3000);
    isActive = false;
    document.getElementById("my-reviews-btn")?.classList.remove("is-active");
    return;
  }

  allReviews = data;
  showToast(`리뷰 ${allReviews.length}개`, 2500);

  // 사이드 패널 렌더 & 표시
  renderPanel();
  showPanel();

  // idle 후 첫 클러스터 렌더 (addListenerOnce 미지원 → 수동 once 구현)
  // addListener BEFORE fitMapToReviews so we don't miss the event
  let idleRendered = false;
  const onFirstIdle = () => {
    kakao.maps.event.removeListener(myMap, "idle", onFirstIdle);
    if (!isActive || idleRendered) return;
    idleRendered = true;
    initialRenderDone = true;
    renderClusters(computeClusters(), null);
  };
  kakao.maps.event.addListener(myMap, "idle", onFirstIdle);

  // 지도 범위를 리뷰 전체에 맞추기 (idle 이벤트를 트리거함)
  fitMapToReviews();

  // 폴백: setBounds 후 idle이 오지 않는 경우 (이미 해당 bounds를 표시 중일 때)
  setTimeout(() => {
    if (!isActive || idleRendered) return;
    idleRendered = true;
    initialRenderDone = true;
    renderClusters(computeClusters(), null);
  }, 1500);

  zoomHandler = onZoomChanged;
  kakao.maps.event.addListener(myMap, "zoom_changed", zoomHandler);
}

/* ===== 비활성화 ===== */
function deactivate() {
  if (!isActive) return;
  isActive = false;
  initialRenderDone = false;

  if (zoomHandler) {
    kakao.maps.event.removeListener(myMap, "zoom_changed", zoomHandler);
    zoomHandler = null;
  }
  clearTimeout(zoomDebounce);

  activeClusters.forEach((c) => animateOut(c, null));
  activeClusters = [];
  allReviews = [];

  hidePanel();
  hideDetail();
}

/* ===== 리뷰 추가 후 갱신 ===== */
async function refresh() {
  if (!isActive) return;
  const sb = window.__getSupabase?.();
  if (!sb) return;
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return;

  const { data, error } = await sb
    .from("reviews")
    .select("*")
    .eq("user_id", user.id)
    .order("visited_at", { ascending: false });

  if (!error && data) {
    allReviews = data;
    renderPanel();
    const old = activeClusters;
    activeClusters = [];
    renderClusters(computeClusters(), old);
  }
}

/* ===== zoom_changed 핸들러 ===== */
function onZoomChanged() {
  if (!isActive || !initialRenderDone) return;
  clearTimeout(zoomDebounce);
  zoomDebounce = setTimeout(() => {
    if (!isActive) return;
    const old = activeClusters;
    activeClusters = [];
    renderClusters(computeClusters(), old);
  }, 60);
}

/* ===== 지리 격자 클러스터링 ===== */
function getGridDeg(level) {
  return GRID_DEG[Math.max(0, Math.min(14, level))] ?? 0.1;
}

function computeClusters() {
  if (!myMap || !allReviews.length) return [];
  const level = myMap.getLevel();
  const grid = getGridDeg(level);

  if (grid === 0) {
    // 가장 확대된 레벨: 개별 핀 (같은 장소 여러 리뷰는 place_id로 합산)
    const placeMap = new Map();
    for (const r of allReviews) {
      const lat = parseFloat(r.place_y);
      const lng = parseFloat(r.place_x);
      if (isNaN(lat) || isNaN(lng)) continue;
      const key = r.place_id || `${lat},${lng}`;
      if (!placeMap.has(key)) placeMap.set(key, { reviews: [], lat, lng });
      placeMap.get(key).reviews.push(r);
    }
    return Array.from(placeMap.values()).map(({ reviews, lat, lng }) => ({
      reviews: reviews.sort((a, b) =>
        (b.visited_at || "").localeCompare(a.visited_at || "")
      ),
      lat,
      lng,
      overlay: null,
      element: null,
    }));
  }

  // 격자 셀 단위로 그룹화
  const cellMap = new Map();
  for (const review of allReviews) {
    const lat = parseFloat(review.place_y);
    const lng = parseFloat(review.place_x);
    if (isNaN(lat) || isNaN(lng)) continue;

    const key = `${Math.floor(lat / grid)},${Math.floor(lng / grid)}`;
    if (!cellMap.has(key)) cellMap.set(key, { reviews: [], sumLat: 0, sumLng: 0 });
    const cell = cellMap.get(key);
    cell.reviews.push(review);
    cell.sumLat += lat;
    cell.sumLng += lng;
  }

  return Array.from(cellMap.values()).map((cell) => ({
    reviews: cell.reviews.sort((a, b) =>
      (b.visited_at || "").localeCompare(a.visited_at || "")
    ),
    lat: cell.sumLat / cell.reviews.length,
    lng: cell.sumLng / cell.reviews.length,
    overlay: null,
    element: null,
  }));
}

/* ===== 렌더링 ===== */
function renderClusters(newClusters, oldClusters) {
  if (oldClusters && oldClusters.length > 0) {
    animateTransition(oldClusters, newClusters);
  } else {
    // 초기 렌더: 스태거 팝인
    newClusters.forEach((c, i) => {
      const { overlay, element } = createOverlay(c);
      c.overlay = overlay;
      c.element = element;
      element.style.opacity = "0";
      element.style.transform = "scale(0.4)";
      overlay.setMap(myMap);
      setTimeout(
        () =>
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              element.style.transition = `opacity 280ms ease, transform 350ms cubic-bezier(0.34, 1.56, 0.64, 1)`;
              element.style.opacity = "1";
              element.style.transform = "scale(1)";
            })
          ),
        Math.min(i * 25, 200)
      );
    });
  }
  activeClusters = newClusters;
}

/* ===== 플라잉 애니메이션 ===== */
function animateTransition(oldClusters, newClusters) {
  // 새 클러스터 → 가장 가까운 구 클러스터 매칭
  const newToOld = new Map();
  for (const nc of newClusters) {
    let best = null,
      bestDist = Infinity;
    for (const oc of oldClusters) {
      const d = Math.hypot(nc.lat - oc.lat, nc.lng - oc.lng);
      if (d < bestDist) {
        bestDist = d;
        best = oc;
      }
    }
    newToOld.set(nc, best);
  }

  // 구 클러스터 out
  for (const oc of oldClusters) {
    animateOut(oc, findNewForOld(oc, newToOld));
  }

  // 새 클러스터 in (구 클러스터 위치에서 날아옴)
  for (const nc of newClusters) {
    const oldMatch = newToOld.get(nc);
    const { overlay, element } = createOverlay(nc);
    nc.overlay = overlay;
    nc.element = element;

    let startDx = 0,
      startDy = 0;
    if (oldMatch) {
      const oPx = getScreenPx(oldMatch.lat, oldMatch.lng);
      const nPx = getScreenPx(nc.lat, nc.lng);
      if (oPx && nPx) {
        startDx = oPx.x - nPx.x;
        startDy = oPx.y - nPx.y;
        const dist = Math.hypot(startDx, startDy);
        if (dist > 280) {
          startDx = (startDx / dist) * 280;
          startDy = (startDy / dist) * 280;
        }
      }
    }

    element.style.transition = "none";
    element.style.transform = `translate(${startDx}px, ${startDy}px) scale(0.35)`;
    element.style.opacity = "0";
    overlay.setMap(myMap);

    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        element.style.transition = `transform ${ANIM_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity ${Math.round(ANIM_MS * 0.65)}ms ease`;
        element.style.transform = "translate(0, 0) scale(1)";
        element.style.opacity = "1";
      })
    );
  }
}

function animateOut(cluster, targetNc) {
  if (!cluster.element) return;
  let dx = 0,
    dy = 0;
  if (targetNc) {
    const oPx = getScreenPx(cluster.lat, cluster.lng);
    const nPx = getScreenPx(targetNc.lat, targetNc.lng);
    if (oPx && nPx) {
      dx = nPx.x - oPx.x;
      dy = nPx.y - oPx.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 280) {
        dx = (dx / dist) * 280;
        dy = (dy / dist) * 280;
      }
    }
  }
  const el = cluster.element;
  el.style.transition = `transform ${Math.round(ANIM_MS * 0.75)}ms ease-in, opacity ${Math.round(ANIM_MS * 0.45)}ms ease`;
  el.style.transform = `translate(${dx}px, ${dy}px) scale(0.3)`;
  el.style.opacity = "0";
  const ref = cluster.overlay;
  setTimeout(() => ref?.setMap(null), ANIM_MS + 40);
}

function findNewForOld(oldCluster, newToOld) {
  for (const [nc, oc] of newToOld) {
    if (oc === oldCluster) return nc;
  }
  return null;
}

/* ===== 오버레이 생성 ===== */
function createOverlay(cluster) {
  // 모든 리뷰가 같은 장소(place_id)면 단일 핀으로 표시
  const uniquePlaces = new Set(
    cluster.reviews.map((r) => r.place_id || `${r.place_y},${r.place_x}`)
  ).size;
  const isSingle = uniquePlaces === 1;
  const element = isSingle ? buildPin(cluster) : buildCluster(cluster);

  const overlay = new kakao.maps.CustomOverlay({
    position: new kakao.maps.LatLng(cluster.lat, cluster.lng),
    content: element,
    zIndex: isSingle ? 4 : 3,
    yAnchor: 1.0,
  });

  element.addEventListener("click", () => {
    if (isSingle) {
      showDetail(cluster);
    } else {
      hideDetail();
      myMap.setCenter(new kakao.maps.LatLng(cluster.lat, cluster.lng));
      myMap.setLevel(Math.max(1, myMap.getLevel() - 2));
    }
  });

  return { overlay, element };
}

function buildCluster(cluster) {
  // 같은 식당은 최신 리뷰 사진 1장만 사용 (reviews는 visited_at 내림차순 정렬됨)
  const seen = new Set();
  const uniqueReviews = cluster.reviews.filter((r) => {
    const key = r.place_id || `${r.place_y},${r.place_x}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const count = uniqueReviews.length;
  const photos = uniqueReviews.slice(0, MAX_CLUSTER_PHOTOS).map((r) => r.photo_url);
  const cells = photos; // 반복 없이 unique 식당 사진만 표시 (1~4장)

  const el = document.createElement("div");
  el.className = "rv-cluster";
  el.innerHTML = `
    <div class="rv-cluster__box">
      <div class="rv-cluster__grid">
        ${cells
          .map(
            (src) =>
              `<div class="rv-cluster__cell"><img src="${escAttr(src)}" alt="" loading="lazy" /></div>`
          )
          .join("")}
      </div>
    </div>
    <div class="rv-cluster__tail"></div>
    <div class="rv-cluster__badge">${count}</div>
  `;
  return el;
}

function buildPin(cluster) {
  const review = cluster.reviews[0]; // 최신 방문 리뷰 (visited_at 내림차순 정렬됨)
  const stars = "★".repeat(review.rating) + "☆".repeat(3 - review.rating);
  const name = review.place_name || "";
  // 짧은 이름(≤5자)은 가운데 정렬, 긴 이름은 왼쪽 기준 marquee
  const el = document.createElement("div");
  el.className = "rv-pin" + (name.length <= 5 ? " rv-pin--short-name" : "");
  el.innerHTML = `
    <div class="rv-pin__photo-wrap">
      <div class="rv-pin__name"><span>${escHtml(name)}</span></div>
      <img class="rv-pin__photo" src="${escAttr(review.photo_url)}" alt="" loading="lazy" />
      <div class="rv-pin__rating">${stars}</div>
    </div>
    <div class="rv-pin__tail"></div>
  `;
  return el;
}

/* ===== 사이드 패널: 지역별 리뷰 목록 ===== */
function isMobile() {
  return window.innerWidth <= 640;
}

function showPanel() {
  document.getElementById("my-reviews-panel")?.classList.add("is-open");
  if (isMobile()) {
    const backdrop = document.getElementById("panel-backdrop");
    if (backdrop) {
      backdrop.hidden = false;
      requestAnimationFrame(() => backdrop.classList.add("is-visible"));
    }
  }
}

function hidePanel() {
  document.getElementById("my-reviews-panel")?.classList.remove("is-open");
  const backdrop = document.getElementById("panel-backdrop");
  if (backdrop) {
    backdrop.classList.remove("is-visible");
    backdrop.hidden = true;
  }
}

function groupByRegion(reviews) {
  const map = new Map();
  for (const r of reviews) {
    const region = extractRegion(r.place_address);
    if (!map.has(region)) map.set(region, []);
    map.get(region).push(r);
  }
  return Array.from(map.entries())
    .sort((a, b) => {
      const countA = new Set(a[1].map((r) => r.place_id || `${r.place_y},${r.place_x}`)).size;
      const countB = new Set(b[1].map((r) => r.place_id || `${r.place_y},${r.place_x}`)).size;
      return countB - countA;
    })
    .map(([region, items]) => ({ region, items }));
}

function renderPanel() {
  const countEl = document.getElementById("my-reviews-panel-count");
  const listEl = document.getElementById("my-reviews-panel-list");
  if (!listEl) return;

  // place_id 기준 고유 식당 수 (같은 식당 여러 리뷰는 1개로 카운트)
  const uniquePlaceCount = new Set(
    allReviews.map((r) => r.place_id || `${r.place_y},${r.place_x}`)
  ).size;
  if (countEl) countEl.textContent = `총 ${uniquePlaceCount}곳`;

  const groups = groupByRegion(allReviews);
  listEl.scrollTop = 0;

  listEl.innerHTML = groups
    .map(({ region, items }) => {
      // 같은 식당은 최신 사진 1장만 (place_id 기준 중복 제거 후 최대 4장)
      const seenPlaces = new Set();
      const photos = items.filter((r) => {
        const key = r.place_id || `${r.place_y},${r.place_x}`;
        if (seenPlaces.has(key)) return false;
        seenPlaces.add(key);
        return true;
      }).slice(0, 4);
      // 지역 내 고유 식당 수
      const regionPlaceCount = seenPlaces.size;
      return `
      <div class="mrp-group">
        <div class="mrp-group__photos">
          ${photos
            .map(
              (r) => `<img src="${escAttr(r.photo_url)}" alt="" loading="lazy" />`
            )
            .join("")}
        </div>
        <div class="mrp-group__info">
          <span class="mrp-group__name">${escHtml(region)}</span>
          <span class="mrp-group__count">${regionPlaceCount}곳</span>
        </div>
        <svg class="mrp-group__arrow" width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </div>`;
    })
    .join("");

  // 광고 슬롯을 리스트 끝으로 이동 (배너 광고에 가려지지 않도록 스크롤 영역 내 배치)
  const adPanel = document.getElementById("ad-panel");
  if (adPanel) listEl.appendChild(adPanel);

  // 지역 클릭 → 세부 장소 목록으로 드릴다운
  listEl.querySelectorAll(".mrp-group").forEach((el, i) => {
    el.addEventListener("click", () => {
      const { region, items } = groups[i];
      renderPanelLevel1(region, items);
    });
  });
}

/** 사이드 패널 Level 1: 지역 내 개별 장소 목록 */
function renderPanelLevel1(region, items) {
  const countEl = document.getElementById("my-reviews-panel-count");
  const listEl = document.getElementById("my-reviews-panel-list");
  if (!listEl) return;

  // 같은 장소(place_id) 그룹화 및 최신순 정렬
  const placeMap = new Map();
  for (const r of items) {
    const key = r.place_id || r.place_name || `${r.place_y},${r.place_x}`;
    if (!placeMap.has(key)) placeMap.set(key, []);
    placeMap.get(key).push(r);
  }
  const places = Array.from(placeMap.values()).map((reviews) =>
    reviews.sort((a, b) => (b.visited_at || "").localeCompare(a.visited_at || ""))
  );

  if (countEl) countEl.textContent = `${places.length}곳`;
  listEl.scrollTop = 0;

  listEl.innerHTML = `
    <div class="mrp-back">
      <button class="mrp-back__btn" id="mrp-back-btn" type="button">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        전체 지역
      </button>
      <span class="mrp-back__title">${escHtml(region)}</span>
    </div>
    ${places
      .map((reviews, i) => {
        const r = reviews[0]; // 최신 방문
        const hasMultiple = reviews.length > 1;
        const stars = "★".repeat(r.rating) + "☆".repeat(3 - r.rating);
        const lat = parseFloat(r.place_y);
        const lng = parseFloat(r.place_x);
        return `
          <div class="mrp-place" data-idx="${i}"
            data-lat="${isNaN(lat) ? "" : lat}"
            data-lng="${isNaN(lng) ? "" : lng}">
            <img class="mrp-place__photo" src="${escAttr(r.photo_url)}" alt="" loading="lazy" />
            <div class="mrp-place__info">
              <span class="mrp-place__name">${escHtml(r.place_name || "")}</span>
              <span class="mrp-place__rating">${stars}</span>
              ${hasMultiple ? `<span class="mrp-place__count">${reviews.length}번 방문</span>` : ""}
            </div>
          </div>`;
      })
      .join("")}
  `;

  document.getElementById("mrp-back-btn")?.addEventListener("click", renderPanel);

  // 광고 슬롯을 리스트 끝으로 이동
  const adPanel = document.getElementById("ad-panel");
  if (adPanel) listEl.appendChild(adPanel);

  // 장소 클릭 → 지도 이동 + 리뷰 상세 표시
  listEl.querySelectorAll(".mrp-place").forEach((el) => {
    el.addEventListener("click", () => {
      const idx = parseInt(el.dataset.idx, 10);
      const lat = parseFloat(el.dataset.lat);
      const lng = parseFloat(el.dataset.lng);
      if (!isNaN(lat) && !isNaN(lng) && myMap) {
        myMap.setCenter(new kakao.maps.LatLng(lat, lng));
        myMap.setLevel(3);
      }
      const placeReviews = places[idx];
      if (placeReviews) {
        showDetail({ reviews: placeReviews, lat, lng, overlay: null, element: null });
      }
    });
  });
}

/* ===== 리뷰 상세 패널 ===== */
const detailEl = document.getElementById("review-detail");
const detailBackdrop = document.getElementById("review-detail-backdrop");

function showDetail(cluster, idx = 0) {
  if (!detailEl) return;
  detailCluster = cluster;
  detailIdx = idx;
  _renderDetailContent();
  detailEl.classList.add("is-open");
  detailBackdrop?.classList.add("is-visible");
}

function _renderDetailContent() {
  const review = detailCluster.reviews[detailIdx];
  const count = detailCluster.reviews.length;
  document.getElementById("review-detail-name").textContent =
    review.place_name || "";
  document.getElementById("review-detail-address").textContent = [
    review.place_category,
    review.place_address,
  ]
    .filter(Boolean)
    .join(" · ");
  document.getElementById("review-detail-photo").src = review.photo_url || "";
  document.getElementById("review-detail-rating").textContent =
    ["동네맛집 ★", "추천맛집 ★★", "인생맛집 ★★★"][review.rating - 1] ?? "";
  document.getElementById("review-detail-date").textContent = review.visited_at
    ? `방문일 · ${review.visited_at}`
    : "";
  document.getElementById("review-detail-text").textContent =
    review.review_text || "";
  const navEl = document.getElementById("review-detail-nav");
  if (navEl) {
    navEl.hidden = count <= 1;
    const counterEl = document.getElementById("review-detail-counter");
    if (counterEl) counterEl.textContent = `${detailIdx + 1} / ${count}`;
  }
}

function hideDetail() {
  detailEl?.classList.remove("is-open");
  detailBackdrop?.classList.remove("is-visible");
  detailCluster = null;
  detailIdx = 0;
}

/* ===== 지도 범위 맞추기 ===== */
function fitMapToReviews() {
  const bounds = new kakao.maps.LatLngBounds();
  let count = 0;
  allReviews.forEach((r) => {
    const lat = parseFloat(r.place_y);
    const lng = parseFloat(r.place_x);
    if (!isNaN(lat) && !isNaN(lng)) {
      bounds.extend(new kakao.maps.LatLng(lat, lng));
      count++;
    }
  });
  if (count === 1) {
    myMap.setCenter(bounds.getSouthWest());
    myMap.setLevel(5);
  } else if (count > 1) {
    myMap.setBounds(bounds);
  }
}

/* ===== 상태 토스트 ===== */
function showToast(msg, duration = 0) {
  const statusEl = document.getElementById("status");
  const textEl = document.getElementById("status-text");
  if (!statusEl || !textEl) return;
  textEl.textContent = msg;
  statusEl.classList.add("is-visible");
  if (duration > 0)
    setTimeout(() => statusEl.classList.remove("is-visible"), duration);
}

/* ===== 바텀시트 스와이프 닫기 ===== */
function initPanelSwipe() {
  const panel = document.getElementById("my-reviews-panel");
  const header = panel?.querySelector(".my-reviews-panel__header");
  if (!panel || !header) return;

  let startY = 0;
  let dragY = 0;
  let dragging = false;

  header.addEventListener("touchstart", (e) => {
    if (!panel.classList.contains("is-open")) return;
    startY = e.touches[0].clientY;
    dragY = 0;
    dragging = true;
    panel.style.transition = "none";
  }, { passive: true });

  header.addEventListener("touchmove", (e) => {
    if (!dragging) return;
    dragY = Math.max(0, e.touches[0].clientY - startY);
    panel.style.transform = `translateY(${dragY}px)`;
  }, { passive: true });

  header.addEventListener("touchend", () => {
    if (!dragging) return;
    dragging = false;
    panel.style.transition = "";
    panel.style.transform = "";
    if (dragY > 120) {
      // 패널만 숨김 — 핀은 유지 (완전 종료는 별 버튼 재클릭)
      hidePanel();
    }
    // dragY ≤ 120: CSS transition이 is-open translateY(0)로 복귀
  });
}

/* ===== 이벤트 바인딩 ===== */
document.addEventListener("DOMContentLoaded", () => {
  initPanelSwipe();

  // 백드롭 클릭 → 패널 닫기
  document.getElementById("panel-backdrop")?.addEventListener("click", () => {
    window.__deactivateMyReviews?.();
  });

  // 리뷰 상세 닫기
  document
    .getElementById("review-detail-close")
    ?.addEventListener("click", hideDetail);
  detailBackdrop?.addEventListener("click", hideDetail);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hideDetail();
  });

  // 리뷰 상세 이전/다음 (같은 장소 여러 방문)
  document.getElementById("review-detail-prev")?.addEventListener("click", () => {
    if (!detailCluster) return;
    detailIdx =
      (detailIdx - 1 + detailCluster.reviews.length) % detailCluster.reviews.length;
    _renderDetailContent();
  });
  document.getElementById("review-detail-next")?.addEventListener("click", () => {
    if (!detailCluster) return;
    detailIdx = (detailIdx + 1) % detailCluster.reviews.length;
    _renderDetailContent();
  });

  // 내 맛집 토글 버튼
  const btn = document.getElementById("my-reviews-btn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    if (isActive) {
      btn.classList.remove("is-active");
      deactivate();
    } else {
      btn.classList.add("is-active");
      window.__clearSearchMarkers?.();
      activate();
    }
  });

  // 새 리뷰 저장 후 내 맛집 모드면 갱신
  window.addEventListener("review:saved", () => {
    if (isActive) refresh();
  });
});
