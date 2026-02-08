const statusEl = document.getElementById("status");
const inputEl = document.getElementById("search-input");
const buttonEl = document.getElementById("search-button");

let map = null;
let infoWindow = null;
const markers = [];
let highlightCircle = null;
const MAX_LOCAL_RESULTS = 12;
const FAR_SPREAD_KM = 20;

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("is-visible", Boolean(message));
  statusEl.style.borderColor = isError ? "#d9785f" : "#e4dac9";
}

function clearMarkers() {
  while (markers.length) {
    const marker = markers.pop();
    marker.setMap(null);
  }
}

function clearHighlight() {
  if (highlightCircle) {
    highlightCircle.setMap(null);
    highlightCircle = null;
  }
}

function renderPlace(place) {
  const position = new kakao.maps.LatLng(place.y, place.x);
  const marker = new kakao.maps.Marker({ position });
  marker.setMap(map);
  markers.push(marker);

  kakao.maps.event.addListener(marker, "click", () => {
    infoWindow.setContent(`<div class="info-window">${place.place_name}</div>`);
    infoWindow.open(map, marker);
  });

  infoWindow.setContent(`<div class="info-window">${place.place_name}</div>`);
  infoWindow.open(map, marker);
}

function highlightArea(position, radius = 900) {
  clearHighlight();
  highlightCircle = new kakao.maps.Circle({
    center: position,
    radius,
    strokeWeight: 3,
    strokeColor: "#1c6ba0",
    strokeOpacity: 0.9,
    strokeStyle: "solid",
    fillColor: "#1c6ba0",
    fillOpacity: 0.22,
  });
  highlightCircle.setMap(map);
}

function toLatLng(place) {
  if (!place?.x || !place?.y) {
    return null;
  }
  return new kakao.maps.LatLng(place.y, place.x);
}

function toRadians(value) {
  return (value * Math.PI) / 180;
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
  const target = results.find((place) => place?.x && place?.y);
  return target ? toLatLng(target) : null;
}

function getNearbyResults(results, anchor) {
  const valid = results
    .map((place) => ({ place, position: toLatLng(place) }))
    .filter((item) => item.position);

  if (!valid.length || !anchor) {
    return [];
  }

  const distances = valid.map((item) => ({
    ...item,
    distance: distanceKm(anchor, item.position),
  }));
  const maxDistance = Math.max(...distances.map((item) => item.distance));

  if (maxDistance > FAR_SPREAD_KM) {
    return distances
      .filter((item) => item.distance <= FAR_SPREAD_KM)
      .slice(0, MAX_LOCAL_RESULTS);
  }

  return distances.slice(0, MAX_LOCAL_RESULTS);
}

async function searchPlace(query) {
  const response = await fetch(`/api/places?query=${encodeURIComponent(query)}`);
  if (!response.ok) {
    throw new Error("검색 요청 실패");
  }
  return response.json();
}

async function handleSearch() {
  const query = inputEl.value.trim();
  if (!query) {
    setStatus("검색어를 입력해주세요.", true);
    return;
  }

  setStatus("검색 중...");

  try {
    const data = await searchPlace(query);
    const results = data?.documents ?? [];

    if (!results.length) {
      setStatus("검색 결과가 없습니다. 다른 키워드를 입력해보세요.", true);
      return;
    }

    clearMarkers();
    clearHighlight();

    const focusPosition = getFirstValidPosition(results);
    const localResults = getNearbyResults(results, focusPosition);
    const bounds = new kakao.maps.LatLngBounds();

    localResults.forEach(({ place, position }) => {
      bounds.extend(position);
      renderPlace(place);
    });

    if (localResults.length > 1) {
      map.setBounds(bounds);
    } else if (focusPosition) {
      map.setCenter(focusPosition);
      map.setLevel(4);
    }

    const highlightTarget = focusPosition || bounds.getCenter();
    kakao.maps.event.addListenerOnce(map, "idle", () => {
      highlightArea(highlightTarget);
    });

    setStatus(`"${results[0].place_name}" 위치로 이동했습니다.`);
  } catch (error) {
    setStatus("검색 중 오류가 발생했습니다.", true);
  }
}

function bindEvents() {
  buttonEl.addEventListener("click", handleSearch);
  inputEl.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      handleSearch();
    }
  });
}

function initMap() {
  const DEFAULT_CENTER = new kakao.maps.LatLng(36.5, 127.8);
  const DEFAULT_LEVEL = 12;

  map = new kakao.maps.Map(document.getElementById("map"), {
    center: DEFAULT_CENTER,
    level: DEFAULT_LEVEL,
  });

  infoWindow = new kakao.maps.InfoWindow({ zIndex: 2 });
  bindEvents();
  setStatus("지도를 확대하거나 지역명을 검색해보세요.");
}

function boot() {
  if (!window.kakao || !window.kakao.maps) {
    setStatus("지도 SDK 로딩에 실패했습니다.", true);
    return;
  }
  window.kakao.maps.load(initMap);
}

document.addEventListener("DOMContentLoaded", boot);
