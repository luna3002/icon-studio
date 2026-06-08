/* 로컬 개발 서버 — 의존성 0개.
 *   node dev-server.mjs   →   http://localhost:5173
 * index.html 정적 서빙 + POST /api/gemini 프록시를 같은 오리진에서 제공하므로
 * 프론트의 상대경로 "/api/gemini" 가 그대로 동작한다.
 * .env 파일이 있으면 자동으로 읽어 환경변수로 로드한다. (.env 는 커밋 금지)
 */
import http from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { handleGemini } from "./api/_core.mjs";

// --- .env 로더 (외부 패키지 없이) ---
if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
}

const PORT = process.env.PORT || 5173;
const TYPES = { html: "text/html; charset=utf-8", js: "text/javascript", mjs: "text/javascript", css: "text/css", svg: "image/svg+xml", png: "image/png", json: "application/json" };

const server = http.createServer(async (req, res) => {
  const path = req.url.split("?")[0];

  if (path === "/api/gemini") {
    if (req.method !== "POST") { res.writeHead(405); res.end(); return; }
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", async () => {
      let body = {};
      try { body = JSON.parse(raw || "{}"); } catch {}
      const { status, json } = await handleGemini(body);
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(json));
    });
    return;
  }

  // 정적 파일
  try {
    const file = path === "/" ? "index.html" : path.slice(1);
    const data = await readFile(file);
    const ext = file.split(".").pop();
    res.writeHead(200, { "Content-Type": TYPES[ext] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
});

server.listen(PORT, () => {
  console.log(`▶ Icon Generator Studio  →  http://localhost:${PORT}`);
  if (!process.env.GEMINI_API_KEY) {
    console.log("⚠  GEMINI_API_KEY 가 없습니다. AI 보조 기능은 503 으로 응답하고, 나머지 도구는 정상 동작합니다.");
    console.log("   .env 파일을 만들어 키를 넣으세요 (.env.example 참고).");
  }
});
