# K-daejeop — AI Context Guide

## 프로젝트 개요
카카오맵 API + Supabase를 활용한 한국 지도 기반 **폐쇄형 맛집 리뷰 서비스**.
**React 19 + TypeScript + Vite 7** 프론트엔드 + **FastAPI** 백엔드 구조.
사용자가 음식점을 검색하고 별점(1~3)·사진·리뷰를 남기면, 10개 이상 쌓은 뒤 다른 사용자의 추천 맛집을 볼 수 있음.

## 기술 스택 & 버전

### 프론트엔드
- React 19 + TypeScript 5.9 + Vite 7
- Zustand 5 (상태 관리)
- Tailwind CSS v4 (스타일링)
- react-i18next (다국어, 4개 언어)
- @supabase/supabase-js v2 (인증 + DB + Storage)
- Vitest 4 + React Testing Library (프론트 테스트)

### 백엔드
- Python 3.9 / FastAPI 0.111 / Uvicorn 0.30
- httpx 0.27 (카카오 REST API 호출)
- pydantic 1.x BaseSettings (환경 변수 관리)
- PyJWT 2.8 (Supabase JWT HS256 검증)
- pytest 8.2 + pytest-asyncio 0.23 (백엔드 테스트)

### 공통
- 카카오맵 JavaScript SDK (지도 렌더링)
- Noto Serif KR + Noto Sans KR (Google Fonts)
- uv (Python 패키지), npm (JS 패키지)

## 아키텍처 핵심 원칙

### 보안: 서버 프록시 패턴
- 카카오 REST API 키(`KAKAO_REST_KEY`)는 서버에서만 사용. 클라이언트 → `/api/places` → 서버 → 카카오 API.
- 카카오 JS 키(`VITE_KAKAO_JS_KEY`)는 지도 렌더링용으로 브라우저에 노출됨 (정상).
- Supabase `anon key`는 공개(public)키로 브라우저에서 사용. `JWT_SECRET`은 서버에서만 사용.

### 인증 흐름 (React)
1. `useAuth` 훅: Supabase JS SDK → `signInWithOAuth({ provider: 'google' })` → Google 동의 → 세션 획득
2. `onAuthStateChange` → Zustand `authStore` 업데이트 → React 조건부 렌더링으로 LoginScreen ↔ AppLayout 전환
3. bfcache/OAuth 복원력: `sessionStorage` OAUTH_PENDING_KEY + `pageshow` 이벤트 리스너
4. 백엔드 보호 API: `Authorization: Bearer <access_token>` → PyJWT HS256 검증

### 리뷰 시스템 (Supabase 직접 접근)
- 리뷰 CRUD는 프론트엔드에서 Supabase JS SDK로 직접 수행 (RLS가 보안 담당)
- 사진은 Supabase Storage `review-photos` 버킷에 업로드 (경로: `{user_id}/{timestamp}.{ext}`)
- `services/supabase.ts` 싱글턴 클라이언트, `reviewStore` Zustand 캐시 (5분 TTL)

### 환경 변수 분리
- **백엔드**: `APP_ENV`로 `development`/`production` 구분. `.env.{APP_ENV}` → `.env` fallback. Settings `@lru_cache` 싱글턴.
- **프론트엔드**: Vite `VITE_*` 환경 변수. `frontend/.env.development` / `.env.production`. `env.ts` 타입 안전 래퍼.

### 지도 초기화 타이밍 (React)
- `App.tsx`에서 `isAuthenticated` 상태에 따라 조건부 렌더링
- `AppLayout`이 마운트될 때 `KakaoMap` 컴포넌트도 마운트 → `useEffect`에서 Kakao SDK 로드 + 지도 초기화
- 기존 `app:visible` 커스텀 이벤트 → React 조건부 렌더링으로 대체 (자연스럽게 타이밍 보장)

## 디렉토리 구조 & 역할

