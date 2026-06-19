// AI 팔레트(테마) 생성. GEMINI_API_KEY 우선 → ANTHROPIC_API_KEY 폴백. (title.ts와 동일 패턴)
import { costUsd } from "./_pricing";

function buildPrompt(desc: string): string {
  return `너는 피부과/미용 클리닉 홍보 포스터의 컬러 디자이너다.
아래 요청 분위기에 맞는 포스터 색 "팔레트(테마)" 1개를 설계해라.

[요청] ${desc || "고급스럽고 깨끗한 느낌"}

아래 JSON 객체"만" 출력해라(설명·코드블록·주석 금지):
{
  "label": "한글 짧은 테마 이름(2~8자)",
  "tag": "영문 짧은 태그라인(예: Early Summer)",
  "bg": "CSS linear-gradient(160deg,#xxxxxx 0%,#yyyyyy 100%) 형태의 배경 그라데이션(2~3색)",
  "blob": "CSS radial-gradient(55% 40% at 80% 8%, rgba(...,.3), transparent 65%) 형태의 은은한 광택",
  "ink": "#본문 글자색",
  "accent": "#보조 강조색",
  "accentDeep": "#진한 강조색(가격 등 포인트)",
  "scriptColor": "#영문 태그 글자색",
  "panel": "rgba(255,255,255,.97) 형태의 카드(가격표) 배경",
  "divider": "#카드 구분선(연한 색)",
  "was": "#정가 취소선 회색",
  "bgQuery": "이 분위기에 어울리는 배경 사진을 찾기 위한 영문 스톡 검색어(예: soft beige silk texture, calm blue water surface)",
  "layout": "classic | center | band | editorial | minimal | studio 중 하나(이 분위기에 가장 어울리는 레이아웃. band=제목을 컬러 박스 안에, studio=풀블리드 사진+미니멀, editorial=좌측 강조선)",
  "titleFx": "none | shadow | lift | 3d | outline | glow | gradient | gold | longshadow | emboss 중 하나(제목 글자 효과)"
}
규칙:
- 색은 모두 hex(#RRGGBB) 또는 rgba()/그라데이션 형식의 유효한 CSS 값.
- 배경이 어두우면 ink는 밝게, 배경이 밝으면 ink는 어둡게(대비 확보).
- panel은 보통 흰색 계열(rgba(255,255,255,.95~.98)).
- accent/accentDeep/scriptColor는 배경과 어울리되 충분히 보이는 색.`;
}

type Palette = { label: string; tag: string; bg: string; blob: string; ink: string; accent: string; accentDeep: string; scriptColor: string; panel: string; divider: string; was: string; bgQuery: string; layout: string; titleFx: string };
const LAYOUTS = ["classic", "center", "band", "editorial", "minimal", "studio"];
const FX = ["none", "shadow", "lift", "3d", "outline", "glow", "gradient", "gold", "longshadow", "emboss"];

function parsePalette(text: string): Palette | null {
  try {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const o = JSON.parse(m[0]);
    const need = ["bg", "ink", "accent", "accentDeep", "panel"];
    if (!need.every((k) => typeof o[k] === "string" && o[k])) return null;
    return {
      label: String(o.label || "AI 테마").slice(0, 16),
      tag: String(o.tag || "").slice(0, 24),
      bg: o.bg, blob: o.blob || "radial-gradient(55% 40% at 80% 8%, rgba(255,255,255,.4), transparent 65%)",
      ink: o.ink, accent: o.accent, accentDeep: o.accentDeep, scriptColor: o.scriptColor || o.accent,
      panel: o.panel || "rgba(255,255,255,.97)", divider: o.divider || "#ECECEC", was: o.was || "#B6B3AE",
      bgQuery: String(o.bgQuery || "").slice(0, 70),
      layout: LAYOUTS.includes(o.layout) ? o.layout : "classic",
      titleFx: FX.includes(o.titleFx) ? o.titleFx : "none",
    };
  } catch { return null; }
}

const GEMINI_MODELS = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-1.5-flash", "gemini-flash-latest"];
const CLAUDE_DEFAULT = "claude-haiku-4-5";
type Call = { text: string | null; err: string; model: string; inTok: number; outTok: number };

async function callGemini(key: string, prompt: string, preferred?: string): Promise<Call> {
  const models = Array.from(new Set([preferred, ...GEMINI_MODELS].filter(Boolean) as string[]));
  let err = "";
  for (const model of models) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
      if (!r.ok) { err = `${model} ${r.status}: ${(await r.text()).slice(0, 120)}`; continue; }
      const d = await r.json();
      const t = d?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (t) return { text: t, err: "", model, inTok: d?.usageMetadata?.promptTokenCount || 0, outTok: d?.usageMetadata?.candidatesTokenCount || 0 };
      err = `${model}: no text`;
    } catch (e: any) { err = `${model}: ${e?.message || e}`; }
  }
  return { text: null, err, model: "", inTok: 0, outTok: 0 };
}

async function callAnthropic(key: string, prompt: string, preferred?: string): Promise<Call> {
  const models = Array.from(new Set([preferred, CLAUDE_DEFAULT].filter(Boolean) as string[]));
  let err = "";
  for (const model of models) {
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model, max_tokens: 600, messages: [{ role: "user", content: prompt }] }),
      });
      if (!r.ok) { err = `${model} ${r.status}: ${(await r.text()).slice(0, 120)}`; continue; }
      const d = await r.json();
      const t = d?.content?.[0]?.text;
      if (t) return { text: t, err: "", model, inTok: d?.usage?.input_tokens || 0, outTok: d?.usage?.output_tokens || 0 };
      err = `${model}: no text`;
    } catch (e: any) { err = `${model}: ${e?.message || e}`; }
  }
  return { text: null, err, model: "", inTok: 0, outTok: 0 };
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") { res.status(405).json({ error: "POST only" }); return; }
  const gemini = process.env.GEMINI_API_KEY, anthropic = process.env.ANTHROPIC_API_KEY;
  let body = req.body; if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  const provider = body?.provider || "auto";
  const model: string | undefined = typeof body?.model === "string" ? body.model : undefined;
  const desc: string = String(body?.prompt || "");

  const useG = (provider === "auto" || provider === "gemini") && gemini;
  const useA = (provider === "auto" || provider === "claude") && anthropic;
  if (!useG && !useA) { res.status(200).json({ palette: null, note: "API 키 미설정" }); return; }

  const prompt = buildPrompt(desc);
  let text: string | null = null, via = "", usedModel = "", inTok = 0, outTok = 0, diag = "";
  if (useG) { const g = await callGemini(gemini!, prompt, model); if (g.text) { text = g.text; via = "gemini"; usedModel = g.model; inTok = g.inTok; outTok = g.outTok; } else diag += `G(${g.err}) `; }
  if (!text && useA) { const a = await callAnthropic(anthropic!, prompt, model); if (a.text) { text = a.text; via = "anthropic"; usedModel = a.model; inTok = a.inTok; outTok = a.outTok; } else diag += `A(${a.err})`; }
  if (!text) { res.status(200).json({ palette: null, note: `AI 실패: ${diag.slice(0, 200)}` }); return; }

  const palette = parsePalette(text);
  if (!palette) { res.status(200).json({ palette: null, note: "팔레트 파싱 실패" }); return; }
  res.status(200).json({ palette, via, model: usedModel, usage: { input: inTok, output: outTok }, cost: costUsd(usedModel, inTok, outTok) });
}
