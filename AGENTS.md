# K-daejeop — AI Context Guide

## 프로젝트 개요
카카오맵 API + Supabase를 활용한 한국 지도 기반 **폐쇄형 맛집 리뷰 서비스**.
**React 19 + TypeScript + Vite 7** 프론트엔드 + **FastAPI** 백엔드 구조.
사용자가 음식점을 검색하고 별점(0~3)·사진·리뷰를 남기면, 10개 이상 쌓은 뒤 다른 사용자의 추천 맛집을 볼 수 있음.

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

### 인증 흐름 (React) — 콘텐츠 퍼스트
1. **첫 방문 = 자동 게스트 모드**: 세션 없으면 `loginAsGuest()` 자동 호출 → 즉시 AppLayout 렌더 (로그인 화면 없음)
2. `useAuth` 훅: Supabase JS SDK → `signInWithOAuth({ provider: 'google' })` → Google 동의 → 세션 획득
3. `onAuthStateChange` → `authStore.setSession()` → `isGuest: false`로 전환 → 게스트→인증 매끄러운 전환
4. bfcache/OAuth 복원력: `sessionStorage` OAUTH_PENDING_KEY + `pageshow` 이벤트 리스너
5. 게스트 제한: 리뷰 작성 시도 시 `LoginPromptModal` 표시 (로그인 유도)
6. 헤더에 "로그인" pill 버튼 (게스트) / UserMenu (인증 유저) 조건부 표시
7. 로그아웃 → 게스트 모드 복귀 (로그인 화면으로 돌아가지 않음)
8. 백엔드 보호 API: `Authorization: Bearer <access_token>` → PyJWT HS256 검증

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
│   ├── App.tsx                   # 항상 AppLayout (자동 게스트 모드, 로그인 화면 없음)
│   ├── index.css                 # Tailwind CSS v4 @theme + 커스텀 CSS
│   ├── env.ts                    # import.meta.env 타입 래퍼
│   ├── stores/                   # Zustand 스토어
│   │   ├── authStore.ts          # user, session, tier, isAuthenticated
│   │   ├── mapStore.ts           # map 인스턴스, searchResults, markers
│   │   ├── reviewStore.ts        # 리뷰 모달/상세 상태, 캐시 (5분 TTL)
│   │   ├── badgeStore.ts         # 뱃지판 목록, 상세, 생성, 공유코드
│   │   └── uiStore.ts            # myReviewsActive, badgePanelActive, tutorial, toast
│   ├── components/
│   │   ├── LoginScreen/          # LegalModal.tsx (이용약관 모달, LoginScreen은 미사용)
│   │   ├── LoginModal.tsx        # 모달형 로그인 (헤더 버튼/튜토리얼에서 열림)
│   │   ├── LoginPromptModal.tsx  # 로그인 유도 모달 (게스트가 리뷰 작성 시도 시)
│   │   ├── LandingContent.tsx    # SEO용 랜딩 소개 섹션 (게스트 시 하단 표시)
│   │   ├── Header/               # Header.tsx, SearchBar.tsx, UserMenu.tsx
│   │   ├── Map/                  # KakaoMap.tsx (ref 기반)
│   │   ├── Reviews/              # ReviewModal, RatingSelector, PhotoUploader, DatePicker, ReviewDetail
│   │   ├── MyReviews/            # MyReviewsPanel, ClusterMap, CategoryFilter, RatingFilter, useCluster
│   │   ├── Badges/               # BadgePanel, BadgeBoardCard, BadgeBoardCreate, BadgeBoardDetail, AddToBoardModal, PublishModal
│   │   ├── Tutorial/             # TutorialOverlay.tsx
│   │   └── Ads/                  # AdBanner.tsx
│   ├── hooks/
│   │   ├── useAuth.ts            # OAuth + 세션 + bfcache 대응
│   │   ├── useGeolocation.ts     # 브라우저 GPS 위치 획득 (실제 방문 인증용)
│   │   ├── useReviewedPlaces.ts  # 캐시 기반 리뷰 place_id 조회
│   │   └── useBoardPins.ts      # 뱃지판 지도 핀 오버레이 관리
│   ├── services/
│   │   ├── supabase.ts           # createClient 싱글턴
│   │   ├── kakao.ts              # SDK 동적 로딩
│   │   └── api.ts                # /api/places 프록시 호출
│   ├── i18n/
│   │   ├── index.ts              # react-i18next 설정
│   │   └── locales/              # ko.json, en.json, ja.json, zh.json
│   ├── utils/
│   │   ├── escapeHtml.ts         # XSS 방지 (명령형 DOM용)
│   │   ├── distance.ts           # Haversine 거리, 줌레벨 계산, isWithinVisitRange
│   │   ├── imageUrl.ts           # getThumbUrl() 썸네일 URL 변환
│   │   ├── buildReviewPin.ts     # 리뷰 핀 DOM 요소 생성 (ClusterMap용)
│   │   └── rankFoodFirst.ts      # FD6/CE7 우선 정렬
│   └── types/
│       └── kakao.d.ts            # Kakao Maps TypeScript 선언
└── tests/                        # Vitest 프론트 테스트 (184개)

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

