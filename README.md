# K-daejeop

카카오맵 API + Supabase를 활용한 한국 지도 기반 **폐쇄형 맛집 리뷰 서비스**.
사용자가 음식점을 검색하고 별점(1~3)·사진·리뷰를 남기면, 10개 이상 쌓은 뒤 다른 사용자의 추천 맛집을 볼 수 있습니다.

## 아키텍처 개요

```
┌──────────────────────────────────────────────────────────────────┐
│  Browser (클라이언트)                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ ┌──────────┐ │
│  │index.html│ │ auth.js  │ │ main.js  │ │reviews │ │tutorial  │ │
│  │(Jinja2)  │ │Supabase  │ │카카오맵   │ │  .js   │ │  .js     │ │
│  │          │ │OAuth+세션│ │검색·마커  │ │별점·사진│ │온보딩    │ │
│  └──────────┘ └────┬─────┘ └────┬─────┘ └───┬────┘ └──────────┘ │
│                    │            │            │                    │
│      signInWithOAuth    /api/places   Supabase DB+Storage        │
│                    │            │            │                    │
│                    ▼            │            ▼                    │
│             ┌──────────┐       │     ┌────────────┐              │
│             │Supabase  │       │     │Supabase    │              │
│             │Auth      │       │     │Database +  │              │
│             │(Google)  │       │     │Storage     │              │
│             └──────────┘       │     └────────────┘              │
│                    │           │                                  │
└────────────────────┼───────────┼──────────────────────────────────┘
                     │           │
┌────────────────────┼───────────┼──────────────────────────────────┐
│  FastAPI Server    ▼           ▼                                  │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  Routers                                                    │   │
│  │  ├── GET /              → pages.router  (HTML 렌더)         │   │
│  │  ├── GET /api/health    → health.router (헬스체크)           │   │
│  │  ├── GET /api/places    → places.router (카카오 프록시)      │   │
│  │  └── GET /api/auth/me   → auth.router  (JWT 유저 정보)      │   │
│  └──────────────┬───────────────────────┬─────────────────────┘   │
│  ┌──────────────▼──────────────┐ ┌──────▼──────────────────────┐  │
│  │  Core                       │ │  Services                    │  │
│  │  ├── config.py (Settings)   │ │  └── KakaoPlacesClient       │  │
│  │  │    .env.{APP_ENV} 로딩   │ │       httpx → Kakao REST API │  │
│  │  └── auth.py (JWT 검증)     │ └───────────────────────────────┘  │
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
├── app/                         # FastAPI 애플리케이션
│   ├── __init__.py
│   ├── main.py                  # create_app() 팩토리, 라우터 등록, static 마운트
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py            # Settings(BaseSettings), get_settings()
│   │   └── auth.py              # JWT 검증, get_current_user, get_optional_user
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── health.py            # GET /api/health
│   │   ├── auth.py              # GET /api/auth/me
│   │   ├── pages.py             # GET / (Jinja2 렌더링, 캐시 버스터)
│   │   └── places.py            # GET /api/places?query= (카카오 프록시)
│   ├── services/
│   │   ├── __init__.py
│   │   └── kakao.py             # KakaoPlacesClient (httpx)
│   ├── static/
│   │   ├── i18n.js              # 다국어 번역 (ko/en/ja/zh), 언어 선택 컴포넌트
│   │   ├── auth.js              # Supabase 인증, 로그인/앱 화면 전환, 튜토리얼 체크, tier 조회
│   │   ├── main.js              # 지도 초기화, 검색, 자동완성, 마커, 리뷰 버튼
│   │   ├── reviews.js           # 리뷰 모달 (별점·사진·텍스트·날짜), Supabase CRUD
│   │   ├── myreviews.js         # 내 맛집 클러스터 맵 (클러스터링 + 플라잉 애니메이션)
│   │   ├── tutorial.js          # 온보딩 튜토리얼 5단계 카드
│   │   ├── ads.js               # Google AdSense 광고 (tier 기반 표시/숨김)
│   │   └── styles.css           # 디자인 토큰, 로그인, 앱, 리뷰, 튜토리얼, 언어 선택, 광고 스타일
│   └── templates/
│       └── index.html           # login-screen + app + review-modal + tutorial
├── supabase/
│   └── migrations/
│       ├── 001_reviews_and_profiles.sql  # reviews, user_profiles, storage 스키마
│       └── 002_user_tier.sql            # user_profiles에 tier 컬럼 추가
├── tests/                       # pytest 테스트 (285개)
│   ├── __init__.py
│   ├── conftest.py              # fixtures, mock 환경변수
│   ├── test_app.py
│   ├── test_auth.py
│   ├── test_config.py
│   ├── test_health.py
│   ├── test_pages.py
│   ├── test_places.py
│   ├── test_reviews_ui.py       # 리뷰 모달·튜토리얼 HTML 렌더링 검증
│   ├── test_myreviews_ui.py     # 내 맛집 클러스터 맵 HTML/JS/CSS 검증
│   ├── test_i18n_ui.py          # 다국어(i18n) HTML/JS/CSS 검증
│   └── test_supabase_connection.py  # 실제 Supabase 연결 검증 (네트워크 필요)
├── scripts/
│   └── serve.sh                 # uv run uvicorn 실행 (--reload)
├── .cursorrules                 # AI 컨텍스트 (Cursor)
├── AGENTS.md                    # AI 컨텍스트 (범용)
├── .github/
│   └── copilot-instructions.md  # AI 컨텍스트 (GitHub Copilot)
├── .env.development.example     # 개발 환경 변수 예제
├── .env.production.example      # 운영 환경 변수 예제
├── .gitignore
├── pyproject.toml               # 프로젝트 메타 & 의존성 (uv)
├── uv.lock
└── README.md
```

