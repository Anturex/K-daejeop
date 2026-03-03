/**
 * Google AdSense 광고 모듈
 *
 * - 유저 등급(tier)에 따라 광고 표시/숨김
 * - free: 광고 표시 (AdSense 스크립트 로드 + 슬롯 활성화)
 * - premium: 광고 숨김
 *
 * AdSense 승인 후 AD_CLIENT를 실제 publisher ID로 교체하세요.
 */

/* ===== 설정 ===== */
// AdSense publisher ID — 승인 후 실제 값으로 교체
const AD_CLIENT = "ca-pub-6570449864880886";

/* ===== AdSense 스크립트 로드 ===== */
function loadAdSenseScript() {
  return new Promise((resolve) => {
    // 이미 로드된 경우
    if (document.querySelector(`script[src*="adsbygoogle"]`)) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.crossOrigin = "anonymous";
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${AD_CLIENT}`;
    script.addEventListener("load", resolve);
    script.addEventListener("error", () => {
      console.warn("[ads] AdSense 스크립트 로드 실패 — 광고가 표시되지 않습니다.");
      resolve(); // 에러여도 계속 진행 (graceful fail)
    });
    document.head.appendChild(script);
  });
}

/* ===== 광고 슬롯 활성화 ===== */
function activateSlots() {
  const slots = document.querySelectorAll(".ad-slot");
  slots.forEach((slot) => {
    slot.hidden = false;
    // AdSense ins 요소에 push
    const ins = slot.querySelector(".adsbygoogle");
    if (ins) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        // AdSense 미설정 시 에러 무시
      }
    }
  });
}

/* ===== 초기화 ===== */
async function initAds() {
  const tier = window.__getUserTier?.() || "free";

  if (tier !== "free") {
    // premium 유저: 광고 컨테이너 숨김 유지
    return;
  }

  // free 유저: 광고 표시
  document.body.classList.add("has-ads");
  await loadAdSenseScript();
  activateSlots();
}

/* ===== 이벤트 수신 ===== */
// app:visible 이벤트 후 약간의 지연을 두고 초기화
// (auth.js의 checkTutorialStatus에서 tier 조회 완료를 기다림)
window.addEventListener("app:visible", () => {
  setTimeout(initAds, 500);
});