## 상태 관리 (Zustand 스토어 5개)

| 스토어 | 역할 |
|--------|------|
| `authStore` | user, session, tier ('free'/'premium'), isAuthenticated, isLoading, tutorialSeen, isGuest, showLoginModal, showLoginPrompt |
| `mapStore` | 카카오맵 인스턴스, 검색 결과, 마커 배열, clearMarkers() |
| `reviewStore` | 리뷰 모달 상태, 리뷰 상세 바텀시트 상태, 5분 TTL 캐시 |
| `uiStore` | myReviewsActive, badgePanelActive, showTutorial, toast, userMenuOpen |
| `badgeStore` | 뱃지판 CRUD, 공유코드 검색, 배포/저장, 배포자 리뷰, 진행도 계산 |

## 모바일 우선 원칙 (Mobile-First — 항상 적용)

> 이 서비스는 **모바일에서 주로 사용**됩니다. 모든 디자인과 기능 구현 시 모바일 환경을 최우선으로 고려하세요.

- 레이아웃: 터치 영역 충분히 확보 (버튼 최소 44px), 손가락으로 조작 가능한 크기
- 타이포그래피: 작은 화면에서도 읽기 편한 폰트 크기 (최소 14px, input 16px)
- 스크롤/스와이프: iOS Safari 특성 고려 (`position: fixed` + `inset: 0`으로 횡스크롤 차단)
- 성능: 모바일 네트워크 기준으로 API 호출 최소화, 이미지 lazy loading + 업로드 시 압축 + 썸네일 분리 + 1년 HTTP 캐시
- 인터랙션: hover보다 touch/tap 기반으로 설계

## 기능 추가 필수 절차 (매번 반드시 수행)

> 기능 추가·수정 시 아래 3단계를 **순서대로** 완료해야 합니다.

1. **테스트 코드 추가**:
   - 프론트엔드 변경 → `frontend/tests/`에 Vitest 테스트 추가
   - 백엔드 변경 → `tests/`에 pytest 테스트 추가
2. **전체 테스트 실행**:
   - 백엔드: `uv run pytest tests/ -q --ignore=tests/test_supabase_connection.py`
   - 프론트: `cd frontend && npm test`
3. **모바일 우선 확인**: 이 서비스는 모바일에서 주로 사용됨을 명심하고, 모든 UI·기능이 모바일 환경에서 자연스럽게 동작하는지 반드시 검증
4. **문서 업데이트**: `README.md`와 `CLAUDE.md`에 변경 내용 반영

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
3. **지도 init 타이밍**: 자동 게스트 모드로 항상 AppLayout 렌더 → `KakaoMap` 즉시 마운트. `isLoading` 중에만 스플래시.
4. **Vite 빌드**: `frontend/` 에서 `npm run build` → `app/static/dist/`로 출력. FastAPI가 정적 서빙.
5. **개발 서버**: Vite dev (포트 3000) + FastAPI (포트 5173) 병렬 실행. Vite에서 `/api` → FastAPI 프록시.
6. **한글 IME**: `SearchBar.tsx`에서 `keyCode === 229` 체크 + `input` 이벤트 기반 자동완성.
7. **테스트 기준**: 백엔드 65개 (pytest) + 프론트엔드 268개 (Vitest). 기능 추가 시 해당 위치에 테스트도 추가.
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
36. **실제 방문 인증**: 리뷰 작성 시 `useGeolocation` 훅으로 브라우저 GPS 획득 → `isWithinVisitRange()`로 식당과 200m 이내인지 비교 → `verified_visit` boolean만 DB에 저장 (사용자 좌표는 저장하지 않음). GPS 거부 시 리뷰는 정상 저장되나 뱃지 없음. `ReviewDetail`과 `ClusterMap` 핀에 초록 뱃지 표시.
37. **Kakao SDK 조기 로딩**: `main.tsx`에서 `loadKakaoSdk()` 호출로 auth 완료 전 SDK 다운로드 시작. `index.html`에 `<link rel="preconnect" href="https://dapi.kakao.com">` 추가. Promise 캐시 기반으로 KakaoMap 컴포넌트와 안전하게 공유.
38. **내 맛집 마커 초기화**: `MyReviewsPanel` 마운트 시 `clearMarkers()` 호출하여 기존 검색 마커/InfoWindow 제거. 클러스터 핀만 표시.
39. **리뷰 상세 페이지 링크**: `ReviewDetail`에 "상세 페이지 보기" 버튼 → `https://place.map.kakao.com/{place_id}` 새 탭 열기. i18n 4개 언어 지원 (`review.viewDetail`).
40. **이미지 최적화**: 업로드 전 Canvas API로 압축 (메인: max 1200px/JPEG 80%, 썸네일: max 200px/JPEG 65%). `compressWithThumb()` in `PhotoUploader.tsx`. 썸네일은 `{timestamp}_thumb.jpg`로 별도 저장. `getThumbUrl()` 유틸(`utils/imageUrl.ts`)로 URL 변환. ClusterMap/MyReviewsPanel에서 썸네일 우선 로드 + `onerror` 폴백. `cacheControl: '31536000'` (1년, 불변 파일명).