```
frontend/                         # React SPA
├── index.html                    # Vite 진입점 (PWA 메타 태그)
├── vite.config.ts                # Vite 설정 (React, Tailwind, FastAPI 프록시)
├── package.json
├── public/                       # manifest.json, PWA 아이콘
├── src/
│   ├── main.tsx                  # React 진입점
│   ├── App.tsx                   # isAuthenticated ? AppLayout : LoginScreen
│   ├── index.css                 # Tailwind CSS v4 @theme + 커스텀 CSS
│   ├── env.ts                    # import.meta.env 타입 래퍼
│   ├── stores/                   # Zustand 스토어
│   │   ├── authStore.ts          # user, session, tier, isAuthenticated
│   │   ├── mapStore.ts           # map 인스턴스, searchResults, markers
│   │   ├── reviewStore.ts        # 리뷰 모달/상세 상태, 캐시 (5분 TTL)
│   │   └── uiStore.ts            # myReviewsActive, tutorial, toast, userMenu
│   ├── components/
│   │   ├── LoginScreen/          # LoginScreen.tsx, LegalModal.tsx
│   │   ├── Header/               # Header.tsx, SearchBar.tsx, UserMenu.tsx
│   │   ├── Map/                  # KakaoMap.tsx (ref 기반)
│   │   ├── Reviews/              # ReviewModal, RatingSelector, PhotoUploader, DatePicker, ReviewDetail
│   │   ├── MyReviews/            # MyReviewsPanel, ClusterMap, CategoryFilter, useCluster
│   │   ├── Tutorial/             # TutorialOverlay.tsx
│   │   └── Ads/                  # AdBanner.tsx
│   ├── hooks/
│   │   ├── useAuth.ts            # OAuth + 세션 + bfcache 대응
│   │   └── useReviewedPlaces.ts  # 캐시 기반 리뷰 place_id 조회
│   ├── services/
│   │   ├── supabase.ts           # createClient 싱글턴
│   │   ├── kakao.ts              # SDK 동적 로딩
│   │   └── api.ts                # /api/places 프록시 호출
│   ├── i18n/
│   │   ├── index.ts              # react-i18next 설정
│   │   └── locales/              # ko.json, en.json, ja.json, zh.json
│   ├── utils/
│   │   ├── escapeHtml.ts         # XSS 방지 (명령형 DOM용)
│   │   ├── distance.ts           # Haversine 거리, 줌레벨 계산
│   │   └── rankFoodFirst.ts      # FD6/CE7 우선 정렬
│   └── types/
│       └── kakao.d.ts            # Kakao Maps TypeScript 선언
└── tests/                        # Vitest 프론트 테스트 (51개)

app/                              # FastAPI 백엔드
├── main.py                       # create_app(), /assets 마운트, SPA 서빙
├── core/
│   ├── config.py                 # Settings(BaseSettings), get_settings()
│   └── auth.py                   # verify_supabase_token, get_current_user
├── routers/
│   ├── health.py                 # GET /api/health
│   ├── auth.py                   # GET /api/auth/me (JWT 필수)
│   ├── pages.py                  # GET / (Vite 빌드 HTML 서빙, SPA fallback)
│   └── places.py                 # GET /api/places?query= (카카오 프록시)
├── services/
│   └── kakao.py                  # KakaoPlacesClient (httpx 기반)
└── static/
    └── dist/                     # Vite 빌드 결과 (git에서 제외)

tests/                            # pytest 백엔드 테스트 (65개)
```

## 상태 관리 (Zustand 스토어 4개)

| 스토어 | 역할 |
|--------|------|
| `authStore` | user, session, tier ('free'/'premium'), isAuthenticated, isLoading, tutorialSeen |
| `mapStore` | 카카오맵 인스턴스, 검색 결과, 마커 배열, clearMarkers() |
| `reviewStore` | 리뷰 모달 상태, 리뷰 상세 바텀시트 상태, 5분 TTL 캐시 |
| `uiStore` | myReviewsActive, showTutorial, toast (단일 토스트 + 카운터), userMenuOpen |

## 모바일 우선 원칙 (Mobile-First — 항상 적용)

> 이 서비스는 **모바일에서 주로 사용**됩니다. 모든 디자인과 기능 구현 시 모바일 환경을 최우선으로 고려하세요.

- 레이아웃: 터치 영역 충분히 확보 (버튼 최소 44px), 손가락으로 조작 가능한 크기
- 타이포그래피: 작은 화면에서도 읽기 편한 폰트 크기 (최소 14px, input 16px)
- 스크롤/스와이프: iOS Safari 특성 고려 (`position: fixed` + `inset: 0`으로 횡스크롤 차단)
- 성능: 모바일 네트워크 기준으로 API 호출 최소화, 이미지 lazy loading
- 인터랙션: hover보다 touch/tap 기반으로 설계

## 기능 추가 필수 절차 (매번 반드시 수행)

> 기능 추가·수정 시 아래 3단계를 **순서대로** 완료해야 합니다.

1. **테스트 코드 추가**:
   - 프론트엔드 변경 → `frontend/tests/`에 Vitest 테스트 추가
   - 백엔드 변경 → `tests/`에 pytest 테스트 추가
2. **전체 테스트 실행**:
   - 백엔드: `uv run pytest tests/ -q --ignore=tests/test_supabase_connection.py`
   - 프론트: `cd frontend && npm test`
3. **문서 업데이트**: `README.md`와 `CLAUDE.md`에 변경 내용 반영

## 코딩 규칙

