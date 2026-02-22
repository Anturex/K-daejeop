/**
 * 온보딩 튜토리얼 모듈
 *
 * 5단계 스텝 카드 형태의 튜토리얼.
 * - auth.js에서 tutorial:show 커스텀 이벤트를 수신하여 표시
 * - 완료/건너뛰기 시 Supabase user_profiles.tutorial_seen = true 저장
 * - 유저 드롭다운 "튜토리얼 다시 보기" 버튼으로 재표시 가능
 */

/* ===== 튜토리얼 스텝 정의 ===== */
const STEPS = [
  {
    icon: `<svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>`,
    title: "K-daejeop에 오신 걸 환영해요! 👋",
    body: "나만의 맛집 리뷰를 기록하고,\n10개 리뷰를 쌓으면 다른 사람의\n추천 맛집을 볼 수 있어요.",
  },
  {
    icon: `<svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>`,
    title: "장소를 검색하세요 🔍",
    body: "상단 검색창에 음식점 이름이나\n키워드를 입력하면 실시간으로\n추천 결과가 나타나요.",
  },
  {
    icon: `<svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>`,
    title: "별점은 세 단계 ⭐",
    body: "⭐ 동네 맛집 — 가볍게 다시 찾을 곳\n⭐⭐ 추천 맛집 — 일부러 찾아갈 맛\n⭐⭐⭐ 인생 맛집 — 두고두고 생각나는 맛",
  },
  {
    icon: `<svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
    </svg>`,
    title: "사진 한 장은 필수! 📸",
    body: "리뷰를 남길 때 사진 한 장을\n꼭 첨부해 주세요.\n간단한 리뷰도 함께 적으면\n나중에 기억하기 좋아요.",
  },
  {
    icon: `<svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>`,
    title: "리뷰 10개 → 추천 맛집 해금 🎉",
    body: "리뷰를 10개 이상 작성하면\n다른 사용자의 추천 맛집을\n받아볼 수 있게 돼요!\n지금 바로 시작해 볼까요?",
  },
];

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
  const step = STEPS[idx];

  stepNumEl.textContent = `STEP ${idx + 1} / ${STEPS.length}`;
  iconEl.innerHTML = step.icon;
  titleEl.textContent = step.title;
  bodyEl.textContent = step.body;

  // 도트 인디케이터
  dotsEl.innerHTML = STEPS.map(
    (_, i) =>
      `<span class="tutorial-dot${i === idx ? " is-active" : ""}"></span>`,
  ).join("");

  // 버튼 상태
  prevBtn.hidden = idx === 0;
  nextBtn.textContent = idx === STEPS.length - 1 ? "시작하기 🚀" : "다음";
  skipBtn.textContent = idx === STEPS.length - 1 ? "" : "건너뛰기";
  skipBtn.hidden = idx === STEPS.length - 1;

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
    if (currentStep < STEPS.length - 1) {
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
}

document.addEventListener("DOMContentLoaded", initTutorial);
