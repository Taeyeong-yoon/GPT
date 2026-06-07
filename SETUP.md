# NekoMaster 로컬 실행 가이드

## 1. 환경변수 설정

`.env.local.example`을 복사해 `.env.local` 생성:

```
cp .env.local.example .env.local
```

Firebase 콘솔 (console.firebase.google.com) → 프로젝트 `necojjangski` → 프로젝트 설정 → 웹앱 → SDK 설정에서 값을 복사해 채우세요.

## 2. 로컬 실행

```bash
npm install
npm start      # http://localhost:3000
```

## 3. Firestore 보안 규칙 배포

Firebase CLI 설치 후:
```bash
firebase login
firebase use necojjangski
firebase deploy --only firestore:rules
```

## 4. Vercel 배포

```bash
npm install -g vercel
vercel --prod
```

Vercel 환경변수에 `.env.local`의 값을 등록하세요.
(단, `REACT_APP_` 없는 서버 키는 Vercel Dashboard → Environment Variables에서 등록)

## 5. 데이터 변환 (이미 완료)

```bash
python scripts/convert.py   # 네코짱 JSON → src/data/jlpt/
python scripts/validate.py  # 검증
```
