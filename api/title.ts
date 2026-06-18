// Vercel 서버리스: 이벤트 타이틀 추천. GEMINI_API_KEY 우선 → ANTHROPIC_API_KEY 폴백.
// 실패 시 note에 진단 메시지 포함. 둘 다 없거나 실패면 빈 배열 → 프론트 오프라인 추천.

function buildPrompt(month: string, treatments: string[], description: string, examples: string[]): string {
  return `너는 대구 수성구 피부과 "뷰티파크의원 범어점"의 베테랑 마케팅 카피라이터다.
아래 한 이벤트 그룹에 어울리는 **감각적이고 클릭하고 싶은** 한국어 이벤트 타이틀 6개를 제안해라.

[대상 월] ${month}
[구성 시술]
${treatments.map((t) => `- ${t}`).join("\n") || "- (미입력)"}
${description ? `[기획자 설명/의도] ${description}` : ""}
${examples.length ? `\n[우리 클리닉이 실제 써온 타이틀 — 이 톤·리듬·작명 스타일을 학습해서 비슷한 결로 새로 지어라]\n${examples.slice(0, 14).map((e) => `- ${e}`).join("\n")}` : ""}

작명 가이드:
- 위 예시들의 분위기(고급+위트, 계절감, 영문 키워드 활용)를 그대로 살려라. 단, 예시를 그대로 베끼지 말고 새로 지어라.
- 다양한 스타일을 섞어라: (a) 영문 캐치프레이즈형 (b) 감성 한글형 (c) 혜택 강조형.
- 길이 6~18자. 과장·치료효과 보장·최상급 표현 금지.
- 결과는 **JSON 문자열 배열만** 출력(설명·번호 금지). 예: ["타이틀1","타이틀2","타이틀3","타이틀4","타이틀5","타이틀6"]`;
}

function parseTitles(text: string): string[] {
  let titles: string[] = [];
  try {
    titles = JSON.parse(text.match(/\[[\s\S]*\]/)?.[0] ?? "[]");
  } catch {
    titles = text.split("\n").map((s) => s.replace(/^[-*\d.\s"]+|"$/g, "").trim()).filter(Boolean);
  }
  return titles.filter((t) => typeof t === "string" && t.trim()).slice(0, 6);
}

async function callGemini(key: string, prompt: string): Promise<{ text: string | null; err: string }> {
  const models = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-1.5-flash", "gemini-flash-latest"];
  let err = "";
  for (const model of models) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) }
      );
      if (!r.ok) { err = `${model} ${r.status}: ${(await r.text()).slice(0, 140)}`; continue; }
      const d = await r.json();
      const t = d?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (t) return { text: t, err: "" };
      err = `${model}: no text (${JSON.stringify(d).slice(0, 120)})`;
    } catch (e: any) { err = `${model}: ${e?.message || e}`; }
  }
  return { text: null, err };
}

async function callAnthropic(key: string, prompt: string): Promise<{ text: string | null; err: string }> {
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 400, messages: [{ role: "user", content: prompt }] }),
    });
    if (!r.ok) return { text: null, err: `anthropic ${r.status}: ${(await r.text()).slice(0, 120)}` };
    const d = await r.json();
    return { text: d?.content?.[0]?.text ?? null, err: "" };
  } catch (e: any) {
    return { text: null, err: `anthropic: ${e?.message || e}` };
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return;
  }
  const gemini = process.env.GEMINI_API_KEY;
  const anthropic = process.env.ANTHROPIC_API_KEY;

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  const provider = body?.provider || "auto";
  const month: string = body?.month || "";
  const treatments: string[] = Array.isArray(body?.treatments) ? body.treatments : [];
  const description: string = body?.description || "";
  const examples: string[] = Array.isArray(body?.examples) ? body.examples.filter((e: any) => typeof e === "string") : [];

  const useG = (provider === "auto" || provider === "gemini") && gemini;
  const useA = (provider === "auto" || provider === "claude") && anthropic;
  if (!useG && !useA) {
    res.status(200).json({ titles: [], note: provider === "claude" ? "ANTHROPIC_API_KEY 미설정" : provider === "gemini" ? "GEMINI_API_KEY 미설정" : "API 키 미설정" });
    return;
  }

  const prompt = buildPrompt(month, treatments, description, examples);
  let text: string | null = null;
  let via = "";
  let diag = "";
  if (useG) { const g = await callGemini(gemini!, prompt); if (g.text) { text = g.text; via = "gemini"; } else diag += `G(${g.err}) `; }
  if (!text && useA) { const a = await callAnthropic(anthropic!, prompt); if (a.text) { text = a.text; via = "anthropic"; } else diag += `A(${a.err})`; }

  if (!text) {
    res.status(200).json({ titles: [], note: `AI 실패: ${diag.slice(0, 200)}` });
    return;
  }
  res.status(200).json({ titles: parseTitles(text), via });
}
