# K-daejeop

카카오맵 API + Supabase를 활용한 한국 지도 기반 **폐쇄형 맛집 리뷰 서비스**.
사용자가 음식점을 검색하고 별점(0~3)·사진·리뷰를 남기면, 10개 이상 쌓은 뒤 다른 사용자의 추천 맛집을 볼 수 있습니다.

## 아키텍처 개요

```
┌──────────────────────────────────────────────────────────────────┐
│  Browser (React SPA)                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ ┌──────────┐ │
│  │  App.tsx  │ │ useAuth  │ │KakaoMap  │ │Review  │ │Tutorial  │ │
│  │  Zustand  │ │Supabase  │ │ref-based │ │Modal   │ │Overlay   │ │
│  │  stores   │ │OAuth+세션│ │검색·마커  │ │별점·사진│ │온보딩    │ │
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
│  │  ├── GET /              → pages.router  (SPA HTML 서빙)     │   │
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
├── frontend/                    # React SPA (Vite + TypeScript)
│   ├── index.html               # Vite 진입점 (PWA 메타 태그)
│   ├── vite.config.ts           # Vite 설정 (React, Tailwind, 프록시)
│   ├── package.json
│   ├── public/                  # PWA 아이콘, manifest.json
│   ├── src/
│   │   ├── main.tsx             # React 진입점 (keep-alive 포함)
│   │   ├── keepAlive.ts         # Render 서버 sleep 방지 폴링
│   │   ├── App.tsx              # 인증 분기 (LoginScreen | AppLayout)
│   │   ├── index.css            # Tailwind CSS v4 테마 + 커스텀 스타일
│   │   ├── env.ts               # 환경 변수 래퍼
│   │   ├── stores/              # Zustand 스토어 (auth, map, review, ui, badge)
│   │   ├── components/          # React 컴포넌트
│   │   │   ├── LoginScreen/     # 로그인 화면 + 이용약관 모달
│   │   │   ├── Header/          # 헤더, 검색바, 유저 메뉴
│   │   │   ├── Map/             # 카카오맵 (ref 기반)
│   │   │   ├── Reviews/         # 리뷰 모달, 별점, 사진, 날짜
│   │   │   ├── MyReviews/       # 내 맛집 패널, 클러스터 맵, 카테고리/별점 필터
│   │   │   ├── Badges/          # 뱃지판 패널, 생성/상세/카드, 배포/공유
│   │   │   ├── Tutorial/        # 온보딩 튜토리얼
│   │   │   └── Ads/             # 광고 배너
│   │   ├── hooks/               # useAuth, useGeolocation, useReviewedPlaces
│   │   ├── services/            # supabase, kakao SDK, API 호출
│   │   ├── i18n/                # react-i18next + 4개 언어 JSON
│   │   ├── utils/               # escapeHtml, distance, rankFoodFirst, imageUrl, buildReviewPin
│   │   └── types/               # Kakao Maps TypeScript 선언
│   └── tests/                   # Vitest + React Testing Library (211개)
│       ├── setup.ts
│       ├── utils/
│       ├── stores/
│       └── components/
├── app/                         # FastAPI 백엔드
│   ├── main.py                  # create_app(), SPA 정적 파일 서빙
│   ├── core/
│   │   ├── config.py            # Settings(BaseSettings), get_settings()
│   │   └── auth.py              # JWT 검증, get_current_user
│   ├── routers/
│   │   ├── health.py            # GET /api/health
│   │   ├── auth.py              # GET /api/auth/me
│   │   ├── pages.py             # GET / (Vite 빌드 HTML 서빙, SPA fallback)
│   │   └── places.py            # GET /api/places (카카오 프록시)
│   ├── services/
│   │   └── kakao.py             # KakaoPlacesClient (httpx)
│   └── static/
│       └── dist/                # Vite 빌드 결과 (git에서 제외)
├── supabase/
│   └── migrations/
│       ├── 001_reviews_and_profiles.sql
│       ├── 002_user_tier.sql
│       ├── 003_verified_visit.sql
│       ├── 004_review_photo_thumb.sql
│       ├── 005_badge_boards.sql
│       ├── 006_badge_board_sharing.sql
│       └── 007_fetch_creator_reviews_rpc.sql
├── tests/                       # pytest 백엔드 테스트 (69개)
│   ├── conftest.py
│   ├── test_app.py
│   ├── test_auth.py
│   ├── test_config.py
│   ├── test_health.py
│   ├── test_pages.py
│   ├── test_places.py
│   ├── test_reviews_ui.py
│   ├── test_myreviews_ui.py
│   ├── test_i18n_ui.py
│   ├── test_health_filter.py
│   └── test_supabase_connection.py
├── scripts/
│   └── serve.sh
├── .env.development.example
├── .env.production.example
├── pyproject.toml
└── README.md
```

## 핵심 기능

### 리뷰 시스템 (별점 4단계)

