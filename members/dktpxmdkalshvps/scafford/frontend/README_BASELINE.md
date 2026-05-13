# MEOMUM Frontend Baseline - 260513

이 버전을 기준 프론트로 사용합니다.

## 정리한 내용

- `node_modules/` 제거
- `.git/` 제거
- `dist/` 제거
- `react-simple-maps` peer dependency 충돌 방지를 위해 React 18.2.0으로 고정

## 실행

```bash
cd frontend
npm install
npm run dev
```

## 백엔드 API

`.env.development` 또는 `.env`에서 API 주소를 확인하세요.

```env
VITE_API_BASE=http://localhost:8000
```
