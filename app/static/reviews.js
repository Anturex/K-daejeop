/**
 * 리뷰 모달 모듈
 *
 * 1. 별점 선택 (1/2/3)
 * 2. 사진 첨부 (1장, 필수)
 * 3. 맛 / 그 이외 리뷰 텍스트
 * 4. 스크롤 날짜 선택기 (방문 일자)
 * 5. Supabase Storage + DB 연동
 */

/* ===== DOM ===== */
const modal = document.getElementById("review-modal");
const overlay = document.getElementById("review-overlay");
const closeBtn = document.getElementById("review-close-btn");
const cancelBtn = document.getElementById("review-cancel-btn");

const placeNameEl = document.getElementById("review-place-name");
const placeMetaEl = document.getElementById("review-place-meta");

const ratingBtns = document.querySelectorAll(".rating-card");
const ratingInput = document.getElementById("review-rating-value");

const photoZone = document.getElementById("photo-zone");
const photoInput = document.getElementById("photo-input");
const photoPreview = document.getElementById("photo-preview");
const photoPrompt = document.getElementById("photo-prompt");

const reviewTx = document.getElementById("review-text");

const yearWheel = document.getElementById("wheel-year");
const monthWheel = document.getElementById("wheel-month");
const dayWheel = document.getElementById("wheel-day");

const submitBtn = document.getElementById("review-submit-btn");
const errorEl = document.getElementById("review-error");
const visitBadgeEl = document.getElementById("review-visit-badge");

/* ===== 상태 ===== */
let currentPlace = null; // { id, name, address, category, x, y }
let selectedFile = null;
let selectedRating = 0;
let isSubmitting = false;

const ITEM_H = 40; // 날짜 휠 아이템 높이(px)

/* ===== 모달 열기/닫기 ===== */
function openReviewModal(place) {
  currentPlace = place;
  resetForm();

  placeNameEl.textContent = place.name || "";
  placeMetaEl.textContent =
    [place.category, place.address].filter(Boolean).join(" · ");

  // 오늘 날짜로 휠 초기화
  const today = new Date();
  buildDateWheels(today.getFullYear(), today.getMonth() + 1, today.getDate());

  modal.hidden = false;
  overlay.hidden = false;
  document.body.style.overflow = "hidden";

  // 포커스 트랩
  setTimeout(() => closeBtn.focus(), 100);

  // 이미 방문한 식당이면 N번째 방문 뱃지 표시
  if (place.id) loadVisitCount(place.id);
}

async function loadVisitCount(placeId) {
  const sb = window.__getSupabase?.();
  if (!sb) return;
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;
  const { count } = await sb
    .from("reviews")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("place_id", placeId);
  if (count > 0 && visitBadgeEl) {
    visitBadgeEl.textContent = `🍽️ ${count + 1}번째 방문`;
    visitBadgeEl.hidden = false;
  }
}

function closeReviewModal() {
  modal.hidden = true;
  overlay.hidden = true;
  document.body.style.overflow = "";
  currentPlace = null;
}

function resetForm() {
  selectedRating = 0;
  ratingInput.value = "";
  ratingBtns.forEach((b) => b.classList.remove("is-active"));

  selectedFile = null;
  photoPreview.src = "";
  photoPreview.hidden = true;
  photoPrompt.hidden = false;
  photoInput.value = "";

  reviewTx.value = "";

  errorEl.textContent = "";
  errorEl.hidden = true;
  if (visitBadgeEl) visitBadgeEl.hidden = true;
  updateSubmitState();
}

/* ===== 제출 버튼 상태 관리 ===== */
function updateSubmitState() {
  submitBtn.disabled = !(selectedRating > 0 && selectedFile !== null);
}

// 글로벌 접근
window.__openReviewModal = openReviewModal;

/* ===== 별점 선택 ===== */
function handleRating(e) {
  const card = e.currentTarget;
  const val = Number(card.dataset.rating);
  selectedRating = val;
  ratingInput.value = val;
  ratingBtns.forEach((b) =>
    b.classList.toggle("is-active", Number(b.dataset.rating) === val),
  );
  updateSubmitState();
}