## 핵심 기능

### 리뷰 시스템 (별점 3단계)

| 별점 | 의미 | 설명 |
|------|------|------|
| ⭐ | 동네 맛집 | 괜찮아서 동네에서 갈만한 곳 |
| ⭐⭐ | 추천 맛집 | 여기 가면 이거 먹으라고 추천할 정도 |
| ⭐⭐⭐ | 인생 맛집 | 정말정말 맛있었던 최고의 맛집 |

### 리뷰 작성 흐름

1. 장소 검색 → 마커 클릭 → 인포윈도우의 **"리뷰 남기기"** 버튼
2. 리뷰 모달에서:
   - **별점** 선택 (1~3, 필수)
   - **사진** 1장 첨부 (필수, 드래그앤드롭 또는 클릭)
   - **리뷰** 텍스트 작성 (맛, 분위기, 서비스 등 자유롭게)
   - **방문 날짜** 스크롤 휠로 선택 (기본: 오늘)
3. "리뷰 저장하기" → Supabase Storage(사진) + Database(리뷰) 저장

### 내 맛집 클러스터 맵

헤더의 **"내 맛집"** 버튼으로 활성화.

- 내가 리뷰한 식당 전체를 지도 위에 표시
- **개별 핀**: 식당 이름(상단) + 사진 + 별점. 긴 이름은 hover 시 마르퀴 슬라이드 애니메이션
- **줌 레벨에 따라 자동 클러스터링**: 줌아웃 시 근처 리뷰들이 2×2 사진 그리드 핀으로 합쳐지고, 줌인 시 다시 개별 핀으로 퍼짐
- **플라잉 애니메이션**: 클러스터가 뭉치고 흩어질 때 이전 위치→새 위치로 날아가는 CSS 트랜지션
- **클러스터 클릭** → 해당 지역으로 줌인
- **개별 핀 클릭** → 리뷰 상세 bottom sheet (사진·별점·방문일·텍스트)
- **사이드 패널 드릴다운**: 지역 목록 → 클릭 시 해당 지역 내 장소 목록(Level 1) → 장소 클릭 시 지도 이동 + 리뷰 상세 표시
  - 모바일에서는 화면 하단에서 올라오는 **바텀시트** 형태
  - 헤더 영역을 아래로 **스와이프하면 패널만 닫힘** (핀은 지도에 유지됨)
  - 별 버튼 재클릭 시 완전 비활성화 (핀 + 패널 모두 제거)
- **같은 장소 여러 방문**: 핀을 클릭하면 방문 횟수 배지 표시, 리뷰 상세 패널에서 ← → 버튼으로 방문별 리뷰 스와이프
- **검색 결과 카드 닫기**: 우상단 ✕ 버튼으로 인포윈도우 닫기

### 검색 결과 랭킹

