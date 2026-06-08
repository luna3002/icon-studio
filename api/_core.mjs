/* 공유 코어 — Vercel 함수 / 로컬 dev 서버 / Cloudflare Worker 가 모두 재사용.
 * Gemini "텍스트" 모델(generateContent)만 호출한다. (이미지 생성 API 아님)
 * 무료 티어 기본 모델: gemini-2.5-flash  (env GEMINI_MODEL 로 교체 가능)
 * API 키는 서버 환경변수(GEMINI_API_KEY)에서만 읽는다. 클라이언트로 노출 금지.
 */

const IDEAS_SCHEMA = {
  type: "object",
  properties: { ideas: { type: "array", items: { type: "string" } } },
  required: ["ideas"],
};

const REFINE_SCHEMA = {
  type: "object",
  properties: { subject: { type: "string" } },
  required: ["subject"],
};

function buildRequest(body) {
  const mode = body && body.mode;

  if (mode === "ideas") {
    const category = String((body && body.category) || "").slice(0, 200).trim();
    if (!category) return { error: "category required" };
    return {
      temperature: 1.0,
      schema: IDEAS_SCHEMA,
      prompt:
`You generate SUBJECT ideas for a cohesive icon set.
Category: "${category}"

Return exactly 30 distinct subject ideas for single-object icons.
Rules for each idea:
- 1 to 4 English words, all lowercase
- a concrete, tangible object or clear symbol that reads well as a minimal icon
- no numbering, no punctuation, no duplicates, no brand names
Return only the JSON object.`,
    };
  }

  if (mode === "refine") {
    const topic = String((body && body.topic) || "").slice(0, 300).trim();
    if (!topic) return { error: "topic required" };
    return {
      temperature: 0.4,
      schema: REFINE_SCHEMA,
      prompt:
`Convert the rough icon topic below (often written in Korean) into ONE clean English icon subject phrase.
Rules:
- 1 to 4 words, all lowercase
- concrete and visual, suitable to drop into an image prompt as the subject
- no articles (a/an/the), no trailing punctuation, no quotes
Topic: "${topic}"
Return only the JSON object with the subject.`,
    };
  }

  return { error: "invalid mode" };
}

/** @returns {Promise<{status:number, json:object}>} */
export async function handleGemini(body, env) {
  env = env || (typeof process !== "undefined" && process.env) || {};
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) return { status: 503, json: { error: "GEMINI_API_KEY not configured" } };

  const built = buildRequest(body || {});
  if (built.error) return { status: 400, json: { error: built.error } };

  const model = env.GEMINI_MODEL || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  let resp;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: built.prompt }] }],
        generationConfig: {
          temperature: built.temperature,
          responseMimeType: "application/json",
          responseSchema: built.schema,
        },
      }),
    });
  } catch {
    return { status: 502, json: { error: "upstream fetch failed" } };
  }

  if (!resp.ok) {
    const status = resp.status === 429 ? 429 : resp.status >= 500 ? 502 : resp.status;
    return { status, json: { error: "gemini error " + resp.status } };
  }

  let data;
  try { data = await resp.json(); } catch { return { status: 502, json: { error: "bad upstream json" } }; }

  const text =
    (data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts &&
      data.candidates[0].content.parts.map((p) => p.text || "").join("")) || "";

  let parsed;
  try { parsed = JSON.parse(text); } catch { return { status: 502, json: { error: "parse failed" } }; }

  if (body.mode === "ideas") {
    let ideas = Array.isArray(parsed.ideas) ? parsed.ideas : [];
    ideas = [...new Set(ideas.map((s) => String(s).trim().toLowerCase()).filter(Boolean))].slice(0, 30);
    return { status: 200, json: { ideas } };
  }

  return { status: 200, json: { subject: String(parsed.subject || "").trim() } };
}
