# 머묾 MVP FastAPI

Supabase anon key + RLS select 기반 공개 시연용 백엔드입니다.

이번 버전은 Vite 프론트엔드와 연결하기 쉽게 다음 내용을 반영했습니다.

- FastAPI 기본 실행 포트: `8000`
- Vite 기본 실행 포트: `5173`
- CORS 허용: `localhost`, `127.0.0.1`, `172.*`, `10.*`, `192.168.*` 개발 주소
- 기존 경로와 `/api`, `/api/v1` prefix 경로 동시 지원
  - `/regions` + `/api/regions`
  - `/scores` + `/api/scores`
  - `/scores/{region_id}` + `/api/scores/{region_id}`
  - `/presets` + `/api/presets`
  - `/health` + `/api/health` + `/api/v1/health`
- 서버 추천 계산 API 추가
  - `/recommendations` + `/api/recommendations` + `/api/v1/recommendations`
- 추천 응답 네이버지도 연결 필드 추가
  - `parentRegionNameKo`, `fullRegionNameKo`, `naverMap.webUrl`, `naverMap.appUrl`
- 추천 조회용 View 보완 SQL 추가
  - `sql/20260508_update_v_region_metric_scores_for_naver_map.sql`
- Windows 실행용 `run_backend.bat` 추가
- Git Bash/macOS/Linux 실행용 `run_backend.sh` 추가

## 엔드포인트 요약

| 기능 | Method | Path | 대체 Path |
|---|---:|---|---|
| API 상태 | GET | `/` | `/api` |
| 지역 목록 조회 | GET | `/regions` | `/api/regions`, `/api/v1/regions` |
| 전체 지표 점수 조회 | GET | `/scores` | `/api/scores`, `/api/v1/scores` |
| 지역 상세 보기 | GET | `/scores/{region_id}` | `/api/scores/{region_id}`, `/api/v1/scores/{region_id}`, `/api/v1/regions/{region_id}/details` |
| 프리셋 조회 | GET | `/presets` | `/api/presets`, `/api/v1/presets` |
| 추천 프리셋 조회 | GET | `/recommendations/presets` | `/api/recommendations/presets`, `/api/v1/recommendations/presets` |
| 추천 랭킹 산출 | POST | `/recommendations` | `/api/recommendations`, `/api/v1/recommendations` |
| 헬스 체크 | GET | `/health` | `/api/health`, `/api/v1/health` |
| Swagger 문서 | GET | `/docs` | - |

> 카테고리 점수 계산 / finalScore / TOP 5는 FastAPI의 `/recommendations` API에서도 서버 기준으로 계산할 수 있습니다. 프론트가 `/scores`를 한 번 받아 로컬에서 즉시 재계산하는 v1.2 방식과도 병행 가능합니다.

## v1.2.1 네이버지도 연결 보완

추천 카드에서 바로 네이버지도 검색으로 이동할 수 있도록 추천 응답과 점수 조회 응답에 지역 컨텍스트 필드를 추가했습니다.

- 시도(`sido`): `regionNameKo`를 검색어로 사용합니다. 예: `제주특별자치도`
- 시군구(`sigungu`): `parentRegionNameKo + " " + regionNameKo`를 검색어로 사용합니다. 예: `경기도 수원시`
- 신규 DB View 컬럼: `parent_region_id`, `parent_region_name_ko`, `full_region_name_ko`
- 신규 응답 필드: `regionId`, `regionNameKo`, `regionNameEn`, `level`, `parentRegionId`, `parentRegionNameKo`, `fullRegionNameKo`, `naverMap`
- DB View가 아직 배포되지 않은 환경에서는 기존 select로 fallback하여 API 자체는 계속 응답합니다. 단, 이 경우 시군구의 상위 시도명은 포함되지 않을 수 있습니다.

Supabase SQL Editor에서 아래 파일을 실행한 뒤 백엔드를 재시작하세요.

```text
sql/20260508_update_v_region_metric_scores_for_naver_map.sql
```

### 추천 응답 네이버지도 필드 예시

```json
{
  "rank": 1,
  "region_id": "41110",
  "region_name_ko": "수원시",
  "region_level": "sigungu",
  "regionId": "41110",
  "regionNameKo": "수원시",
  "parentRegionNameKo": "경기도",
  "fullRegionNameKo": "경기도 수원시",
  "level": "sigungu",
  "finalScore": 87.42,
  "naverMap": {
    "query": "경기도 수원시",
    "webUrl": "https://map.naver.com/p/search/%EA%B2%BD%EA%B8%B0%EB%8F%84%20%EC%88%98%EC%9B%90%EC%8B%9C",
    "appUrl": "nmap://search?query=%EA%B2%BD%EA%B8%B0%EB%8F%84%20%EC%88%98%EC%9B%90%EC%8B%9C&appname=meomum"
  }
}
```

## 서버 추천 계산 API

이번 버전에서는 사용자가 제공한 프리셋 가중치를 FastAPI에 반영했습니다.

