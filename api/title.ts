// Vercel 서버리스: 이벤트 타이틀 추천. GEMINI_API_KEY 우선 시도 → 실패/미설정 시 ANTHROPIC_API_KEY.
// 둘 다 없거나 오류면 빈 배열 반환 → 프론트가 오프라인 추천으로 폴백.

function buildPrompt(month: string, treatments: string[], description: string): string {
  return `너는 대구 수성구 피부과 "뷰티파크의원 범어점"의 베테랑 마케팅 카피라이터다.
아래 한 이벤트 그룹에 어울리는 매력적인 한국어 이벤트 타이틀 5개를 제안해라.

[대상 월] ${month}
[구성 시술]
${treatments.map((t) => `- ${t}`).join("\n") || "- (미입력)"}
${description ? `[기획자 설명/의도] ${description}` : ""}

규칙:
- 톤: 고급스럽고 간결하며 계절감/혜택감이 느껴지게.
- 길이: 6~18자. 과장·의학적 효과 보장 표현 금지.
- 영문/한글 혼용 가능(예: LUCKY 7 FESTA, 예뻐지는 화수목 이벤트).
- 결과는 **JSON 문자열 배열만** 출력. 설명 금지. 예: ["타이틀1","타이틀2","타이틀3","타이틀4","타이틀5"]`;
}

function parseTitles(text: string): string[] {
  let titles: string[] = [];
  try {
    titles = JSON.parse(text.match(/\[[\s\S]*\]/)?.[0] ?? "[]");
  } catch {
    titles = text.split("\n").map((s) => s.replace(/^[-*\d.\s"]+|"$/g, "").trim()).filter(Boolean);
  }
  return titles.filter((t) => typeof t === "string" && t.trim()).slice(0, 5);
}

async function callGemini(key: string, prompt: string): Promise<string | null> {
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );
    if (!r.ok) return null;
    const d = await r.json();
    return d?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  } catch {
    return null;
  }
}

async function callAnthropic(key: string, prompt: string): Promise<string | null> {
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 400, messages: [{ role: "user", content: prompt }] }),
    });
    if (!r.ok) return null;
    const d = await r.json();
    return d?.content?.[0]?.text ?? null;
  } catch {
    return null;
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return;
  }
  const gemini = process.env.GEMINI_API_KEY;
  const anthropic = process.env.ANTHROPIC_API_KEY;
  if (!gemini && !anthropic) {
    res.status(200).json({ titles: [], note: "API 키 미설정(GEMINI/ANTHROPIC)" });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const month: string = body?.month || "";
  const treatments: string[] = Array.isArray(body?.treatments) ? body.treatments : [];
  const description: string = body?.description || "";
  const prompt = buildPrompt(month, treatments, description);

  let text: string | null = null;
  let via = "";
  if (gemini) { text = await callGemini(gemini, prompt); if (text) via = "gemini"; }
  if (!text && anthropic) { text = await callAnthropic(anthropic, prompt); if (text) via = "anthropic"; }

  if (!text) {
    res.status(200).json({ titles: [], note: "AI 응답 없음(키/할당량 확인)" });
    return;
  }
  res.status(200).json({ titles: parseTitles(text), via });
}
