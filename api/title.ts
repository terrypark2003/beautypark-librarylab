// Vercel 서버리스 함수: 이벤트 타이틀 추천 (Claude API)
// 환경변수 ANTHROPIC_API_KEY 필요. 미설정/오류 시 빈 배열 반환 → 프론트가 오프라인 추천으로 폴백.
export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return;
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    res.status(200).json({ titles: [], note: "ANTHROPIC_API_KEY 미설정" });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const month: string = body?.month || "";
  const treatments: string[] = Array.isArray(body?.treatments) ? body.treatments : [];
  const description: string = body?.description || "";

  const prompt = `너는 대구 수성구 피부과 "뷰티파크의원 범어점"의 베테랑 마케팅 카피라이터다.
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

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!r.ok) {
      res.status(200).json({ titles: [], note: `AI 오류 ${r.status}` });
      return;
    }
    const data = await r.json();
    const text: string = data?.content?.[0]?.text ?? "";
    let titles: string[] = [];
    try {
      titles = JSON.parse(text.match(/\[[\s\S]*\]/)?.[0] ?? "[]");
    } catch {
      titles = text.split("\n").map((s) => s.replace(/^[-*\d.\s"]+|"$/g, "").trim()).filter(Boolean);
    }
    res.status(200).json({ titles: titles.filter((t) => typeof t === "string").slice(0, 5) });
  } catch (e: any) {
    res.status(200).json({ titles: [], note: `요청 실패: ${e?.message || e}` });
  }
}
