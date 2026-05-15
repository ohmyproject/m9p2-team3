# frontend

머묾(MEOMUM) 프로젝트의 프론트엔드 웹 애플리케이션입니다.  
장기 체류형 관광자를 위해 교통, 문화, 생활편의, 안전, 자연 지표를 비교하고 사용자 가중치에 맞는 지역 추천 결과를 보여주는 React + Vite 기반 화면입니다.

## 프로젝트 개요

- **서비스명:** 머묾(MEOMUM)
- **목적:** 장기 체류, 한 달 살기, 워케이션 사용자가 자신의 선호 조건에 맞는 국내 지역을 비교·선택할 수 있도록 지원
- **주요 기능:**
  - 5대 지표 가중치 조정
  - 프리셋 기반 추천 조건 자동 설정
  - 지역별 추천 점수 및 순위 확인
  - 지역 상세 정보 패널 제공
  - 방사형 차트 기반 지표 비교
  - 한국어/영어 모드 전환
  - 일반/간편/시니어 모드 전환

## 기술 스택

| 구분 | 사용 기술 |
| --- | --- |
| Frontend | React, JavaScript |
| Build Tool | Vite |
| Styling | CSS |
| Package Manager | npm |
| API 연동 | FastAPI 백엔드 API 연동 예정 |

## 폴더 구조

```text
frontend/
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── assets/
│   │   ├── korea-map.png
│   │   └── meomum-logo.png
│   ├── App.css
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── .env.example
├── .gitignore
├── eslint.config.js
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
└── README.md
```

## 실행 방법

프로젝트 파일을 내려받은 뒤, 터미널에서 `frontend` 폴더로 이동합니다.

```bash
cd frontend
```

### 1. 패키지 설치

```bash
npm install
```

### 2. 환경변수 설정

`.env.example` 파일을 복사해 `.env.local` 파일을 생성합니다.

```bash
cp .env.example .env.local
```

기본 API 주소는 다음과 같습니다.

```env
VITE_API_URL=http://127.0.0.1:8000
```

백엔드 서버 주소가 다르면 `.env.local`의 `VITE_API_URL` 값을 실제 주소로 변경합니다.

카카오 지도 API를 사용하는 경우 프로젝트 설정에 따라 아래 환경변수를 추가로 사용할 수 있습니다.

```env
VITE_KAKAO_MAP_API_KEY=your_kakao_map_api_key
```

### 3. 개발 서버 실행

```bash
npm run dev
```

Vite 개발 서버는 기본적으로 다음 주소에서 실행됩니다.

```text
http://localhost:5173
```

## 사용 가능한 스크립트

| 명령어 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | 배포용 정적 파일 빌드 |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm run lint` | ESLint 검사 실행 |

## 백엔드 연동 정보

프론트엔드는 `.env.local`의 `VITE_API_URL` 값을 기준으로 백엔드 API와 연동할 수 있도록 구성합니다.

예상 백엔드 구조는 다음과 같습니다.

```text
Backend: FastAPI
Local URL: http://127.0.0.1:8000
Frontend: Vite
Local URL: http://localhost:5173
```

주요 연동 대상 API는 프로젝트 백엔드 구현 상태에 따라 다음과 같이 사용할 수 있습니다.

```text
GET /regions
GET /scores
GET /presets
GET /health
```

또는 백엔드에서 `/api` prefix를 함께 제공하는 경우 다음 주소도 사용할 수 있습니다.

```text
GET /api/regions
GET /api/scores
GET /api/presets
GET /api/health
```

## GitHub 업로드 전 확인사항

`node_modules`, `dist`, `.env.local`은 GitHub에 올리지 않습니다.  
필요한 패키지는 `package.json`과 `package-lock.json`을 기준으로 `npm install`을 실행해 다시 설치합니다.

업로드 전 아래 명령어로 정상 동작 여부를 확인하는 것을 권장합니다.

```bash
npm install
npm run build
```

## 프로젝트 관련 메모

현재 프론트엔드는 머묾 서비스의 화면 구조와 사용자 인터랙션을 중심으로 구성되어 있습니다. 백엔드 API와 실제 데이터 연동이 완료되면 지역 추천 결과, 점수 산출, 프리셋 정보 등을 API 응답 기반으로 확장할 수 있습니다.
