# Git 업로드 안내

이 압축본은 Git 업로드용으로 정리된 프론트엔드 프로젝트입니다.

## 포함된 것

- `src/`
- `public/`
- `package.json`
- `package-lock.json`
- `index.html`
- `vite.config.js`
- `.env.example`
- `.gitignore`

## 제외한 것

- `node_modules/`
- `dist/`
- `.env.development`
- `.env.production`

## 팀원이 받은 뒤 실행 방법

```bash
npm install
npm run dev
```

## 로컬 환경변수 설정

필요하면 `.env.example`을 복사해서 `.env.development`로 만든 뒤 값을 수정하세요.

```bash
cp .env.example .env.development
```

Windows PowerShell에서는 아래처럼 복사할 수 있습니다.

```powershell
Copy-Item .env.example .env.development
```