### Python
- `from __future__ import annotations` 모든 파일 상단에
- pydantic 1.x 스타일 (`Field(env=...)`, `class Config`)
- FastAPI 의존성 주입: `Depends(get_settings)`, `Depends(get_current_user)`
- 비동기 우선 (`async def`, `httpx.AsyncClient`)

### TypeScript/React (프론트엔드)
- React 함수 컴포넌트 + Hooks 패턴
- Zustand로 전역 상태 관리 (Context 대신)
- Tailwind CSS 유틸리티 클래스 사용 (인라인 스타일 지양)
- 카카오맵 SDK: ref 기반 명령형 패턴 (`useEffect` + `mapRef`)
- `escapeHtml()` 필수 사용 (명령형 DOM 조작 시 XSS 방지)
- 디바운스 200ms로 자동완성, `searchSeqRef` 카운터로 race condition 방지
- 한글 IME: `keydown`에서 `keyCode === 229` 체크
- 토스트: `uiStore.showToast()` — 한 번에 하나만, 자동 타이머 정리

### CSS (Tailwind CSS v4)
- `index.css`의 `@theme` 블록에 디자인 토큰 정의
- z-index 레이어: header 9000, suggestions 9999, login 10000, modal-overlay 10001, modal 10002, legal 10003, tutorial 10010
- 카카오맵 오버레이 스타일 (`.rv-pin`, `.rv-cluster`, `.iw-card`)은 React 외부 DOM이므로 CSS로 관리

### 테스트
- **백엔드**: pytest + pytest-asyncio (asyncio_mode = "auto"), conftest.py에서 mock 환경변수
- **프론트**: Vitest + React Testing Library, `tests/setup.ts`에서 localStorage/env 모킹

## 주의사항

