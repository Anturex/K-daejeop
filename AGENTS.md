# K-daejeop — AI Context Guide

## 프로젝트 개요
카카오맵 API + Supabase를 활용한 한국 지도 기반 **폐쇄형 맛집 리뷰 서비스**.
FastAPI 백엔드 + Jinja2 SSR + Vanilla JS 프론트엔드 구조.
사용자가 음식점을 검색하고 별점(1~3)·사진·리뷰를 남기면, 10개 이상 쌓은 뒤 다른 사용자의 추천 맛집을 볼 수 있음.

## 기술 스택 & 버전
- Python 3.9 / FastAPI 0.111 / Uvicorn 0.30
- httpx 0.27 (카카오 REST API 호출)
- Jinja2 3.1 (서버사이드 템플릿)
- pydantic 1.x BaseSettings (환경 변수 관리)
- PyJWT 2.8 (Supabase JWT HS256 검증)
- Supabase JS SDK v2 (프론트엔드 인증 + DB + Storage)
- 카카오맵 JavaScript SDK (지도 렌더링)
- pytest 8.2 + pytest-asyncio 0.23 (테스트)
- Noto Serif KR + Noto Sans KR (Google Fonts, 제목 세리프 + 본문 산세리프)
- uv (패키지 매니저)

## 아키텍처 핵심 원칙

### 보안: 서버 프록시 패턴
- 카카오 REST API 키(`KAKAO_REST_KEY`)는 서버에서만 사용. 클라이언트 → `/api/places` → 서버 → 카카오 API.
- 카카오 JS 키(`KAKAO_JS_KEY`)는 지도 렌더링용으로 브라우저에 노출됨 (정상).
- Supabase `anon key`는 공개(public)키로 브라우저에서 사용. `JWT_SECRET`은 서버에서만 사용.

### 인증 흐름
1. 프론트엔드: Supabase JS SDK → `signInWithOAuth({ provider: 'google' })` → Google 동의 → Supabase 콜백 → 세션 획득
2. 프론트엔드: `onAuthStateChange` → 로그인 화면 ↔ 앱 화면 전환
3. 백엔드 보호 API 호출 시: `Authorization: Bearer <access_token>` → `core/auth.py`의 `verify_supabase_token`이 PyJWT로 HS256/audience=authenticated 검증
4. `get_current_user` (필수 인증) / `get_optional_user` (선택 인증) FastAPI 의존성

### 리뷰 시스템 (Supabase 직접 접근)
- 리뷰 CRUD는 프론트엔드에서 Supabase JS SDK로 직접 수행 (RLS가 보안 담당)
- 사진은 Supabase Storage `review-photos` 버킷에 업로드 (경로: `{user_id}/{timestamp}.{ext}`)
- `reviews.js`에서 `window.__getSupabase()`로 supabase 클라이언트 접근
- DB 스키마: `supabase/migrations/001_reviews_and_profiles.sql`

### 환경 변수 분리
- `APP_ENV` 환경 변수로 `development` / `production` 구분
- 설정 로딩: `.env.{APP_ENV}` → `.env` 순으로 fallback
- `.env.*` 파일은 `.gitignore`에 포함, `.env.*.example`은 추적됨
- Settings는 `@lru_cache`로 싱글턴 캐싱

### 지도 초기화 타이밍
- 로그인 전에는 `#app`이 `hidden` → 카카오맵 컨테이너 크기 0px
- `auth.js`가 로그인 완료 후 `app:visible` 커스텀 이벤트 발행
- `main.js`가 `app:visible`을 수신하여 지도 초기화 또는 `relayout()` + 재센터링
- 이 순서를 바꾸면 지도 중심이 일본으로 밀림 (절대 변경 금지)

## 디렉토리 구조 & 역할