41. **뱃지 시스템**: `BadgePanel.tsx` — 헤더 '뱃지' 탭으로 별도 패널 열기 (MyReviewsPanel과 상호배타). `badgeStore.ts`에서 상태 관리. DB 테이블 3개: `badge_boards`(뱃지판 정의), `badge_board_places`(장소 목록), `user_badges`(획득 기록). 프리미엄만 뱃지판 생성 가능, 모든 유저 참여 가능. 6자리 공유코드(`share_code`) + `is_public` 공개 목록. 진행도는 유저 reviews 테이블과 대조하여 동적 계산. 마이그레이션: `005_badge_boards.sql`, `006_badge_board_sharing.sql`, `007_fetch_creator_reviews_rpc.sql`.
42. **뱃지 컴포넌트 구조**: `BadgePanel.tsx`(메인 패널, 공유코드 입력, 내 뱃지판/둘러보기 2탭, 내 뱃지), `BadgeBoardCard.tsx`(카드+프로그레스바), `BadgeBoardDetail.tsx`(장소 목록+체크+진행도+수정모드+배포), `BadgeBoardCreate.tsx`(생성 폼, 장소 검색+추가), `AddToBoardModal.tsx`(검색결과→뱃지판 추가), `PublishModal.tsx`(배포 확인 모달).
43. **뱃지 패널 상호배타**: `uiStore.ts`에서 `badgePanelActive`와 `myReviewsActive` 상호배타 처리. 하나 열면 다른 하나 자동 닫힘.
44. **뱃지판 공유/저장**: 공유코드(6자리) 또는 공개 목록(둘러보기)으로 다른 유저의 뱃지판 발견. "내 뱃지판에 추가"로 저장 (Supabase RPC `copy_badge_board` — SECURITY DEFINER로 RLS 우회). 저장된 보드는 `source_board_id`/`source_creator_id`로 원본 추적. 저장 보드는 둘러보기 목록에서 숨김.
45. **뱃지판 배포**: 프리미엄 회원만 가능 (`tier !== 'premium'` 시 toast 안내). 모든 장소 방문 완료(100%) 필수. **월 1회 제한** (`published_at` 타임스탬프 기반, 30일 이내 배포 이력 체크). 배포 시 `is_public = true` + `published_at` 기록. 한 번 배포하면 수정 불가. `PublishModal.tsx`에서 확인.
46. **뱃지판 수정 모드**: 미배포 원본 보드만 수정 가능 (편집 버튼 표시 조건: `isOriginalCreator && !is_public && !isSavedBoard`). 수정 모드에서 장소 삭제 + 장소 검색/추가 (디바운스 300ms, `searchPlaces()` API). `addPlaceToBoard()` 호출 시 `boardPlaces` 상태도 즉시 갱신.
47. **배포자 리뷰 분리**: 저장 보드에서 장소 클릭 → 내 리뷰만 표시 (RatingTrend도 내 기록만). 배포자 리뷰는 장소 행의 "배포자 리뷰" 버튼으로 별도 접근. `fetchCreatorReviews()` — Supabase RPC `fetch_creator_reviews`로 원본 배포자의 리뷰 조회.
48. **뱃지판 생성 검색 자동스크롤**: `BadgeBoardCreate.tsx`에서 검색 결과 나타날 때 `scrollIntoView({ behavior: 'smooth', block: 'start' })`. 모바일에서 검색 결과가 스크롤 아래에 숨기는 문제 해결.
49. **review:saved 이벤트**: `ReviewModal`에서 리뷰 저장 후 `CustomEvent('review:saved')` 발행 → `BadgeBoardDetail`이 `refreshBoardPlaces()` 호출하여 진행도 실시간 반영.
50. **뱃지판 지도 핀**: 뱃지판 선택 시 모든 장소가 지도에 핀으로 표시됨. `useBoardPins` 훅 (AppLayout 레벨)이 오버레이 관리 — BadgePanel 수명주기와 분리되어 패널 닫아도 핀 유지. 리뷰한 곳은 사진+별점 핀(`buildReviewPin`), 미방문은 점선+📍 핀(`buildUnreviewedPin`). 스태거 팝인 애니메이션 + `map.setBounds()`로 전체 핀 표시. `boardPinsActive` 상태로 핀 수명 관리. 내 장소 탭 → 보드 핀 자동 해제 (상호배타).

