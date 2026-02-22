# K-daejeop

카카오맵 API를 활용해 한국 지도 기반 검색/확대를 제공하는 프로토타입입니다.

## 아키텍처 개요

```
┌──────────────────────────────────────────────────────────────────┐
│  Browser (클라이언트)                                              │
│  ┌─────────────┐ ┌─────────────┐ ┌────────────────────────────┐  │
│  │ index.html   │ │ auth.js     │ │ main.js                    │  │
│  │ (Jinja2)     │ │ Supabase JS │ │  - 카카오맵 SDK 초기화      │  │
│  │              │ │ Google OAuth│ │  - 검색 UI / 자동완성       │  │
│  │              │ │ 세션 관리    │ │  - 마커·하이라이트 렌더링   │  │
│  └─────────────┘ └──────┬──────┘ └──────────┬─────────────────┘  │
│                         │                    │                    │
│           signInWithOAuth('google')  fetch /api/places            │
│                         │                    │                    │
│                         ▼                    │                    │
│                  ┌──────────────┐             │                    │
│                  │ Supabase Auth│             │                    │
│                  │ (Google OAuth│             │                    │
│                  │  콜백 처리)  │             │                    │
│                  └──────────────┘             │                    │
│                         │                    │                    │
│          세션 토큰 (access_token)             │                    │
│                         │                    │                    │
│               Authorization: Bearer          │                    │
│                         │                    │                    │
└─────────────────────────┼────────────────────┼────────────────────┘
                          │                    │
┌─────────────────────────┼────────────────────┼────────────────────┐
│  FastAPI Server         ▼                    ▼                    │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  Routers                                                    │   │
│  │  ├── GET /              → pages.router  (HTML 렌더)         │   │
│  │  ├── GET /api/health    → health.router (헬스체크)           │   │
│  │  ├── GET /api/places    → places.router (장소 검색 프록시)   │   │
│  │  └── GET /api/auth/me   → auth.router  (현재 유저 정보)     │   │
│  └──────────────┬───────────────────────┬─────────────────────┘   │
│                 │                       │                         │
│  ┌──────────────▼──────────────┐ ┌──────▼──────────────────────┐  │
│  │  Core                       │ │  Services                    │  │
│  │  ├── config.py (Settings)   │ │  └── KakaoPlacesClient       │  │
│  │  │    .env.{APP_ENV} 로딩   │ │       httpx → Kakao REST API │  │
│  │  │    Supabase 설정 포함    │ │                               │  │
│  │  └── auth.py                │ └───────────────────────────────┘  │
│  │       PyJWT 검증            │                                   │
│  │       get_current_user      │                                   │
│  └─────────────────────────────┘                                   │
└──────────────────────────────────────────────────────────────────┘
                                     │
                          ┌──────────┴───────────┐
                          │  Kakao REST API       │
                          │  (dapi.kakao.com)     │
                          └──────────────────────┘
```

## 디렉토리 구조

```
K-daejeop/
├── app/
│   ├── main.py              # FastAPI 앱 생성, 라우터 등록, 정적 파일 마운트
│   ├── core/
│   │   ├── config.py        # pydantic BaseSettings 환경 변수 설정
│   │   └── auth.py          # Supabase JWT 검증, FastAPI 의존성
│   ├── routers/
│   │   ├── health.py        # GET /api/health — 헬스체크
│   │   ├── auth.py          # GET /api/auth/me — 현재 유저 정보
│   │   ├── pages.py         # GET / — Jinja2 HTML 렌더링
│   │   └── places.py        # GET /api/places — 카카오 장소 검색 프록시
│   ├── services/
│   │   └── kakao.py         # KakaoPlacesClient — 카카오 REST API 클라이언트
│   ├── static/
│   │   ├── auth.js          # Supabase JS 인증 모듈 (Google OAuth)
│   │   ├── main.js          # 프론트엔드 검색·지도 인터랙션
│   │   └── styles.css       # 스타일시트
│   └── templates/
│       └── index.html       # 메인 페이지 Jinja2 템플릿
├── scripts/
│   └── serve.sh             # uvicorn 실행 스크립트
├── tests/                   # pytest 테스트 (65개)
│   ├── conftest.py
│   ├── test_app.py
│   ├── test_auth.py         # 인증 관련 테스트 (JWT 검증, /api/auth/me)
│   ├── test_config.py
│   ├── test_health.py
│   ├── test_pages.py
│   └── test_places.py
├── .env.development.example # 개발 환경 변수 예제
├── .env.production.example  # 운영 환경 변수 예제
├── pyproject.toml           # 프로젝트 메타 & 의존성 (uv)
├── uv.lock
└── README.md
```

## 핵심 흐름

1. **페이지 로드**: `GET /` → `pages.router` → Jinja2가 카카오·Supabase 키를 주입하여 HTML 렌더링
2. **지도 초기화**: 브라우저에서 카카오맵 SDK 로드 → `main.js`의 `boot()` → `initMap()` 실행
3. **자동완성**: 사용자 타이핑 → 200ms 디바운스 → `/api/places` 호출 → 추천 장소 드롭다운 표시 (최대 8건)
4. **장소 검색**: 추천 항목 클릭 또는 Enter → `doSearch()` → 카카오 REST API → JSON 반환
5. **결과 렌더링**: 응답의 `documents`를 파싱 → 마커 표시 → 가까운 결과만 필터링 → **검색 장소를 지도 중심에 고정** + 원형 하이라이트
6. **결과 없음**: 빈 `documents` → 에러 토스트 4초 표시

## 인증 (Google OAuth via Supabase)