```
app/
├── main.py              # create_app() 팩토리, 라우터 등록, static 마운트
├── core/
│   ├── config.py        # Settings(BaseSettings), get_settings(), _resolve_env_file()
│   └── auth.py          # verify_supabase_token, get_current_user, get_optional_user
├── routers/
│   ├── health.py        # GET /api/health
│   ├── auth.py          # GET /api/auth/me (JWT 필수)
│   ├── pages.py         # GET / (Jinja2 렌더링, 캐시 버스터)
│   └── places.py        # GET /api/places?query= (카카오 프록시)
├── services/
│   └── kakao.py         # KakaoPlacesClient (httpx 기반)
├── static/
│   ├── i18n.js          # 다국어 번역 사전 (ko/en/ja/zh), 언어 선택 컴포넌트
│   ├── auth.js          # Supabase 인증, 화면 전환, 튜토리얼 상태 체크, tier 조회
│   ├── main.js          # 지도 초기화, 검색, 자동완성, 마커, 리뷰 버튼
│   ├── reviews.js       # 리뷰 모달 (별점·사진·날짜·텍스트), Supabase CRUD
│   ├── myreviews.js     # 내 맛집 클러스터 맵 (클러스터링 + 플라잉 애니메이션 + 사이드 패널)
│   ├── reviewCache.js   # 리뷰 세션 캐시 (DB 호출 최소화, 5분 TTL)
│   ├── tutorial.js      # 온보딩 튜토리얼 5단계 카드
│   ├── ads.js           # Google AdSense 광고 (tier 기반 표시/숨김)
│   └── styles.css       # 디자인 토큰, 로그인, 앱, 리뷰, 튜토리얼, 언어 선택, 광고 스타일
└── templates/
    └── index.html       # login-screen + app + review-modal + tutorial
supabase/
└── migrations/
    ├── 001_reviews_and_profiles.sql  # reviews, user_profiles, storage 스키마
    └── 002_user_tier.sql             # user_profiles에 tier 컬럼 추가
```

## 모듈 간 통신

### JS 모듈 공유 패턴
- `auth.js`: supabase 클라이언트 생성 → `window.__getSupabase()` 노출, 유저 등급 → `window.__getUserTier()` 노출
- `auth.js`: 튜토리얼 저장 → `window.__markTutorialSeen()` 노출
- `main.js`: 리뷰 모달 열기 → `window.__openReviewModal(place)` 호출
- `main.js`: 지도 인스턴스 → `window.__getMap()` 노출 (initMap 이후)
- `main.js`: 검색 마커 제거 → `window.__clearSearchMarkers()` 노출
- `myreviews.js`: 내 맛집 모드 → `window.__activateMyReviews()` / `window.__deactivateMyReviews()` / `window.__refreshMyReviews()`
- `myreviews.js`: 사이드 패널 → `showPanel()` / `hidePanel()` / `renderPanel()` / `groupByRegion()` / `extractRegion(address)`
- `i18n.js`: 번역 API → `window.__i18n = { t, tf, setLang, getLang, applyTranslations }` 노출
- `ads.js`: `app:visible` 이벤트 수신 → tier 확인 → free면 AdSense 로드 + 광고 슬롯 활성화
- 커스텀 이벤트: `app:visible`, `tutorial:show`, `review:saved`, `lang:changed`

### Supabase 테이블 (RLS 적용)
- `reviews`: 별점(1~3), 사진URL, 리뷰텍스트, 방문일자
- `user_profiles`: tutorial_seen 플래그, tier 등급('free'/'premium'), 자동 생성 트리거
- Storage `review-photos`: 유저별 폴더, 공개 읽기

## 모바일 우선 원칙 (Mobile-First — 항상 적용)

> 이 서비스는 **모바일에서 주로 사용**됩니다. 모든 디자인과 기능 구현 시 모바일 환경을 최우선으로 고려하세요.

- 레이아웃: 터치 영역 충분히 확보 (버튼 최소 44px), 손가락으로 조작 가능한 크기
- 타이포그래피: 작은 화면에서도 읽기 편한 폰트 크기 (최소 14px)
- 스크롤/스와이프: iOS Safari 특성 고려 (`position: fixed` + `inset: 0`으로 횡스크롤 차단)
- 성능: 모바일 네트워크 기준으로 API 호출 최소화, 이미지 lazy loading
- 인터랙션: hover보다 touch/tap 기반으로 설계, 터치 이벤트 핸들링 포함