| preset_id | 유형 | 교통 | 문화·여가·디지털 | 생활편의 | 안전 | 자연 |
|---|---|---:|---:|---:|---:|---:|
| `default` | 기본값 | 0.15 | 0.25 | 0.28 | 0.17 | 0.15 |
| `foreign_tourist` | 해외 관광객 | 0.10 | 0.30 | 0.25 | 0.18 | 0.17 |
| `remote_worker` | 원격근무자 | 0.18 | 0.22 | 0.30 | 0.15 | 0.15 |
| `active_senior` | 액티브 시니어 | 0.12 | 0.28 | 0.25 | 0.15 | 0.20 |
| `culture_single_couple` | 부부/1인 문화생활 | 0.15 | 0.32 | 0.23 | 0.12 | 0.18 |

### 프리셋 기준 추천 요청

```bash
curl -X POST "http://127.0.0.1:8000/recommendations" \
  -H "Content-Type: application/json" \
  -d '{"preset_id":"foreign_tourist","limit":5}'
```

### 사용자 직접 가중치 기준 추천 요청

```bash
curl -X POST "http://127.0.0.1:8000/recommendations" \
  -H "Content-Type: application/json" \
  -d '{
    "weights": {
      "traffic": 0.10,
      "culture": 0.30,
      "convenience": 0.25,
      "safety": 0.18,
      "nature": 0.17
    },
    "limit": 5
  }'
```

> `weights`는 0~1 또는 0~100 방식 모두 허용합니다. FastAPI에서 자동 정규화합니다.

### 응답 예시

```json
{
  "preset_id": "foreign_tourist",
  "weights": {
    "traffic": 0.1,
    "culture": 0.3,
    "convenience": 0.25,
    "safety": 0.18,
    "nature": 0.17
  },
  "count": 5,
  "recommendations": [
    {
      "rank": 1,
      "region_id": "11",
      "region_name_ko": "서울특별시",
      "region_level": "sido",
      "regionId": "11",
      "regionNameKo": "서울특별시",
      "fullRegionNameKo": "서울특별시",
      "level": "sido",
      "naverMap": {
        "query": "서울특별시",
        "webUrl": "https://map.naver.com/p/search/%EC%84%9C%EC%9A%B8%ED%8A%B9%EB%B3%84%EC%8B%9C",
        "appUrl": "nmap://search?query=%EC%84%9C%EC%9A%B8%ED%8A%B9%EB%B3%84%EC%8B%9C&appname=meomum"
      },
      "finalScore": 86.42,
      "category_scores": {
        "traffic": 90.1,
        "culture": 92.4,
        "convenience": 88.2,
        "safety": 73.6,
        "nature": 62.7
      },
      "reasons": [
        "숙박·문화·통신·여가 인프라가 좋아 장기 체류에 유리합니다.",
        "의료·약국·생활 인프라 접근성이 좋아 장기간 머물기 편합니다."
      ]
    }
  ]
}
```

### 프론트엔드 fetch 예시

```javascript
const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"

const result = await fetch(`${API}/recommendations`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ preset_id: "foreign_tourist", limit: 5 }),
}).then((r) => r.json())

console.log(result.recommendations)
```


## 실행 방법

### 1. 백엔드 실행

```bash
cd fastapi_ver2
pip install -r requirements.txt
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

또는 Windows에서는 파일을 더블클릭하거나 터미널에서 실행하세요.

```bat
run_backend.bat
```

Git Bash/macOS/Linux에서는 다음도 가능합니다.

```bash
./run_backend.sh
```

정상 실행되면 아래 주소로 확인합니다.

```text
http://127.0.0.1:8000/docs
http://127.0.0.1:8000/health
```

### 2. 프론트엔드 실행

프론트엔드는 기존처럼 Vite 기본 포트 `5173`으로 실행합니다.

```bash
npm run dev
```

프론트 `.env` 또는 `.env.local`에는 백엔드 주소를 이렇게 넣으세요.

```env
VITE_API_URL=http://127.0.0.1:8000
```

프론트 fetch 예시:

```javascript
const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"

