/**
 * 온보딩 튜토리얼 모듈
 *
 * 5단계 스텝 카드 형태의 튜토리얼.
 * - auth.js에서 tutorial:show 커스텀 이벤트를 수신하여 표시
 * - 완료/건너뛰기 시 Supabase user_profiles.tutorial_seen = true 저장
 * - 유저 드롭다운 "튜토리얼 다시 보기" 버튼으로 재표시 가능
 */

/* ===== 튜토리얼 스텝 정의 ===== */
const STEP_ICONS = [
  `<svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>`,
  `<svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>`,
  `<svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>`,
  `<svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
    </svg>`,
  `<svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>`,
];
const STEP_COUNT = STEP_ICONS.length;

function getStep(idx) {
  const t = window.__i18n?.t ?? ((k) => k);
  const n = idx + 1;
  return {
    icon: STEP_ICONS[idx],
    title: t(`tutorial.step${n}.title`),
    body: t(`tutorial.step${n}.body`),
  };
}

/* ===== DOM ===== */
const tutorialEl = document.getElementById("tutorial-overlay");
const cardEl = document.getElementById("tutorial-card");
const stepNumEl = document.getElementById("tutorial-step-num");
const iconEl = document.getElementById("tutorial-icon");
const titleEl = document.getElementById("tutorial-title");
const bodyEl = document.getElementById("tutorial-body");
const dotsEl = document.getElementById("tutorial-dots");
const prevBtn = document.getElementById("tutorial-prev");
const nextBtn = document.getElementById("tutorial-next");
const skipBtn = document.getElementById("tutorial-skip");

let currentStep = 0;

/* ===== 렌더링 ===== */
function renderStep(idx) {
  currentStep = idx;
  const step = getStep(idx);
  const t = window.__i18n?.t ?? ((k) => k);

  stepNumEl.textContent = `STEP ${idx + 1} / ${STEP_COUNT}`;
  iconEl.innerHTML = step.icon;
  titleEl.textContent = step.title;
  bodyEl.textContent = step.body;

  // 도트 인디케이터
  dotsEl.innerHTML = Array.from({ length: STEP_COUNT }, (_, i) =>
    `<span class="tutorial-dot${i === idx ? " is-active" : ""}"></span>`,
  ).join("");

  // 버튼 상태
  prevBtn.hidden = idx === 0;
  const isLast = idx === STEP_COUNT - 1;
  nextBtn.textContent = isLast ? t("tutorial.btn.start") : t("tutorial.btn.next");
  prevBtn.textContent = t("tutorial.btn.prev");
  skipBtn.textContent = isLast ? "" : t("tutorial.btn.skip");
  skipBtn.hidden = isLast;

  // 카드 애니메이션
  cardEl.classList.remove("slide-in");
  void cardEl.offsetWidth; // reflow
  cardEl.classList.add("slide-in");
}

/* ===== 열기/닫기 ===== */
function show() {
  currentStep = 0;
  tutorialEl.hidden = false;
  document.body.style.overflow = "hidden";
  renderStep(0);
  setTimeout(() => tutorialEl.classList.add("is-visible"), 10);
}

function hide() {
  tutorialEl.classList.remove("is-visible");
  setTimeout(() => {
    tutorialEl.hidden = true;
    document.body.style.overflow = "";
  }, 300);
}

function finish() {
  hide();
  // Supabase에 tutorial_seen 저장
  window.__markTutorialSeen?.();
}

/* ===== 이벤트 ===== */
function initTutorial() {
  nextBtn.addEventListener("click", () => {
    if (currentStep < STEP_COUNT - 1) {
      renderStep(currentStep + 1);
    } else {
      finish();
    }
  });

  prevBtn.addEventListener("click", () => {
    if (currentStep > 0) renderStep(currentStep - 1);
  });

  skipBtn.addEventListener("click", finish);

  // ESC 닫기
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !tutorialEl.hidden) finish();
  });

  // auth.js에서 tutorial:show 이벤트 수신
  window.addEventListener("tutorial:show", show);

  // 언어 변경 시 현재 스텝 다시 렌더링
  window.addEventListener("lang:changed", () => {
    if (!tutorialEl.hidden) renderStep(currentStep);
  });
}

document.addEventListener("DOMContentLoaded", initTutorial);