## 기능 추가 필수 절차 (매번 반드시 수행)

> 기능 추가·수정 시 아래 3단계를 **순서대로** 완료해야 합니다.

1. **테스트 코드 추가**: 새 기능의 동작을 검증하는 테스트를 `tests/` 에 추가
   - JS/CSS 변경 → `test_myreviews_ui.py` 또는 `test_reviews_ui.py`에 문자열 포함 여부 검증
   - Python 변경 → 해당 라우터/서비스 테스트 파일에 추가
2. **전체 테스트 실행**: `uv run pytest tests/ -q --ignore=tests/test_supabase_connection.py` 전부 통과 확인
3. **문서 업데이트**: `README.md`(사용자용)와 `CLAUDE.md`(AI 컨텍스트)에 변경 내용 반영, 테스트 수 갱신

## 코딩 규칙

### Python
- `from __future__ import annotations` 모든 파일 상단에
- pydantic 1.x 스타일 (`Field(env=...)`, `class Config`)
- FastAPI 의존성 주입: `Depends(get_settings)`, `Depends(get_current_user)`
- 비동기 우선 (`async def`, `httpx.AsyncClient`)
- 테스트: 변경 시 반드시 관련 테스트 추가/수정, 테스트 실행 후 전체 통과 확인

### JavaScript (프론트엔드)
- Vanilla JS (프레임워크 없음), ES module (`type="module"`)
- 카카오맵 SDK는 전역 `window.kakao` 사용 (ES module 아님)
- `escapeHtml()` 필수 사용 (XSS 방지)
- 디바운스 200ms (`DEBOUNCE_MS`)로 자동완성 API 호출 제어
- `searchSeq` 카운터로 stale 응답 무시 (race condition 방지)
- 토스트는 한 번에 하나만 표시, `clearTimeout`으로 이전 타이머 정리

### CSS
- 디자인 토큰은 `:root` CSS 변수로 관리
- BEM-like 클래스 네이밍 (`block__element`, `block--modifier`)
- `.is-*` 상태 클래스 (`is-visible`, `is-open`, `is-active`, `is-leaving`)
- z-index: 헤더 9000, 자동완성 9999, 로그인 화면 10000, 리뷰 모달 10001~10002, 튜토리얼 10010

### 테스트
- pytest + pytest-asyncio (asyncio_mode = "auto")
- conftest.py에서 mock 환경변수 설정 (`os.environ.setdefault`)
- `get_settings.cache_clear()` 매 테스트마다 자동 실행 (autouse fixture)
- 외부 API 호출 테스트(Supabase 연결)는 `test_supabase_connection.py`에 분리

## 주의사항

1. **pydantic 버전**: 1.x 사용 중. `BaseSettings`는 `pydantic` 패키지에서 직접 import. 2.x의 `pydantic-settings`가 아님.
2. **Supabase JWT**: HS256 알고리즘, audience="authenticated". RS256 아님.
3. **지도 init 순서**: `app:visible` 이벤트 후에만 initMap 호출. DOMContentLoaded에서 호출하면 안 됨.
4. **캐시 버스팅**: `pages.py`의 `_CACHE_BUSTER`(서버 시작 타임스탬프)를 CSS/JS URL에 `?v=` 파라미터로 붙임.
5. **한글 IME**: `keydown`에서 `keyCode === 229` 체크 필수. `input` 이벤트는 IME 완료 후에도 발생하므로 자동완성 트리거로 적합.
6. **테스트 필수**: 모든 변경 후 `uv run pytest tests/ -v` 실행. `test_supabase_connection.py`는 실제 네트워크 필요 시 `--ignore`로 제외 가능.
7. **리뷰 모달 z-index**: 오버레이 10001, 모달 10002. 로그인 화면(10000)보다 위.
8. **Supabase 직접 접근**: 리뷰 CRUD와 사진 업로드는 프론트엔드에서 Supabase JS SDK로 직접 수행. RLS가 보안 담당.