const { regions } = await fetch(`${API}/regions`).then((r) => r.json())
const { scores } = await fetch(`${API}/scores`).then((r) => r.json())
const { presets } = await fetch(`${API}/recommendations/presets`).then((r) => r.json())
const { recommendations } = await fetch(`${API}/recommendations`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ preset_id: "default", limit: 5 }),
}).then((r) => r.json())
```

프론트 코드가 `/api` prefix를 쓰고 있다면 아래처럼도 작동합니다.

```javascript
const { regions } = await fetch(`${API}/api/regions`).then((r) => r.json())
```

## 환경변수

`.env.example`을 `.env`로 복사해서 수정할 수 있습니다.

```bash
cp .env.example .env
```

```env
SUPABASE_URL=https://flqsagpixjplyblqhlph.supabase.co
SUPABASE_ANON_KEY=...
API_HOST=127.0.0.1
API_PORT=8000
FRONTEND_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://172.30.1.53:5173
```

## 주의: 5173 포트는 프론트 전용

아래처럼 백엔드를 `5173`으로 실행하면 Vite 프론트와 포트가 충돌하거나 API 연결이 꼬일 수 있습니다.

```bash
# 하지 마세요
uvicorn main:app --reload --port 5173
```

백엔드는 아래처럼 실행하세요.

```bash
uvicorn main:app --reload --port 8000
```

## 주요 응답 예시

### GET /regions

```json
{
  "count": 17,
  "regions": [
    {
      "region_id": "11",
      "region_name_ko": "서울특별시",
      "region_level": "sido",
      "regionId": "11",
      "regionNameKo": "서울특별시",
      "fullRegionNameKo": "서울특별시",
      "level": "sido",
      "naverMap": {
        "query": "서울특별시",
        "webUrl": "https://map.naver.com/p/search/%EC%84%9C%EC%9A%B8%ED%8A%B9%EB%B3%84%EC%8B%9C",
        "appUrl": "nmap://search?query=%EC%84%9C%EC%9A%B8%ED%8A%B9%EB%B3%84%EC%8B%9C&appname=meomum"
      }
    }
  ]
}
```

### GET /scores

```json
{
  "count": 340,
  "scores": [
    {
      "region_id": "11",
      "region_name_ko": "서울특별시",
      "full_region_name_ko": "서울특별시",
      "fullRegionNameKo": "서울특별시",
      "naverMap": {
        "query": "서울특별시",
        "webUrl": "https://map.naver.com/p/search/%EC%84%9C%EC%9A%B8%ED%8A%B9%EB%B3%84%EC%8B%9C",
        "appUrl": "nmap://search?query=%EC%84%9C%EC%9A%B8%ED%8A%B9%EB%B3%84%EC%8B%9C&appname=meomum"
      },
      "category_id": "traffic",
      "metric_id": "bus_accessibility",
      "raw_value": 42.3,
      "score_100": 78.5
    }
  ]
}
```

### GET /scores/11

```json
{
  "region_id": "11",
  "region_name_ko": "서울특별시",
  "fullRegionNameKo": "서울특별시",
  "naverMap": {
    "query": "서울특별시",
    "webUrl": "https://map.naver.com/p/search/%EC%84%9C%EC%9A%B8%ED%8A%B9%EB%B3%84%EC%8B%9C",
    "appUrl": "nmap://search?query=%EC%84%9C%EC%9A%B8%ED%8A%B9%EB%B3%84%EC%8B%9C&appname=meomum"
  },
  "categories": {
    "traffic": {
      "category_name_ko": "교통",
      "metrics": [
        {
          "metric_id": "bus_accessibility",
          "raw_value": 42.3,
          "score_100": 78.5
        }
      ]
    }
  },
  "raw": []
}
```

### GET /presets 또는 /recommendations/presets

```json
{
  "count": 5,
  "presets": [
    {
      "preset_id": "remote_worker",
      "preset_name_ko": "원격근무자",
      "traffic_weight": 0.18,
      "culture_weight": 0.22
    }
  ]
}
```

---

## v1.2.2 시군구 지표 점수 재계산 API

### 1) Dry-run 계산

`stg_region_metric_values`에 업로드된 원천형 행의 `raw_value` 또는 `cleaned_value`를 기준으로 지표별 `normalized_value`, `score_100`을 재계산합니다. 기본값은 `region_level=sigungu`, `apply=false`입니다.

```bash
curl -X POST http://localhost:8000/api/v1/score-calculations/region-metrics \
  -H "Content-Type: application/json" \
  -d '{
    "region_level": "sigungu",
    "source_table": "stg_region_metric_values",
    "apply": false,
    "preview_limit": 10
  }'
```

### 2) 계산 후 DB 반영

`apply=true`일 때만 `region_metric_values`에 저장합니다. 쓰기 작업에는 `SUPABASE_SERVICE_ROLE_KEY` 환경변수가 필요합니다.

```bash
curl -X POST http://localhost:8000/api/v1/score-calculations/region-metrics \
  -H "Content-Type: application/json" \
  -d '{
    "region_level": "sigungu",
    "source_table": "stg_region_metric_values",
    "apply": true,
    "replace_existing": true
  }'
```

### 3) 특정 지표만 계산

```bash
curl -X POST http://localhost:8000/api/v1/score-calculations/region-metrics \
  -H "Content-Type: application/json" \
  -d '{
    "region_level": "sigungu",
    "metric_ids": ["bus_accessibility", "pm10"],
    "apply": false
  }'
```

### 4) 시군구 추천 API 호출

`/recommendations`는 `region_level`을 받아 시도/시군구 추천을 분리합니다.

```bash
curl -X POST http://localhost:8000/api/v1/recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "region_level": "sigungu",
    "preset_id": "default",
    "limit": 5
  }'
```

### 5) 테스트 실행

```bash
python -m unittest discover -s tests -v
```