1. **pydantic 버전**: 1.x 사용 중. `BaseSettings`는 `pydantic` 패키지에서 직접 import.
2. **Supabase JWT**: HS256 알고리즘, audience="authenticated".
3. **지도 init 타이밍**: React 조건부 렌더링으로 보장. `isAuthenticated`가 true일 때만 `KakaoMap` 마운트.
4. **Vite 빌드**: `frontend/` 에서 `npm run build` → `app/static/dist/`로 출력. FastAPI가 정적 서빙.
5. **개발 서버**: Vite dev (포트 3000) + FastAPI (포트 5173) 병렬 실행. Vite에서 `/api` → FastAPI 프록시.
6. **한글 IME**: `SearchBar.tsx`에서 `keyCode === 229` 체크 + `input` 이벤트 기반 자동완성.
7. **테스트 기준**: 백엔드 65개 (pytest) + 프론트엔드 59개 (Vitest). 기능 추가 시 해당 위치에 테스트도 추가.
8. **Supabase 직접 접근**: 리뷰 CRUD와 사진 업로드는 프론트엔드에서 Supabase JS SDK로 직접 수행. RLS가 보안 담당.
9. **myreviews 클러스터링**: `useCluster.ts` 훅의 `computeClusters()` — 지리 격자 기반(`GRID_DEG` 배열). `ClusterMap.tsx`가 명령형으로 CustomOverlay 관리.
10. **플라잉 애니메이션**: `ClusterMap.tsx`에서 ref 기반 명령형 처리. `requestAnimationFrame` 두 번 감싸기.
11. **음식점 우선 정렬**: `rankFoodFirst()` 유틸이 FD6(음식점)·CE7(카페)를 앞으로 이동. 검색 + 자동완성 모두 적용.
12. **초기 줌 레벨**: `DEFAULT_LEVEL = window.innerWidth <= 640 ? 13 : 12`.
13. **검색 센터링**: `distanceKm()` + `zoomLevelForDistance()`로 줌레벨 직접 계산. `setBounds` 사용 안 함.
14. **리뷰 캐시**: `reviewStore`의 `cachedReviews` + 5분 TTL. `useReviewedPlaces` 훅이 캐시 경유.
15. **OAuth 복원력**: `useAuth.ts`에서 sessionStorage OAUTH_PENDING_KEY + pageshow 이벤트 + 10초 대기.
16. **모바일 레이아웃**: Tailwind `fixed inset-0`으로 iOS 횡스크롤 차단. `AppLayout.tsx`에서 적용.
17. **iOS 자동확대 방지**: 모바일에서 input/textarea `font-size: 1rem`(16px).
18. **카테고리 필터**: `CategoryFilter.tsx` — 전체/식당/카페/관광명소/기타. `useCluster.ts`의 `classifyCategory()`.
19. **PWA**: `frontend/public/manifest.json` + iOS 메타 태그. `viewport-fit=cover`. safe-area-inset 처리.
20. **광고**: `AdBanner.tsx` — tier 기반. free 유저만 AdSense 로드. publisher ID 플레이스홀더.
21. **디자인 팔레트**: 우드톤 (오커 #B5651D, 한지색 #FAF6F1, 원목색 #8B4513). Tailwind `@theme`에 정의.
22. **이용약관**: `LegalModal.tsx` — 로그인 화면 footer 링크로 표시. z-index 10003.
23. **리뷰 삭제**: `ReviewDetail.tsx` — confirm 후 Storage 사진 삭제 + DB 삭제 + 캐시 무효화.
24. **Tailwind CSS v4 z-index**: `@theme`에 `--z-header: 9000` 등 정의해도 유틸리티 클래스가 생성되지 않음. 반드시 **arbitrary value** 사용: `z-[9000]`, `z-[9999]`, `z-[10000]` 등. 커스텀 `@theme` z-index 변수는 참조용으로만 유지.
25. **z-index 체계 (arbitrary values)**: header `z-[9000]`, 자동완성 `z-[9999]`, login `z-[10000]`, modal-overlay `z-[10001]`, modal `z-[10002]`, legal `z-[10003]`, tutorial `z-[10010]`. 지도 래퍼에 `z-0`으로 stacking context 생성.
26. **mapRawReview**: Supabase DB 컬럼 `place_x`/`place_y`(text) → Review의 `lng`/`lat`(number) 변환 필수. `reviewStore.ts`의 `mapRawReview()` 함수가 담당. `useReviewedPlaces.ts`에서 DB 조회 후 반드시 `.map(mapRawReview)` 적용.
27. **InfoWindow 이벤트 바인딩**: Kakao Maps가 InfoWindow HTML을 DOM에 직접 삽입하므로 `querySelectorAll('.iw-card')`의 **마지막 요소**에 이벤트 위임. `SearchBar.tsx`의 `bindInfoEvents()` 참고.
28. **검색 결과 카테고리 태그**: `SearchBar.tsx`의 `CategoryTag` 컴포넌트가 FD6(음식점, 주황), CE7(카페, 앰버), AT4(관광명소, 파랑) 뱃지 표시.
29. **Vite 빌드 모드**: `vite build`는 기본 `mode=production`으로 `.env.production` 읽음. `.env.development`의 변수를 쓰려면 `npx vite build --mode development` 사용.
30. **Kakao Maps 오버레이 CSS**: `CustomOverlay`와 `InfoWindow`는 React DOM 밖에서 Kakao SDK가 직접 렌더링. Tailwind 사용 불가, `index.css`에 순수 CSS로 스타일링 필수. `.rv-pin`(개별 핀), `.rv-cluster`(클러스터), `.iw-card`(InfoWindow) 참고.
31. **핀 구조**: `.rv-pin__photo-wrap`(74px 카드) > `.rv-pin__name`(식당명) + `.rv-pin__photo`(68x68 사진) + `.rv-pin__rating`(별점) + `.rv-pin__tail`(삼각 꼬리). `drop-shadow` 필터, hover 시 확대+marquee.
32. **클러스터 구조**: `.rv-cluster__box` > `.rv-cluster__grid`(86x86 2x2 그리드) > `.rv-cluster__cell`(사진). `.rv-cluster__badge`(우상단 개수), `.rv-cluster__tail`(삼각 꼬리). 2장=나란히, 3장=1칸 빈칸, 4장=꽉 참.
33. **InfoWindow 버튼**: `.iw-card__actions`에 pill 형태 버튼(`border-radius: 9999px`, `white-space: nowrap`). `flex-wrap: wrap`으로 넘침 시 줄바꿈.
34. **내 맛집 빈 상태**: 리뷰 0개일 때 패널에 빈 상태 UI 표시 (📍 아이콘 + "아직 리뷰가 없어요" + 안내 문구). `myReviews.emptyTitle`, `myReviews.emptyDesc` i18n 키 4개 언어 지원.
35. **지도 영역 제한**: `KakaoMap.tsx`에서 `dragend`/`idle` 이벤트로 한국 영역(위도 33.0~38.7, 경도 124.5~132.0) 밖으로 이동 시 자동 복귀. 제주도, 울릉도, 독도 포함.

## Supabase 테이블 (RLS 적용)
- `reviews`: 별점(1~3), 사진URL, 리뷰텍스트, 방문일자
- `user_profiles`: tutorial_seen, tier ('free'/'premium'), 자동 생성 트리거
- Storage `review-photos`: 유저별 폴더, 공개 읽기

## 향후 확장 예정
- 리뷰 10개 달성 시 다른 사용자 추천 맛집 노출 기능
- 즐겨찾기, 검색 기록 기능
- 리뷰 편집 UI (삭제는 구현 완료)
- 유저 등급별 서비스 차별화 (premium 구독 → 광고 제거, 추천 맛집 조기 해금, 고급 통계 등)
