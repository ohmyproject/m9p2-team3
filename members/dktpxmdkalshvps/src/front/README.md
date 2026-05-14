# MEOMUM 머묾 React + Vite Web

FastAPI + Supabase 기반 지역 추천 웹사이트 목업을 React + Vite + Tailwind CSS로 구현한 프로젝트입니다.

## 이번 보강 반영 사항

| 단계 및 작업명 | 반영 상태 |
|---|---|
| 공통 레이아웃 및 모드 전환 UI 개발 | 반영: 로고, 기본 네비게이션, 간편/꼼꼼/시니어/English 모드, 반응형 레이아웃 |
| 가중치 입력 및 프리셋 UI 구현 | 반영: 5대 카테고리 슬라이더, 장기체류관광 프리셋, 가중치 합계, 자동 정규화 안내 |
| 추천 결과 Top 5 화면 구현 | 반영: 추천 실행 버튼, Top 5 카드, finalScore, 주요 카테고리 점수, 추천 이유 |
| 지역 상세 패널 개발 | 반영: 병의원, 약국, 숙박, 와이파이/5G, 공원, 대기질, 안전 상세 지표 |
| 데이터 시각화 모듈 연동 | 반영: Recharts 기반 5대 카테고리 방사형 차트, 기여도 막대 차트 |
| 지도 API 연동 및 지역 마커 구현 | 반영: Kakao/Naver provider 전환 UI, 지도 마커, 선택 지역 강조, 히트맵/마커 표현 슬롯 |
| API 비동기 연동 | 반영: `/recommendations`, `/regions/{id}/details`, `/metrics`, `/data-versions/latest` 및 `/api/v1/*` 경로 fallback, 로딩/에러/빈 결과 처리 |
| 공유 기능 기본 구현 | 반영: 공유 버튼, `/shares` API 호출 시도, 실패 시 로컬 공유 URL 생성 및 클립보드 복사 |
| 시니어·English 모드 보정 | 반영: 시니어 모드 큰 글씨/큰 버튼, English 라벨/설명, alt/aria 보강 |

## 기술 스택

- React + Vite
- Tailwind CSS
- Recharts
- lucide-react
- framer-motion
- FastAPI REST API 연동 준비
- Supabase 기반 데이터 조회 구조 대응

## 실행 방법

```bash
npm install
npm run dev
```

브라우저에서 접속:

```bash
http://localhost:5173
```

## 환경변수

`.env` 파일을 만들고 필요에 따라 설정합니다.

```bash
VITE_API_BASE_URL=http://localhost:8000
VITE_KAKAO_MAP_KEY=
VITE_NAVER_MAP_CLIENT_ID=
```

## 연동 대상 API

프론트는 `/api/v1/*` 경로를 먼저 시도하고, 실패하면 기존 루트 경로를 다시 시도합니다.

- `GET /api/v1/regions` 또는 `GET /regions`
- `GET /api/v1/scores` 또는 `GET /scores`
- `POST /api/v1/recommendations` 또는 `POST /recommendations`
- `GET /api/v1/regions/{region_id}/details` 또는 `GET /regions/{region_id}/details`
- `GET /api/v1/metrics` 또는 `GET /metrics`
- `GET /api/v1/data-versions/latest` 또는 `GET /data-versions/latest`
- `POST /api/v1/shares` 또는 `POST /shares`

## Fallback 동작

FastAPI가 꺼져 있거나 일부 API가 아직 없으면 목업 데이터로 자동 전환됩니다.  
따라서 백엔드 개발 중에도 화면, 추천 계산, 차트, 상세 패널, 공유 기능을 먼저 확인할 수 있습니다.

## 주요 파일

```text
src/App.jsx
src/main.jsx
src/index.css
tailwind.config.js
postcss.config.js
public/assets/meomum-logo.png
public/assets/korea-map.png
```