### 흐름

1. 사용자가 **"Google 로그인"** 버튼 클릭
2. `auth.js`가 Supabase JS SDK의 `signInWithOAuth({ provider: 'google' })` 호출
3. Google 동의 화면 → Supabase 콜백 → 앱으로 리다이렉트 (세션 자동 획득)
4. `onAuthStateChange`가 세션 감지 → **로그인 화면에서 앱 화면으로 전환**, 헤더에 유저 아바타·이름 표시
5. **보호된 API 호출 시**: `Authorization: Bearer <access_token>` 헤더 전송
6. 백엔드 `app/core/auth.py`가 PyJWT로 HS256 검증 (audience=`authenticated`)

### 설정 필요 항목

| 항목 | 위치 |
|------|------|
| `SUPABASE_URL` | `.env.{development\|production}` |
| `SUPABASE_ANON_KEY` | `.env.{development\|production}` |
| `SUPABASE_JWT_SECRET` | `.env.{development\|production}` |
| Google OAuth Provider | Supabase 대시보드 → Authentication → Providers → Google |
| Site URL / Redirect URLs | Supabase 대시보드 → Authentication → URL Configuration |

### Supabase 대시보드 설정

1. [Supabase 대시보드](https://supabase.com/dashboard)에서 프로젝트 생성
2. **Settings → API** 에서 `URL`, `anon key`, `JWT secret` 확인
3. **Authentication → Providers → Google** 활성화
   - Google Cloud Console에서 OAuth 2.0 클라이언트 생성
   - 승인된 리디렉션 URI: `https://<your-project>.supabase.co/auth/v1/callback`
4. **Authentication → URL Configuration**
   - Site URL: `http://127.0.0.1:5173` (개발) 또는 프로덕션 도메인
   - Redirect URLs: `http://127.0.0.1:5173/` 추가

## 프론트엔드 기능

| 기능 | 설명 |
|------|------|
| **전체화면 로그인** | 로그인 전 로그인 카드 UI 표시, 로그인 후 앱 화면으로 부드럽게 전환 |
| **Google 로그인** | Supabase JS SDK + Google OAuth, 헤더에 유저 아바타·이름 표시 |
| **유저 메뉴 드롭다운** | 로그인 시 이메일 확인·로그아웃 |
| **자동완성 드롭다운** | 타이핑 시 추천 장소를 실시간 표시, 클릭 또는 ↑↓ + Enter로 선택 |
| **한글 IME 지원** | `input` 이벤트 + 디바운스로 한글 조합 중에도 실시간 자동완성 |
| **결과 없음 안내** | 검색 결과가 없으면 에러 토스트 4초간 표시 후 자동 사라짐 |
| **리치 인포윈도우** | 장소명, 카테고리, 도로명 주소, 전화번호, 상세보기 링크 카드 |
| **검색 결과 중심 고정** | 검색 시 첫 번째 결과를 항상 지도 중심에 배치, 다중 결과도 중심 유지 |
| **검색 오류 분리** | API 오류와 지도 SDK 오류를 분리 처리, 검색 ID로 stale 응답 무시 |
| **캐시 버스팅** | 서버 시작 시점 타임스탬프로 CSS/JS URL에 `?v=` 쿼리 추가, 브라우저 캐시 방지 |
| **반응형 디자인** | 모바일/태블릿/데스크탑 대응 (840px, 480px 브레이크포인트) |

## 비밀값 분리(서버 프록시)

- 검색은 서버가 카카오 REST API를 호출합니다.
- 클라이언트는 `/api/places`만 호출합니다.
- 카카오 JavaScript 키는 지도 렌더링에 필요하므로 브라우저에서 사용됩니다.
- Supabase URL과 anon key는 공개(public) 키로, 브라우저에서 사용됩니다.
- Supabase JWT Secret은 서버에서만 사용됩니다 (토큰 검증).

## 환경 분리 (dev/prod)

- 기본적으로 `APP_ENV=development`가 적용됩니다.
- 설정 로딩 우선순위: `.env.{APP_ENV}` → `.env`
- 예: `APP_ENV=development`이면 `.env.development`를 우선 로딩합니다.

### 샘플 파일

- `.env.development.example`
- `.env.production.example`

원하는 환경 파일을 복사해 실제 `.env.development` 또는 `.env.production`으로 사용하세요.

## 로컬 설정

`.env.development` 또는 `.env` 파일에 값을 채웁니다.

```bash
APP_ENV=development
APP_NAME=k-daejeop
HOST=127.0.0.1
PORT=5173
LOG_LEVEL=info

# Kakao
KAKAO_JS_KEY=your_kakao_javascript_key
KAKAO_REST_KEY=your_kakao_rest_key

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_JWT_SECRET=your_supabase_jwt_secret
```

## 실행 (uv)

`uv`를 사용합니다.

```bash
uv venv
uv sync
./scripts/serve.sh
```

브라우저 접속: `http://127.0.0.1:5173`

## 테스트 실행

```bash
uv run pytest tests/ -v
```

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| 서버 프레임워크 | FastAPI 0.111.0 |
| ASGI 서버 | Uvicorn 0.30.1 |
| HTTP 클라이언트 | httpx 0.27.0 |
| 템플릿 엔진 | Jinja2 3.1.4 |
| 설정 관리 | pydantic 1.10.15 (BaseSettings) |
| JWT 검증 | PyJWT 2.8.0 |
| 인증 | Supabase Auth (Google OAuth) |
| 패키지 매니저 | uv |
| 외부 API | 카카오맵 REST API / JavaScript SDK |