| 별점 | 의미 | 설명 |
|------|------|------|
| ✕ | 재방문 안 함 | 다시는 재방문 하지 않을 곳 |
| ⭐ | 가볍게 갈 곳 | 동네에서 가볍게 방문할만 한 곳 |
| ⭐⭐ | 추천할 곳 | 누군가 오면 추천해줄 수 있는 곳 |
| ⭐⭐⭐ | 꼭 가야 할 곳 | 반드시 가야 한다고 말할 수 있는 곳 |

### 리뷰 작성 흐름

1. 장소 검색 → 마커 클릭 → 인포윈도우의 **"리뷰 남기기"** 버튼
2. 리뷰 모달에서:
   - **별점** 선택 (0~3, 필수)
   - **사진** 1장 첨부 (필수, 드래그앤드롭 또는 클릭)
   - **리뷰** 텍스트 작성 (맛, 분위기, 서비스 등 자유롭게)
   - **방문 날짜** 스크롤 휠로 선택 (기본: 오늘)
3. "리뷰 저장하기" → Supabase Storage(사진) + Database(리뷰) 저장
4. GPS로 식당 200m 이내 확인 시 **"실제 방문"** 뱃지 자동 부여

### 내 맛집 클러스터 맵

헤더의 **"내 맛집"** 버튼으로 활성화.

- 내가 리뷰한 식당 전체를 지도 위에 표시
- **줌 레벨에 따라 자동 클러스터링**: 플라잉 애니메이션으로 뭉치고 흩어짐
- **사이드 패널 드릴다운**: 지역 → 장소 → 리뷰 상세
- **카테고리 필터**: 전체/식당/카페/관광명소/기타

### 뱃지판 시스템

- **뱃지판 만들기**: 여러 장소를 묶어 뱃지판 생성 (프리미엄만 생성 가능)
- **장소 탐방**: 뱃지판의 장소를 방문하고 리뷰를 남기면 진행도 증가
- **뱃지 획득**: 모든 장소 방문 완료 시 뱃지 자동 획득
- **배포 & 공유**: 프리미엄 회원이 모든 장소 방문 후 배포 → 6자리 공유코드 생성, 공개 목록에 노출
- **뱃지판 저장**: 다른 유저의 공개 뱃지판을 내 뱃지판에 추가
- **배포자 리뷰**: 저장된 뱃지판에서 배포자의 리뷰를 별도로 확인 가능
- **수정 모드**: 미배포 보드에서 장소 추가/삭제 (검색으로 장소 추가)

### 다국어 지원 (i18n)

- **4개 언어**: 한국어, English, 日本語, 中文
- react-i18next 기반, `localStorage` 영속 저장

### 유저 등급 시스템

- `free` (기본): Google AdSense 광고 표시
- `premium` (구독): 광고 제거, 추천 맛집 조기 해금 (향후 구현)

## 로컬 설정

### 백엔드 환경 변수

`.env.development` 또는 `.env` 파일:

```bash
APP_ENV=development
APP_NAME=k-daejeop
HOST=127.0.0.1
PORT=5173
LOG_LEVEL=info

KAKAO_JS_KEY=your_kakao_javascript_key
KAKAO_REST_KEY=your_kakao_rest_key

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_JWT_SECRET=your_supabase_jwt_secret
```

### 프론트엔드 환경 변수

`frontend/.env.development` 파일:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_KAKAO_JS_KEY=your_kakao_javascript_key
VITE_KAKAO_SDK_URL=https://dapi.kakao.com/v2/maps/sdk.js
```

## 실행

### 개발 (Vite dev server + FastAPI)

```bash
# 백엔드
uv sync
./scripts/serve.sh                    # FastAPI (포트 5173)

# 프론트엔드 (별도 터미널)
cd frontend
npm install
npm run dev                           # Vite dev server (포트 3000)
```

브라우저 접속: `http://localhost:3000`

### 프로덕션 빌드

```bash
cd frontend && npm run build          # → app/static/dist/ 출력
./scripts/serve.sh                    # FastAPI가 빌드 결과 서빙
```

## 테스트

```bash
# 백엔드 (pytest, 69개)
uv run pytest tests/ -v --ignore=tests/test_supabase_connection.py

# 프론트엔드 (Vitest, 211개)
cd frontend && npm test
```

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| 프론트엔드 | React 19 + TypeScript + Vite 7 |
| 상태 관리 | Zustand 5 |
| 스타일링 | Tailwind CSS v4 |
| i18n | react-i18next |
| 프론트 테스트 | Vitest + React Testing Library |
| 서버 프레임워크 | FastAPI 0.111 |
| ASGI 서버 | Uvicorn 0.30 |
| HTTP 클라이언트 | httpx 0.27 |
| 설정 관리 | pydantic 1.x (BaseSettings) |
| JWT 검증 | PyJWT 2.8 |
| 인증 | Supabase Auth (Google OAuth) |
| 데이터베이스 | Supabase (PostgreSQL + RLS) |
| 파일 스토리지 | Supabase Storage (review-photos) |
| 패키지 매니저 | uv (Python), npm (JS) |
| 폰트 | Noto Serif KR + Noto Sans KR |
| 디자인 | 따뜻한 우드톤 팔레트 (warm wood-tone) |
| 외부 API | 카카오맵 REST API / JavaScript SDK |
