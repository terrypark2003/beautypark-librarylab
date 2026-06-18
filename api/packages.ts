// Vercel 서버리스: 이벤트 패키지(시술 조합) 추천. GEMINI 우선 → ANTHROPIC 폴백.
// 입력 시술 풀 안에서만 조합. 출력: [{title, items:[시술명]}]

function buildPrompt(month: string, pool: string[], examples: string[], description: string): string {
  return `너는 대구 수성구 피부과 "뷰티파크의원 범어점"의 마케팅 기획자다.
${month} 이벤트로 쓸 **패키지(이벤트 그룹)** 5~6개를 제안해라.

[보유 시술 풀 — 반드시 이 안에서 골라 조합. 보유하지 않은 새 장비/시술을 지어내지 말 것]
${pool.slice(0, 80).map((t) => `- ${t}`).join("\n")}

${examples.length ? `[우리 과거 이벤트 타이틀 — 작명 톤 참고]\n${examples.slice(0, 12).map((e) => `- ${e}`).join("\n")}\n` : ""}${description ? `[기획 의도] ${description}\n` : ""}
가이드:
- 각 그룹 = 매력적인 한국어 타이틀 + 한 줄 콘셉트 + 시너지 있는 시술 2~5개 조합 + 타겟 + 강도(약/중/중상/상).
- ${month.split(".")[1] || ""}월 계절감 반영(예: 자외선 후 미백/진정, 탄력 리프팅, 모공·피지, 바디, 평일 화수목 한정, 카톡 플친 전용 미끼).
- 시술명은 풀의 표현을 최대한 그대로 사용(조합 시 '+'로 연결 가능).
- 과장·치료효과 보장 표현 금지.
- 출력은 **JSON 배열만**(설명·코드펜스 금지):
  [{"title":"타이틀","concept":"한 줄 콘셉트","items":["시술1","시술2"],"target":"타겟 고객","intensity":"중"}, ...]`;
}

function parseGroups(text: string): any[] {
  try {
    const arr = JSON.parse(text.match(/\[[\s\S]*\]/)?.[0] ?? "[]");
    if (!Array.isArray(arr)) return [];
    return arr
      .map((g: any) => ({
        title: typeof g?.title === "string" ? g.title.trim() : "",
        concept: typeof g?.concept === "string" ? g.concept.trim() : "",
        target: typeof g?.target === "string" ? g.target.trim() : "",
        intensity: typeof g?.intensity === "string" ? g.intensity.trim() : "",
        items: Array.isArray(g?.items) ? g.items.filter((i: any) => typeof i === "string" && i.trim()).map((i: string) => i.trim()) : [],
      }))
      .filter((g: any) => g.title && g.items.length)
      .slice(0, 8);
  } catch {
    return [];
  }
}

const GEMINI_MODELS = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-1.5-flash", "gemini-flash-latest"];
const CLAUDE_DEFAULT = "claude-haiku-4-5";

async function callGemini(key: string, prompt: string, preferred?: string): Promise<{ text: string | null; err: string; model: string }> {
  const models = Array.from(new Set([preferred, ...GEMINI_MODELS].filter(Boolean) as string[]));
  let err = "";
  for (const model of models) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      });
      if (!r.ok) { err = `${model} ${r.status}: ${(await r.text()).slice(0, 140)}`; continue; }
      const d = await r.json();
      const t = d?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (t) return { text: t, err: "", model };
      err = `${model}: no text`;
    } catch (e: any) { err = `${model}: ${e?.message || e}`; }
  }
  return { text: null, err, model: "" };
}

async function callAnthropic(key: string, prompt: string, preferred?: string): Promise<{ text: string | null; err: string; model: string }> {
  const models = Array.from(new Set([preferred, CLAUDE_DEFAULT].filter(Boolean) as string[]));
  let err = "";
  for (const model of models) {
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model, max_tokens: 900, messages: [{ role: "user", content: prompt }] }),
      });
      if (!r.ok) { err = `${model} ${r.status}: ${(await r.text()).slice(0, 120)}`; continue; }
      const d = await r.json();
      const t = d?.content?.[0]?.text;
      if (t) return { text: t, err: "", model };
      err = `${model}: no text`;
    } catch (e: any) { err = `${model}: ${e?.message || e}`; }
  }
  return { text: null, err, model: "" };
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") { res.status(405).json({ error: "POST only" }); return; }
  const gemini = process.env.GEMINI_API_KEY;
  const anthropic = process.env.ANTHROPIC_API_KEY;

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  const provider = body?.provider || "auto";
  const model: string | undefined = typeof body?.model === "string" ? body.model : undefined;
  const month: string = body?.month || "";
  const pool: string[] = Array.isArray(body?.treatments) ? body.treatments.filter((t: any) => typeof t === "string") : [];
  const examples: string[] = Array.isArray(body?.examples) ? body.examples.filter((e: any) => typeof e === "string") : [];
  const description: string = body?.description || "";

  const useG = (provider === "auto" || provider === "gemini") && gemini;
  const useA = (provider === "auto" || provider === "claude") && anthropic;
  if (!useG && !useA) {
    res.status(200).json({ groups: [], note: provider === "claude" ? "ANTHROPIC_API_KEY 미설정" : provider === "gemini" ? "GEMINI_API_KEY 미설정" : "API 키 미설정" });
    return;
  }

  const prompt = buildPrompt(month, pool, examples, description);
  let text: string | null = null, via = "", usedModel = "", diag = "";
  if (useG) { const g = await callGemini(gemini!, prompt, model); if (g.text) { text = g.text; via = "gemini"; usedModel = g.model; } else diag += `G(${g.err}) `; }
  if (!text && useA) { const a = await callAnthropic(anthropic!, prompt, model); if (a.text) { text = a.text; via = "anthropic"; usedModel = a.model; } else diag += `A(${a.err})`; }

  if (!text) { res.status(200).json({ groups: [], note: `AI 실패: ${diag.slice(0, 200)}` }); return; }
  res.status(200).json({ groups: parseGroups(text), via, model: usedModel });
}