/* ===== 사진 업로드 ===== */
function handlePhotoDrop(e) {
  e.preventDefault();
  photoZone.classList.remove("is-dragover");
  const file = e.dataTransfer?.files?.[0];
  if (file) processFile(file);
}

function handlePhotoDragOver(e) {
  e.preventDefault();
  photoZone.classList.add("is-dragover");
}

function handlePhotoDragLeave() {
  photoZone.classList.remove("is-dragover");
}

function handlePhotoClick() {
  photoInput.click();
}

function handlePhotoSelect(e) {
  const file = e.target.files?.[0];
  if (file) processFile(file);
}

function processFile(file) {
  if (!file.type.startsWith("image/")) {
    showError("이미지 파일만 첨부할 수 있습니다.");
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    showError("파일 크기는 10MB 이하여야 합니다.");
    return;
  }
  selectedFile = file;
  updateSubmitState();
  const reader = new FileReader();
  reader.onload = (ev) => {
    photoPreview.src = ev.target.result;
    photoPreview.hidden = false;
    photoPrompt.hidden = true;
  };
  reader.readAsDataURL(file);
}

/* ===== 날짜 스크롤 휠 ===== */
function buildDateWheels(year, month, day) {
  buildWheelItems(yearWheel, rangeArr(2020, 2030), year, formatYear);
  buildWheelItems(monthWheel, rangeArr(1, 12), month, formatMonth);
  rebuildDays(year, month, day);

  // 휠 스크롤 이벤트
  yearWheel.onscroll = () => onWheelSnap(yearWheel);
  monthWheel.onscroll = () => onWheelSnap(monthWheel);
  dayWheel.onscroll = () => onWheelSnap(dayWheel);
}

function rebuildDays(year, month, selectedDay) {
  const maxDay = new Date(year, month, 0).getDate();
  const day = Math.min(selectedDay, maxDay);
  buildWheelItems(dayWheel, rangeArr(1, maxDay), day, formatDay);
}

function buildWheelItems(container, values, selected, formatter) {
  const PADDING = 2; // 상하 패딩 아이템 수
  container.innerHTML = "";

  // 패딩 (빈 아이템)
  for (let i = 0; i < PADDING; i++) {
    container.appendChild(createWheelItem("", ""));
  }

  values.forEach((v) => {
    const li = createWheelItem(v, formatter(v));
    container.appendChild(li);
  });

  for (let i = 0; i < PADDING; i++) {
    container.appendChild(createWheelItem("", ""));
  }

  // 선택 값으로 스크롤 (레이아웃 후 실행 보장)
  const idx = values.indexOf(selected);
  if (idx >= 0) {
    requestAnimationFrame(() => {
      container.scrollTop = idx * ITEM_H;
    });
  }
}

function createWheelItem(value, text) {
  const li = document.createElement("li");
  li.className = "wheel__item";
  li.dataset.value = value;
  li.textContent = text;
  li.style.height = ITEM_H + "px";
  li.style.lineHeight = ITEM_H + "px";
  return li;
}

function onWheelSnap(container) {
  clearTimeout(container._snapTimer);
  container._snapTimer = setTimeout(() => {
    const idx = Math.round(container.scrollTop / ITEM_H);
    container.scrollTo({ top: idx * ITEM_H, behavior: "smooth" });

    // 연/월 변경 시 일 수 재계산
    if (container === yearWheel || container === monthWheel) {
      const y = getWheelValue(yearWheel);
      const m = getWheelValue(monthWheel);
      const d = getWheelValue(dayWheel);
      if (y && m) rebuildDays(y, m, d || 1);
    }
  }, 120);
}

function getWheelValue(container) {
  const PADDING = 2;
  const idx = Math.round(container.scrollTop / ITEM_H);
  const items = container.querySelectorAll(".wheel__item");
  const item = items[idx + PADDING];
  return item ? Number(item.dataset.value) || 0 : 0;
}