## Supabase 테이블 (RLS 적용)
- `reviews`: 별점(0~3), 사진URL, 리뷰텍스트, 방문일자, verified_visit(실제 방문 여부)
- `user_profiles`: tutorial_seen, tier ('free'/'premium'), 자동 생성 트리거
- `badge_boards`: 뱃지판 정의 (title, description, icon_emoji, is_public, share_code, creator_id, source_board_id, source_creator_id, published_at)
- `badge_board_places`: 뱃지판 장소 목록 (board_id → place_id 매핑, place_name/address/category/x/y 캐시)
- `user_badges`: 뱃지 획득 기록 (user_id + board_id, 완료 시 INSERT)
- RPC 함수: `copy_badge_board` (SECURITY DEFINER, 보드 복사), `fetch_creator_reviews` (배포자 리뷰 조회)
- Storage `review-photos`: 유저별 폴더, 공개 읽기

56. **변경사항 공지 (ChangelogModal)**: 기능 배포 시 반드시 `ChangelogModal.tsx`의 `CHANGELOG_VERSION`을 새 날짜로 업데이트하고, `ENTRIES` 배열에 변경사항 항목 교체. i18n 4개 언어(`changelog.*` 키)도 함께 업데이트. 버전이 바뀌면 모든 유저에게 공지 모달이 1회 표시됨.
57. **검색 시 리뷰 핀 축소**: `mapStore.searchActive` 상태로 검색 활성 여부 추적. 검색 중이면 ClusterMap이 풀 핀을 숨기고 미니 원형 도트(`.rv-pin-mini`)로 대체. 미니 핀 클릭 시 풀 핀 토글. `searchActiveRef`로 줌/필터 변경 시 레이스 컨디션 방지. `buildMiniPin()`/`buildMiniCluster()` in `buildReviewPin.ts`.
58. **꼬리 CSS 이모지 기반**: 꼬리 코스메틱이 CSS clip-path 대신 이모지(❤️⭐🥢👑) 기반. `buildReviewPin.ts`에서 `rv-pin__tail--*` 클래스를 루트가 아닌 tail 요소에 분리 적용.
59. **콘텐츠 퍼스트 (로그인 화면 제거)**: 첫 방문자에게 로그인 화면 대신 자동 게스트 모드로 즉시 지도+데모 리뷰 표시. `LoginScreen.tsx`는 미사용 → `LoginModal.tsx`(모달형 로그인)으로 대체. `LoginPromptModal.tsx`는 게스트가 리뷰 작성 시도 시 로그인 유도. `LandingContent.tsx`는 SEO용 소개 섹션(게스트 시 하단 표시). 게스트 튜토리얼은 localStorage `k_tutorial_seen_guest`로 1회 표시 관리.

## 향후 확장 예정
- 리뷰 10개 달성 시 다른 사용자 추천 맛집 노출 기능
- 즐겨찾기, 검색 기록 기능
- 리뷰 편집 UI (삭제는 구현 완료)
- 유저 등급별 서비스 차별화 (premium 구독 → 광고 제거, 추천 맛집 조기 해금, 고급 통계 등)