Kakao Places API 결과를 받은 뒤 **음식점(FD6)·카페(CE7)** 카테고리를 상단으로 재정렬하여 맛집 서비스 특성에 맞는 결과 순서를 제공. 자동완성 드롭다운에도 동일하게 적용.

### 유저 등급 시스템

- `free` (기본): Google AdSense 광고 표시, 기본 기능
- `premium` (구독): 광고 제거, 추천 맛집 조기 해금, 고급 통계 등 (향후 구현)

### 광고 (Google AdSense)

- **free 유저만** 광고 표시 (premium 유저는 자동 숨김)
- 광고 위치: 화면 하단 배너 + 내 맛집 패널 하단
- AdSense 승인 후 `ads.js`의 `AD_CLIENT`와 `index.html`의 `data-ad-client`/`data-ad-slot`을 실제 값으로 교체

### 폐쇄형 시스템 (향후 구현)

- 리뷰 10개 이상 작성 → 다른 사용자의 추천 맛집을 볼 수 있음

### 다국어 지원 (i18n)

- **4개 언어**: 한국어, English, 日本語, 中文
- 로그인 화면·튜토리얼·리뷰 모달·검색·메뉴 등 전체 UI 텍스트 번역
- 로그인 카드·튜토리얼 카드 상단 우측에 **언어 선택 pill 버튼**, 메인 화면에서는 **유저 메뉴 내 언어 변경** 지원
- `localStorage`에 언어 설정 영속 저장 (새로고침 후에도 유지)
- 검색은 카카오맵 특성상 한국어 전용

### 온보딩 튜토리얼

- 첫 로그인 시 5단계 카드 형태 튜토리얼 자동 표시
- 언제든 유저 메뉴 → "튜토리얼 다시 보기"로 재표시
- `user_profiles.tutorial_seen` 플래그로 상태 관리

## 인증 (Google OAuth via Supabase)

### 흐름

1. 사용자가 **"Google 로그인"** 버튼 클릭
2. `auth.js`가 Supabase JS SDK의 `signInWithOAuth({ provider: 'google' })` 호출
3. Google 동의 화면 → Supabase 콜백 → 앱으로 리다이렉트 (세션 자동 획득)
4. `onAuthStateChange`가 세션 감지 → **로그인 화면에서 앱 화면으로 전환**
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
5. **SQL Editor**에서 `supabase/migrations/001_reviews_and_profiles.sql` 실행
   - `reviews` 테이블 + RLS
   - `user_profiles` 테이블 + 자동 생성 트리거
   - `review-photos` 스토리지 버킷 + 정책

## 데이터 모델 (Supabase)

### reviews 테이블

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid (PK) | 자동 생성 |
| user_id | uuid (FK → auth.users) | 작성자 |
| place_id | text | 카카오 장소 ID |
| place_name | text | 장소명 |
| place_address | text | 주소 |
| place_category | text | 카테고리 |
| place_x, place_y | text | 좌표 |
| rating | smallint (1~3) | 별점 |
| review_text | text | 리뷰 텍스트 |
| photo_url | text | 사진 공개 URL |
| visited_at | date | 방문 일자 (기본: 리뷰 작성일) |
| created_at | timestamptz | 생성 시각 |
| updated_at | timestamptz | 수정 시각 (자동) |

### user_profiles 테이블

| 컬럼 | 타입 | 설명 |
|------|------|------|
| user_id | uuid (PK, FK → auth.users) | 유저 |
| tutorial_seen | boolean | 튜토리얼 완료 여부 |
| tier | text | 유저 등급 ('free' 기본, 'premium' 구독) |
| created_at | timestamptz | 생성 시각 |

### RLS 정책

모든 테이블에 Row Level Security 적용 — 사용자는 자신의 데이터만 CRUD 가능.

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

## 실행

```bash
uv sync                    # 의존성 설치
./scripts/serve.sh         # 개발 서버 시작 (--reload)
```

브라우저 접속: `http://127.0.0.1:5173`

## 테스트

```bash
# 전체 테스트 (Supabase 연결 제외)
uv run pytest tests/ -v --ignore=tests/test_supabase_connection.py

# Supabase 연결 테스트 포함
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
| 데이터베이스 | Supabase (PostgreSQL + RLS) |
| 파일 스토리지 | Supabase Storage (review-photos) |
| 패키지 매니저 | uv |
| 외부 API | 카카오맵 REST API / JavaScript SDK |
