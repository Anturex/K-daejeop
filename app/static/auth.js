/**
 * Supabase 인증 모듈
 *
 * 1. Supabase JS SDK 초기화 + 클라이언트 공유
 * 2. 로그인 화면 ↔ 앱 화면 전환
 * 3. Google OAuth 로그인 / 로그아웃
 * 4. 인증 상태 변경 시 UI 업데이트
 * 5. 로그인 후 튜토리얼 상태 체크
 */

/* ===== DOM — 로그인 화면 ===== */
const loginScreen = document.getElementById("login-screen");
const loginLoading = document.getElementById("login-loading");
const googleLoginBtn = document.getElementById("google-login-btn");

/* ===== DOM — 앱 화면 ===== */
const appEl = document.getElementById("app");
const userMenuToggle = document.getElementById("user-menu-toggle");
const userDropdown = document.getElementById("user-dropdown");
const userAvatar = document.getElementById("user-avatar");
const userName = document.getElementById("user-name");
const userEmail = document.getElementById("user-email");
const logoutBtn = document.getElementById("logout-btn");
const tutorialToggleBtn = document.getElementById("tutorial-toggle-btn");

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

// 다른 모듈에서 supabase 클라이언트 사용 가능
window.__getSupabase = getSupabase;

/* ===== 화면 전환 ===== */
function showLoginScreen() {
  loginLoading.hidden = true;
  loginScreen.hidden = false;
  loginScreen.classList.add("is-visible");
  appEl.hidden = true;
}

function showApp(user) {
  updateUserUI(user);

  loginScreen.classList.remove("is-visible");
  loginScreen.classList.add("is-leaving");

  setTimeout(() => {
    loginScreen.hidden = true;
    loginScreen.classList.remove("is-leaving");
    appEl.hidden = false;
    appEl.classList.add("is-visible");

    // 지도 초기화/재배치 트리거 (hidden → visible 전환 후)
    window.dispatchEvent(new CustomEvent("app:visible"));

    // 튜토리얼 상태 확인
    checkTutorialStatus(user);
  }, 400);
}

function showLoading() {
  loginLoading.hidden = false;
  loginScreen.hidden = false;
}

/* ===== 튜토리얼 상태 ===== */
async function checkTutorialStatus(user) {
  const sb = getSupabase();
  if (!sb) return;

  try {
    // user_profiles에서 tutorial_seen 확인
    const { data, error } = await sb
      .from("user_profiles")
      .select("tutorial_seen")
      .eq("user_id", user.id)
      .single();

    if (error && error.code === "PGRST116") {
      // 프로필이 없으면 생성 (handle_new_user 트리거 미작동 시 fallback)
      await sb.from("user_profiles").insert({ user_id: user.id });
      window.dispatchEvent(new CustomEvent("tutorial:show"));
      return;
    }

    if (!data?.tutorial_seen) {
      window.dispatchEvent(new CustomEvent("tutorial:show"));
    }
  } catch (err) {
    console.warn("[auth] tutorial check failed:", err);
  }
}

async function markTutorialSeen() {
  const sb = getSupabase();
  if (!sb) return;

  try {
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;

    await sb
      .from("user_profiles")
      .update({ tutorial_seen: true })
      .eq("user_id", user.id);
  } catch (err) {
    console.warn("[auth] tutorial mark failed:", err);
  }
}

window.__markTutorialSeen = markTutorialSeen;

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
    alert("로그인 기능이 설정되지 않았습니다.");
    return;
  }

  googleLoginBtn.disabled = true;
  googleLoginBtn.classList.add("is-loading");

  const { error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin + "/" },
  });

  if (error) {
    console.error("[auth] Google 로그인 실패:", error.message);
    alert("로그인에 실패했습니다: " + error.message);
    googleLoginBtn.disabled = false;
    googleLoginBtn.classList.remove("is-loading");
  }
}

async function handleLogout() {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.auth.signOut();
  if (error) console.error("[auth] 로그아웃 실패:", error.message);
}

/* ===== 초기화 ===== */
function init() {
  const sb = getSupabase();

  // 이벤트 바인딩
  googleLoginBtn.addEventListener("click", handleGoogleLogin);
  logoutBtn.addEventListener("click", handleLogout);
  userMenuToggle.addEventListener("click", toggleDropdown);
  document.addEventListener("mousedown", closeDropdown);

  // 튜토리얼 다시 보기 버튼
  if (tutorialToggleBtn) {
    tutorialToggleBtn.addEventListener("click", () => {
      userDropdown.hidden = true;
      window.dispatchEvent(new CustomEvent("tutorial:show"));
    });
  }

  if (!sb) {
    showLoginScreen();
    return;
  }

  showLoading();

  // OAuth 콜백 감지: Google 로그인 후 Supabase가 ?code= 파라미터와 함께 리다이렉트
  // INITIAL_SESSION은 code 교환 완료 전에 null session으로 발화하므로 이 경우 로딩 유지
  const isOAuthCallback = new URLSearchParams(window.location.search).has("code");
  let authResolved = false;

  // 2FA 등으로 교환이 오래 걸릴 경우 대비 타임아웃 (10초)
  if (isOAuthCallback) {
    setTimeout(() => {
      if (!authResolved) {
        authResolved = true;
        showLoginScreen();
      }
    }, 10000);
  }

  sb.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
      authResolved = true;
      showApp(session.user);
    } else if (event === "INITIAL_SESSION" && isOAuthCallback && !authResolved) {
      // code 교환 완료 전 — 로딩 스피너 유지
    } else {
      authResolved = true;
      showLoginScreen();
    }
  });

  sb.auth.getSession().then(({ data: { session } }) => {
    if (authResolved) return; // onAuthStateChange가 이미 처리함
    authResolved = true;
    if (session?.user) {
      showApp(session.user);
    } else if (!isOAuthCallback) {
      showLoginScreen();
    }
    // isOAuthCallback + session null: onAuthStateChange(SIGNED_IN) 대기
  });
}

document.addEventListener("DOMContentLoaded", init);