9. **myreviews 클러스터링**: 지리 격자 기반(`GRID_DEG` 배열, 줌레벨 인덱스). `Math.floor(lat/grid), Math.floor(lng/grid)` 키로 그룹화. `fitBounds` 후 `idle` 이벤트 이전에는 `zoom_changed` 무시 (`initialRenderDone` 플래그).
10. **플라잉 애니메이션**: `animateTransition()`은 구 클러스터와 신 클러스터를 geo 거리로 매칭 후 CSS `translate + scale` 트랜지션 적용. `requestAnimationFrame`을 두 번 감싸야 `transition: none`이 적용된 후 애니메이션이 실행됨. 픽셀 좌표 변환은 `containerPointFromCoords` → `containerPixelFromCoords` 순서로 시도 (API 버전 차이 대응).
11. **사이드 패널 드릴다운**: Level 0 = 지역 목록(`renderPanel`), Level 1 = 지역 내 장소 목록(`renderPanelLevel1`). 지역 클릭 → Level 1, 뒤로가기 버튼 → `renderPanel()` 호출. Level 1 장소 클릭 → `myMap.setCenter/setLevel(3)` + `showDetail(cluster)`.
12. **같은 장소 여러 리뷰**: `place_id`로 중복 제거 후 최신순 정렬. 핀 클릭 시 `showDetail(cluster)`에 전체 리뷰 배열 전달. `detailIdx` 로 현재 인덱스 관리, `review-detail-prev/next` 버튼으로 스와이프. 클러스터 배지는 항상 표시 (`count > MAX_CLUSTER_PHOTOS` 조건 제거).
13. **인포윈도우 닫기**: `buildInfoContent`에 `.iw-card__close-btn` 추가. 이벤트 위임(`bindEvents`)으로 `infoWindow.close()` 처리.
14. **Kakao Maps `addListenerOnce` 미존재**: `kakao.maps.event`에는 `addListenerOnce`가 없음. 수동 once 패턴 사용: `addListener` + 콜백 내 `removeListener`. `idle` 미발생 대비 setTimeout 폴백도 추가 (`idleRendered` 플래그로 중복 방지). `main.js`도 동일하게 적용.
15. **테스트 기준 (381개)**: PWA + 카테고리 필터 + i18n 관광명소 강조 + 자동완성 버그 수정 + 리뷰 캐시 + 리뷰 모달 safe-area + 검색 센터링(InfoWindow 순서) + iOS 자동확대 방지(검색 input+textarea) + 광고 배너 높이 제한 + 리뷰 삭제 테스트 추가. 기능 추가 시 해당 파일에 테스트도 추가.
16. **모바일 레이아웃**: `@media (max-width: 640px)`에서 `html { position: fixed }` + `.app { display: flex !important; position: fixed; inset: 0 }`으로 iOS 횡스크롤 완전 차단. `overflow-x: hidden`만으로는 iOS Safari에서 동작 안 함.
17. **바텀시트 스와이프**: `initPanelSwipe()`가 `.my-reviews-panel__header`에 touch 이벤트 등록. 스와이프 > 120px이면 `hidePanel()`만 호출 (핀 유지). 완전 비활성화는 별 버튼 재클릭. 드래그 중 `panel.style.transition = "none"`, 손 떼면 `""`로 복원.
18. **음식점 우선 정렬**: `rankFoodFirst(docs)`가 Kakao Places 결과에서 `category_group_code` FD6(음식점)·CE7(카페)를 앞으로 이동. `doSearch`와 자동완성 두 곳에 적용.
19. **핀 식당명 표시**: `buildPin()`에서 `.rv-pin__name > span` 추가. 5자 이하는 `rv-pin--short-name` 클래스로 `text-align: center`, 긴 이름은 hover 시 CSS `@keyframes rv-name-scroll` (alternate infinite). `min(0px, calc(-100% + 64px))`으로 짧은 이름은 애니메이션 없이 고정.
20. **초기 줌 레벨**: `DEFAULT_LEVEL = window.innerWidth <= 640 ? 13 : 12`. 모바일 작은 화면에서 동일 레벨이 더 확대되어 보이는 점 보정.
21. **파란 검색 원 제거**: `highlightArea()` / `highlightCircle` / `clearHighlight()` / `kakao.maps.Circle` 전부 삭제. 검색 결과 표시 시 원이 표시되지 않음.
22. **검색 결과 내 리뷰 뱃지**: `fetchMyReviewedIds(placeIds)`가 Supabase에서 현재 유저의 리뷰 `place_id`를 조회. `doSearch` 마커 렌더링 전 호출. 마커 탭 후 인포윈도우 카드에 `.iw-card__reviewed`로 "⭐ 내가 리뷰한 곳" / "⭐ N번 방문한 곳" 표시. 마커 위 오버레이 뱃지는 지도를 가려 제거.
23. **모바일 OAuth 2회 클릭 문제**: ngrok 무료 플랜 최초 방문 시 인터스티셜 페이지가 `?code=` 파라미터를 제거해 PKCE 교환 실패. iOS Safari bfcache도 동일 증상. 수정: (1) `handleGoogleLogin`에서 `sessionStorage.setItem(OAUTH_PENDING_KEY, "1")` 설정, (2) `init()`에서 `hadOAuthPending` 감지 → 10초 대기 유지, (3) `pageshow` 핸들러로 bfcache 복원 대응, (4) `onAuthStateChange` catch-all else 제거 → `INITIAL_SESSION`/`SIGNED_OUT`만 명시적 처리.

