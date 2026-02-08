# K-daejeop

카카오맵 API를 활용해 한국 지도 기반 검색/확대를 제공하는 프로토타입입니다.

## 구조 (FastAPI)

- `app/main.py`: 앱 생성, 라우터 등록, 정적 파일 마운트
- `app/core/config.py`: 환경 변수 설정 로딩
- `app/routers/pages.py`: HTML 페이지 렌더
- `app/routers/places.py`: 장소 검색 API
- `app/services/kakao.py`: 카카오 API 호출 클라이언트
- `app/templates/index.html`: 메인 화면 템플릿
- `app/static/`: 프론트 정적 리소스

## 비밀값 분리(서버 프록시)

- 검색은 서버가 카카오 REST API를 호출합니다.
- 클라이언트는 `/api/places`만 호출합니다.
- 카카오 JavaScript 키는 지도 렌더링에 필요하므로 브라우저에서 사용됩니다.

## 환경 분리 (dev/prod)

- 기본적으로 `APP_ENV=development`가 적용됩니다.
- 설정 로딩 우선순위: `.env.{APP_ENV}` -> `.env`
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

KAKAO_JS_KEY=your_kakao_javascript_key
KAKAO_REST_KEY=your_kakao_rest_key

KAKAO_PLACES_URL=https://dapi.kakao.com/v2/local/search/keyword.json
KAKAO_SDK_URL=https://dapi.kakao.com/v2/maps/sdk.js
KAKAO_REQUEST_TIMEOUT=7
```

## 실행 (uv)

`uv`를 사용합니다.

```bash
uv venv
uv sync
./scripts/serve.sh
```

브라우저 접속: `http://127.0.0.1:5173`
