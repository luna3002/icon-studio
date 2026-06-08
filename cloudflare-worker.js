/* Cloudflare Workers 대안 백엔드 (Vercel 대신 쓸 경우).
 * 배포:
 *   npx wrangler deploy
 *   npx wrangler secret put GEMINI_API_KEY      # 키 입력
 * 프론트에서는 index.html 의 메인 스크립트보다 먼저 아래를 넣어 엔드포인트를 지정:
 *   <script>window.GEMINI_ENDPOINT="https://<your-worker>.workers.dev"</script>
 */
import { handleGemini } from "./api/_core.mjs";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST") return json({ error: "POST only" }, 405);

    let body = {};
    try { body = await request.json(); } catch {}

    const { status, json: payload } = await handleGemini(body, env);
    return json(payload, status);
  },
};
