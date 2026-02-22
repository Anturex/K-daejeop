/**
 * Supabase 인증 모듈
 *
 * 1. Supabase JS SDK 초기화
 * 2. 로그인 화면 ↔ 앱 화면 전환
 * 3. Google OAuth 로그인 / 로그아웃
 * 4. 인증 상태 변경 시 UI 업데이트
 */

/* ===== DOM — 로그인 화면 ===== */
const loginScreen = document.getElementById("login-screen");
const loginLoading = document.getElementById("login-loading");
const googleLoginBtn = document.getElementById("google-login-btn");

/* ===== DOM — 앱 화면 ===== */
const appEl = document.getElementById("app");
const userMenu = document.getElementById("user-menu");
const userMenuToggle = document.getElementById("user-menu-toggle");
const userDropdown = document.getElementById("user-dropdown");
const userAvatar = document.getElementById("user-avatar");
const userName = document.getElementById("user-name");
const userEmail = document.getElementById("user-email");
const logoutBtn = document.getElementById("logout-btn");

/* ===== Supabase Client ===== */
const SUPABASE_URL =
  document.querySelector('meta[name="supabase-url"]')?.content || "";
const SUPABASE_ANON_KEY =
  document.querySelector('meta[name="supabase-anon-key"]')?.content || "";

let supabaseClient = null;

function getSupabase() {
  if (supabaseClient) return supabaseClient;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn("[auth] Supabase URL 또는 ANON_KEY가 설정되지 않았습니다.");
    return null;
  }

  if (!window.supabase?.createClient) {
    console.warn("[auth] Supabase JS SDK가 로드되지 않았습니다.");
    return null;
  }

  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return supabaseClient;
}

/* ===== 화면 전환 ===== */
function showLoginScreen() {
  loginLoading.hidden = true;
  loginScreen.hidden = false;
  loginScreen.classList.add("is-visible");
  appEl.hidden = true;
}

function showApp(user) {
  // 유저 정보 업데이트
  updateUserUI(user);

  // 화면 전환 (부드러운 트랜지션)
  loginScreen.classList.remove("is-visible");
  loginScreen.classList.add("is-leaving");

  setTimeout(() => {
    loginScreen.hidden = true;
    loginScreen.classList.remove("is-leaving");
    appEl.hidden = false;
    appEl.classList.add("is-visible");

    // 지도 초기화/재배치 트리거 (hidden → visible 전환 후)
    window.dispatchEvent(new CustomEvent("app:visible"));
  }, 400);
}

function showLoading() {
  loginLoading.hidden = false;
  loginScreen.hidden = false;
}

/* ===== 유저 UI ===== */
function updateUserUI(user) {
  const meta = user.user_metadata || {};
  const name = meta.full_name || meta.name || user.email || "";
  const avatar = meta.avatar_url || meta.picture || "";
  const email = user.email || "";

  if (avatar) {
    userAvatar.src = avatar;
    userAvatar.alt = name;
    userAvatar.style.display = "";
  } else {
    userAvatar.style.display = "none";
  }

  userName.textContent = name.split(" ")[0] || "유저";
  userEmail.textContent = email;
}

/* ===== 드롭다운 ===== */
function toggleDropdown() {
  userDropdown.hidden = !userDropdown.hidden;
}

function closeDropdown(e) {
  if (!e.target.closest(".user-menu")) {
    userDropdown.hidden = true;
  }
}

/* ===== 로그인 / 로그아웃 ===== */
async function handleGoogleLogin() {
  const sb = getSupabase();
  if (!sb) {
    alert("로그인 기능이 설정되지 않았습니다.\nSUPABASE_URL과 SUPABASE_ANON_KEY를 확인하세요.");
    return;
  }

  googleLoginBtn.disabled = true;
  googleLoginBtn.classList.add("is-loading");

  const { error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin + "/",
    },
  });

  if (error) {
    console.error("[auth] Google 로그인 실패:", error.message);
    alert("로그인에 실패했습니다: " + error.message);
    googleLoginBtn.disabled = false;
    googleLoginBtn.classList.remove("is-loading");
  }
  // 성공 시 Google로 리다이렉트됨 → 돌아온 뒤 onAuthStateChange가 처리
}

async function handleLogout() {
  const sb = getSupabase();
  if (!sb) return;

  const { error } = await sb.auth.signOut();
  if (error) {
    console.error("[auth] 로그아웃 실패:", error.message);
  }
  // onAuthStateChange가 showLoginScreen() 호출
}

/* ===== 초기화 ===== */
function init() {
  const sb = getSupabase();

  // 이벤트 바인딩
  googleLoginBtn.addEventListener("click", handleGoogleLogin);
  logoutBtn.addEventListener("click", handleLogout);
  userMenuToggle.addEventListener("click", toggleDropdown);
  document.addEventListener("mousedown", closeDropdown);

  if (!sb) {
    // Supabase 미설정: 로그인 화면에 에러 표시
    showLoginScreen();
    return;
  }

  // 로딩 상태 표시 (세션 확인 중)
  showLoading();

  // 인증 상태 변경 리스너
  sb.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
      showApp(session.user);
    } else {
      showLoginScreen();
    }
  });

  // 초기 세션 확인
  sb.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) {
      showApp(session.user);
    } else {
      showLoginScreen();
    }
  });
}

document.addEventListener("DOMContentLoaded", init);
