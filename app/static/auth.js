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

/* ===== OAuth 상태 추적 (모바일/ngrok 인터스티셜 대응) =====
 * 문제: ngrok 무료 플랜 최초 방문 시 인터스티셜 페이지가 ?code= 파라미터를
 *       제거한 채 리다이렉트해 PKCE code 교환이 실패함.
 *       iOS Safari bfcache(뒤로가기 캐시)도 동일 증상을 유발함.
 * 해결: OAuth 시작 전 sessionStorage에 플래그를 저장해 "code 없이 돌아온" 경우를
 *       감지하고, 세션을 재확인해 이미 성립됐으면 바로 앱을 표시함. */
const OAUTH_PENDING_KEY = "k_oauth_pending";

/* ===== 로그인 / 로그아웃 ===== */
async function handleGoogleLogin() {
  const sb = getSupabase();
  if (!sb) {
    alert("로그인 기능이 설정되지 않았습니다.");
    return;
  }

  googleLoginBtn.disabled = true;
  googleLoginBtn.classList.add("is-loading");

  // OAuth 시작 플래그 (redirect 후 code 없이 돌아온 경우 감지용)
  sessionStorage.setItem(OAUTH_PENDING_KEY, "1");

  const { error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin + "/" },
  });

  if (error) {
    sessionStorage.removeItem(OAUTH_PENDING_KEY);
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

  // ── OAuth 상태 플래그 읽기 ──
  // isOAuthCallback: Supabase PKCE 콜백 (?code= 파라미터 존재)
  // hadOAuthPending: OAuth를 시작했는데 ?code= 없이 돌아온 경우
  //   (ngrok 인터스티셜이 파라미터를 제거하거나 iOS bfcache로 code가 소실될 때)
  const isOAuthCallback = new URLSearchParams(window.location.search).has("code");
  const hadOAuthPending = sessionStorage.getItem(OAUTH_PENDING_KEY) === "1";
  sessionStorage.removeItem(OAUTH_PENDING_KEY); // 플래그 소비
  const isOAuthRelated = isOAuthCallback || hadOAuthPending;

  let authResolved = false;

  // ── iOS Safari bfcache 대응 ──
  // bfcache로 복원된 페이지는 DOMContentLoaded를 재실행하지 않으므로
  // pageshow 이벤트에서 세션을 재확인해 화면 전환을 보장
  window.addEventListener("pageshow", (e) => {
    if (!e.persisted) return;
    sb.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) showApp(session.user);
      else showLoginScreen();
    });
  });

  // OAuth 관련 상태: code 교환 또는 세션 전파 대기 타임아웃 (10초)
  if (isOAuthRelated) {
    setTimeout(() => {
      if (!authResolved) {
        authResolved = true;
        showLoginScreen();
      }
    }, 10000);
  }

  // ── 인증 상태 변경 핸들러 ──
  // 주의: catch-all else 대신 명시적 이벤트만 처리해
  //       TOKEN_REFRESHED 등 일시적 이벤트가 로그인 화면을 잘못 표시하는 것을 방지
  sb.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
      // 세션 있음 → 앱 표시 (isOAuthRelated 여부와 무관)
      authResolved = true;
      showApp(session.user);
    } else if (event === "INITIAL_SESSION" && isOAuthRelated && !authResolved) {
      // PKCE code 교환 중이거나 hadOAuthPending: 세션 도착 대기
    } else if (event === "INITIAL_SESSION" || event === "SIGNED_OUT") {
      // 세션 없음 확정 → 로그인 화면
      authResolved = true;
      showLoginScreen();
    }
    // 기타 이벤트(TOKEN_REFRESHED, USER_UPDATED 등)에서 세션 없는 경우: 무시
  });

  // ── getSession 폴백 ──
  // onAuthStateChange보다 먼저 세션 확인이 끝날 수 있으므로 fallback으로 사용
  sb.auth.getSession().then(({ data: { session } }) => {
    if (authResolved) return;
    authResolved = true;
    if (session?.user) {
      showApp(session.user);
    } else if (!isOAuthRelated) {
      showLoginScreen();
    }
    // isOAuthRelated + 세션 없음: onAuthStateChange(SIGNED_IN) 또는 타임아웃 대기
  });
}

document.addEventListener("DOMContentLoaded", init);