function getSelectedDate() {
  const y = getWheelValue(yearWheel);
  const m = getWheelValue(monthWheel);
  const d = getWheelValue(dayWheel);
  if (!y || !m || !d) return null;
  const mm = String(m).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

/* 유틸 */
function rangeArr(start, end) {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}
function formatYear(v) {
  return `${v}년`;
}
function formatMonth(v) {
  return `${v}월`;
}
function formatDay(v) {
  return `${v}일`;
}

/* ===== 에러 표시 ===== */
function showError(msg) {
  errorEl.textContent = msg;
  errorEl.hidden = false;
  setTimeout(() => {
    errorEl.hidden = true;
  }, 4000);
}

/* ===== 폼 유효성 ===== */
function validate() {
  if (!selectedRating) {
    showError("별점을 선택해 주세요.");
    return false;
  }
  if (!selectedFile) {
    showError("사진을 한 장 첨부해 주세요.");
    return false;
  }
  if (!reviewTx.value.trim()) {
    showError("리뷰를 간략히 작성해 주세요.");
    return false;
  }
  return true;
}

/* ===== 제출 ===== */
async function handleSubmit() {
  if (isSubmitting) return;
  if (!validate()) return;

  const sb = window.__getSupabase?.();
  if (!sb) {
    showError("로그인이 필요합니다.");
    return;
  }

  isSubmitting = true;
  submitBtn.disabled = true;
  submitBtn.textContent = "저장 중…";

  try {
    // 1) 현재 유저
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) throw new Error("로그인 세션이 만료되었습니다.");

    // 2) 사진 업로드 → Supabase Storage
    const ext = selectedFile.name.split(".").pop() || "jpg";
    const fileName = `${user.id}/${Date.now()}.${ext}`;
    const { data: uploadData, error: uploadErr } = await sb.storage
      .from("review-photos")
      .upload(fileName, selectedFile, { cacheControl: "3600", upsert: false });

    if (uploadErr) throw new Error("사진 업로드 실패: " + uploadErr.message);

    // 공개 URL
    const {
      data: { publicUrl },
    } = sb.storage.from("review-photos").getPublicUrl(uploadData.path);

    // 3) 리뷰 DB 저장
    const visitedAt = getSelectedDate() || new Date().toISOString().slice(0, 10);

    const { error: insertErr } = await sb.from("reviews").insert({
      user_id: user.id,
      place_id: currentPlace.id,
      place_name: currentPlace.name,
      place_address: currentPlace.address || "",
      place_category: currentPlace.category || "",
      place_x: currentPlace.x || "",
      place_y: currentPlace.y || "",
      rating: selectedRating,
      review_text: reviewTx.value.trim(),
      photo_url: publicUrl,
      visited_at: visitedAt,
    });

    if (insertErr) throw new Error("리뷰 저장 실패: " + insertErr.message);

    // 성공
    closeReviewModal();
    window.dispatchEvent(
      new CustomEvent("review:saved", {
        detail: { placeId: currentPlace.id, rating: selectedRating },
      }),
    );
  } catch (err) {
    console.error("[reviews]", err);
    showError(err.message || "리뷰 저장에 실패했습니다.");
  } finally {
    isSubmitting = false;
    submitBtn.disabled = false;
    submitBtn.textContent = "리뷰 저장하기";
  }
}

/* ===== 이벤트 바인딩 ===== */
function initReviews() {
  // 별점
  ratingBtns.forEach((btn) => btn.addEventListener("click", handleRating));

  // 사진
  photoZone.addEventListener("click", handlePhotoClick);
  photoZone.addEventListener("drop", handlePhotoDrop);
  photoZone.addEventListener("dragover", handlePhotoDragOver);
  photoZone.addEventListener("dragleave", handlePhotoDragLeave);
  photoInput.addEventListener("change", handlePhotoSelect);

  // 닫기
  closeBtn.addEventListener("click", closeReviewModal);
  cancelBtn.addEventListener("click", closeReviewModal);
  overlay.addEventListener("click", closeReviewModal);

  // ESC 닫기
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) closeReviewModal();
  });

  // 제출
  submitBtn.addEventListener("click", handleSubmit);

  // 리뷰 저장 성공 토스트
  window.addEventListener("review:saved", () => {
    const toast = document.getElementById("status");
    const text = document.getElementById("status-text");
    if (toast && text) {
      text.textContent = "리뷰가 저장되었습니다! 🎉";
      toast.classList.add("is-visible");
      setTimeout(() => toast.classList.remove("is-visible"), 3000);
    }
  });
}

document.addEventListener("DOMContentLoaded", initReviews);
