/* Vercel 서버리스 함수 — POST /api/gemini
 * 환경변수: GEMINI_API_KEY (필수), GEMINI_MODEL (선택)
 * 키는 서버에만 존재하며 클라이언트로 전달되지 않는다.
 */
import { handleGemini } from "./_core.mjs";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "POST only" }); return; }

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  if (!body || typeof body !== "object") body = {};

  const { status, json } = await handleGemini(body);
  res.status(status).json(json);
}
