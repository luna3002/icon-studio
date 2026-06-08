# Icon Generator Studio

아이콘 **프롬프트 빌더 + 후처리(배경제거·정사각화·SVG 벡터화)** 정적 도구에,
**Gemini 무료 텍스트 모델**을 쓰는 AI 보조 기능 2가지를 붙였습니다.

## 추가된 기능

1. **주제 아이디어 생성** — 카테고리를 입력하면 아이콘 주제 후보 **30개**를 뽑아 칩으로 보여주고,
   클릭하면 주제 슬롯에 들어갑니다.
2. **주제어 다듬기** — 한글로 대충 적은 주제를 깔끔한 **영문 주제어**로 변환해
   기존 고정 프롬프트 템플릿의 **주제 슬롯(`#subject`)에만** 끼워넣습니다. (프롬프트 전체는 그대로)

> 두 기능 모두 **추가 기능**입니다. API가 실패하거나 무료 한도를 넘겨도
> 기존 프롬프트 빌더와 후처리 도구는 **그대로 동작**합니다 (graceful fallback).

## 보안 설계

- **API 키는 클라이언트(HTML/JS)에 절대 넣지 않습니다.** 프론트는 서버리스 엔드포인트 `/api/gemini` 만 호출합니다.
- 키는 **서버 환경변수 `GEMINI_API_KEY`** 에서만 읽습니다.
- `.env` / 키 파일은 `.gitignore` 에 등록되어 **커밋되지 않습니다.**
- 호출하는 모델은 **텍스트 생성(`generateContent`) 전용** — 이미지 생성 API가 아닙니다.

## 모델

기본값 **`gemini-2.5-flash`** (2026년 현재 무료 티어 텍스트 모델, 약 15 RPM / 1,500 RPD).
`GEMINI_MODEL` 환경변수로 교체할 수 있습니다 (예: 더 높은 무료 한도의 `gemini-2.5-flash-lite`).

---

## 1) 로컬에서 테스트 (가장 빠름, 계정 불필요)

```bash
# 1. 키 발급: https://aistudio.google.com/app/apikey
# 2. .env 만들기
cp .env.example .env
#    .env 를 열어 GEMINI_API_KEY 채우기

# 3. 실행 (Node 18+)
npm run dev
#    → http://localhost:5173
```

- 정적 HTML과 `/api/gemini` 프록시를 **같은 포트**에서 제공하므로 상대경로가 그대로 동작합니다.
- 키 없이 실행하면 AI 보조는 `503` 으로 응답하고, 나머지 도구는 정상 동작합니다(폴백 확인용).

---

## 2) 배포

### 옵션 A — Vercel (무료, 권장)

`index.html`(정적)과 `api/gemini.js`(서버리스 함수)가 함께 배포됩니다.

```bash
npm i -g vercel
vercel                      # 프로젝트 연결
vercel env add GEMINI_API_KEY   # 키 입력 (Production/Preview/Development)
# (선택) vercel env add GEMINI_MODEL
vercel --prod
```

프론트는 같은 도메인의 `/api/gemini` 를 호출하므로 추가 설정이 없습니다.
로컬에서 Vercel 함수 그대로 테스트하려면 `vercel dev`.

### 옵션 B — Cloudflare Workers (무료)

```bash
npm i -g wrangler
wrangler deploy
wrangler secret put GEMINI_API_KEY   # 키 입력
```

Worker는 별도 도메인이므로, `index.html` 의 **메인 스크립트보다 먼저** 엔드포인트를 지정하세요:

```html
<script>window.GEMINI_ENDPOINT = "https://icon-studio-gemini.<account>.workers.dev"</script>
```

(Worker에는 CORS가 켜져 있습니다.) `index.html` 자체는 아무 정적 호스팅(GitHub Pages 등)에 올리면 됩니다.

---

## 파일 구성

| 파일 | 역할 |
|---|---|
| `index.html` | 도구 본체 + AI 보조 UI/로직 (프론트는 `/api/gemini` 만 호출) |
| `api/_core.mjs` | Gemini 호출 공유 코어 (3개 백엔드가 재사용) |
| `api/gemini.js` | Vercel 서버리스 함수 |
| `cloudflare-worker.js` | Cloudflare Workers 대안 백엔드 |
| `dev-server.mjs` | 의존성 0 로컬 서버 (정적 + 프록시) |
| `.env.example` | 환경변수 템플릿 (`.env` 는 커밋 금지) |
| `.gitignore` | `.env`·키 파일 차단 |