24. **다국어(i18n) 지원**: `i18n.js`에 4개 언어(ko/en/ja/zh) 번역 사전, `t(key)`/`tf(key, ...args)` API, `data-i18n`/`data-i18n-html`/`data-i18n-placeholder` DOM 워커. 언어 선택 pill 버튼(`.lang-selector`)이 로그인 카드와 튜토리얼 카드 상단 우측에 표시. 메인 앱 화면에서는 유저 메뉴 드롭다운 내 언어 항목(`.user-menu__lang`)으로 변경 가능. `localStorage` `k_lang` 키로 영속 저장. `lang:changed` 커스텀 이벤트로 동적 갱신. 스크립트 로드 순서: i18n.js → auth.js → reviewCache.js → main.js → reviews.js → tutorial.js → myreviews.js → ads.js.
25. **유저 등급(tier) 시스템**: `user_profiles.tier` 컬럼 (`'free'` 기본, `'premium'` 구독). `auth.js`가 로그인 시 `checkTutorialStatus()`에서 tier도 함께 조회 → `window.__getUserTier()` 노출. 향후 등급별 서비스 차별화 설계 시 참고: 광고 제거(premium), 추천 맛집 조기 해금, 리뷰 통계/분석 기능 등. 마이그레이션: `supabase/migrations/002_user_tier.sql`. 기능 추가 시 `tier` 값에 따른 분기 로직을 고려할 것.
26. **Google AdSense 광고**: `ads.js`가 `app:visible` 이벤트 후 tier 확인 → free 유저만 AdSense 스크립트 로드 + 광고 슬롯 활성화. 광고 위치: 화면 하단 배너(`#ad-banner`, `.ad-slot--banner`, z-index 8999), 내 맛집 패널 하단(`#ad-panel`, `.ad-slot--panel`). `body.has-ads` 클래스로 지도/패널 하단 여백 확보. AdSense publisher ID는 `ca-pub-XXXXXXXXXXXXXXXX` 플레이스홀더 — 승인 후 교체 필요.
27. **디자인 팔레트**: 우드톤 (오커 #B5651D 메인 액센트, 한지색 #FAF6F1 배경, 원목색 #8B4513 다크). Noto Serif KR(제목) + Noto Sans KR(본문) 폰트 조합.
28. **카테고리 필터**: 내 맛집 패널에 카테고리 필터 칩 (전체/식당/카페/관광명소/기타). `CATEGORY_MAP`으로 `place_category` 값("음식점"→restaurant, "카페"→cafe, "관광명소"→attraction, 기타→etc) 매핑. `activeCategory` 상태로 `getFilteredReviews()` → `computeClusters()` + `renderPanel()` 동기화. 칩 클릭 시 지도 핀과 패널 목록 동시 필터링. 비활성화 시 `resetCategoryFilter()`로 "전체"로 복원. `updateCategoryBadges()`로 고유 장소 수 카운트 뱃지 표시.
29. **PWA (홈화면 앱)**: `manifest.json`(display: standalone) + iOS 메타 태그(`apple-mobile-web-app-capable`, `black-translucent` 상태바). `viewport-fit=cover`로 노치 디바이스 전체 화면 지원. `env(safe-area-inset-bottom)`으로 배너 광고·리뷰 상세 하단 패딩 처리. 아이콘: 192px, 256px, 512px 3종.
30. **i18n 관광명소·기여 강조**: 4개 언어 모두 로그인 화면·검색 placeholder·튜토리얼에서 "음식점·카페·관광명소" 명시, "리뷰 기여 → 추천 해금" 메시지 강조.
31. **자동완성 직접 렌더링**: `selectSuggestion()`이 `doSearch()` 대신 `showSelectedPlace(place)`를 호출. 선택한 장소 객체를 그대로 사용해 API 재호출 없이 마커와 인포윈도우를 즉시 표시. 주차장 등 관련 장소로 잘못 이동하는 버그 수정.
32. **리뷰 모달 모바일 횡스크롤 방지**: 520px 이하에서 `.review-modal` 및 `.review-modal__body`에 `overflow-x: hidden` 적용.
33. **리뷰 캐시 (`reviewCache.js`)**: 세션 중 내 리뷰를 메모리 캐싱 (5분 TTL). `window.__reviewCache` API — `getMyReviews(forceRefresh?)`, `invalidate()`, `getReviewedPlaceIds(placeIds)`, `getVisitCount(placeId)`. `myreviews.js`(activate/refresh), `main.js`(fetchMyReviewedIds), `reviews.js`(loadVisitCount) 모두 캐시 경유. 리뷰 저장 시 `invalidate()` → 다음 조회에서 DB 재로드. 일반 사용 시 DB 호출 ~15회 → ~2회로 감소.
34. **검색 지도 센터링 (setBounds 제거)**: `setBounds`는 내부 비동기 애니메이션이 `setCenter`를 덮어쓰는 문제가 있어 완전 제거. 대신 `distanceKm()`로 결과 분포 거리를 측정해 줌 레벨을 직접 계산(`maxDist > 10 → level 7, > 3 → 6, > 1 → 5, > 0.5 → 4, else → 3`). `setCenter(focusPos)` + `setLevel(level)`로 즉시 텔레포트. InfoWindow는 `setTimeout(100ms)` 후 열어 렌더 완료 후 auto-pan 발동. `renderPlace()`에서 InfoWindow 자동 열기도 제거 → `return { marker, content, pos }` 반환.
35. **iOS 자동확대 방지**: 모바일(640px 이하)에서 `.search input`과 `.review-textarea`의 `font-size`를 `1rem`(16px)으로 설정. iOS Safari는 `font-size < 16px`인 input/textarea 포커스 시 자동 zoom-in하여 뷰포트 확대 → 이후 열리는 리뷰 모달에 횡스크롤 발생.
36. **리뷰 모달 safe-area**: 모바일에서 `max-height: calc(100dvh - env(safe-area-inset-top, 0px))`로 Dynamic Island/노치 영역을 피함.
37. **리뷰 삭제**: 리뷰 상세 패널 하단에 삭제 버튼(`#review-detail-delete`). `myreviews.js`의 `deleteReview()`가 `confirm()` 확인 후 Supabase Storage 사진 삭제 + DB 리뷰 삭제 + 캐시 무효화 + UI 갱신. RLS `reviews_delete_own`/`storage_delete_own` 정책이 보안 담당. i18n 키: `review.delete`, `review.deleteConfirm`, `review.deleted`.

## 향후 확장 예정
- 리뷰 10개 달성 시 다른 사용자 추천 맛집 노출 기능
- 즐겨찾기, 검색 기록 기능
- 리뷰 편집 UI (삭제는 구현 완료)
- 유저 등급별 서비스 차별화 (premium 구독 → 광고 제거, 추천 맛집 조기 해금, 고급 통계 등)
