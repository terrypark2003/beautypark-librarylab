import { addSpend } from "./cost";

export interface TitleResult { titles: string[]; note?: string }

// 서버가 돌려준 실제 호출 비용(USD)을 이번 달 누적에 반영
function track(d: any) {
  if (d && (d.via === "gemini" || d.via === "anthropic")) addSpend(typeof d.cost === "number" ? d.cost : 0);
}

// API가 실제로 응답한 모델 id → 사람이 읽기 좋은 이름
function prettyModel(m?: string): string {
  if (!m) return "";
  const map: Record<string, string> = {
    "gemini-2.0-flash": "Gemini 2.0 Flash", "gemini-2.5-flash": "Gemini 2.5 Flash", "gemini-2.5-pro": "Gemini 2.5 Pro",
    "gemini-1.5-flash": "Gemini 1.5 Flash", "gemini-flash-latest": "Gemini Flash",
    "claude-haiku-4-5": "Claude Haiku 4.5", "claude-sonnet-4-6": "Claude Sonnet 4.6", "claude-opus-4-8": "Claude Opus 4.8",
  };
  return map[m] || m;
}
function viaLabel(via?: string, model?: string): string | undefined {
  const name = prettyModel(model) || (via === "gemini" ? "Gemini" : via === "anthropic" ? "Claude" : "");
  return name ? `${name} 추천 ✨` : undefined;
}

const SEASON: Record<number, string> = {
  1: "새해 뷰티 리셋", 2: "봄 준비", 3: "봄 새단장", 4: "봄 글로우", 5: "가정의 달", 6: "초여름 싱그러움",
  7: "한여름 바캉스", 8: "늦여름 회복", 9: "환절기 케어", 10: "가을 광채", 11: "연말 준비", 12: "연말 결산",
};

function keyword(treatments: string[]): string {
  const text = treatments.join(" ");
  const map: [RegExp, string][] = [
    [/제모/, "제모"], [/보톡스/, "보톡스"], [/필러|벨로테로|쥬베룩|리쥬란|콜라겐/, "볼륨"],
    [/리프팅|슈링크|울쎄라|올타이트|소프웨이브|인모드/, "리프팅"], [/미백|토닝|비타민/, "미백"],
    [/모공|흉터|프락셀|아쿠아필/, "모공"], [/바디|리포|윤곽/, "바디"], [/물광|스킨부스터|주사/, "물광"],
  ];
  for (const [re, w] of map) if (re.test(text)) return w;
  return "스페셜";
}

function fallback(input: { month: string; treatments: string[]; examples?: string[] }): string[] {
  const m = Number(input.month.split(".")[1] || "0");
  const s = SEASON[m] || "이달의";
  const kw = keyword(input.treatments);
  const ex = (input.examples || []).filter((t) => t && t.length <= 18);
  const out = [
    `${s} ${kw} 페스타`,
    `${kw} 집중 ${m}월 스페셜`,
    `${s} 뷰티 위크`,
    `${kw} PICK ${m} EVENT`,
    ...ex.slice(0, 2), // 과거 실제 타이틀 일부(스타일 참고용)
  ];
  return Array.from(new Set(out)).slice(0, 6);
}

export interface PackageGroup { title: string; concept?: string; target?: string; intensity?: string; items: string[] }
export interface PackageResult { groups: PackageGroup[]; note?: string }

function pickByCat(pool: string[], re: RegExp, n = 4): string[] {
  return pool.filter((t) => re.test(t)).slice(0, n);
}
function pkgFallback(input: { month: string; treatments: string[] }): PackageGroup[] {
  const m = Number(input.month.split(".")[1] || "0");
  const s = SEASON[m] || "이달의";
  const pool = input.treatments;
  const defs: [string, string, RegExp][] = [
    [`${s} 미백 리셋`, "자외선 후 색소·톤", /토닝|엑셀V|미백|비타민|피코/],
    ["모공·피지 집중", "늘어난 모공·피지", /모공|버츄|아쿠아필|프락셀|LDM/],
    ["텐션 리프팅", "처진 탄력 케어", /슈링크|인모드|올타이트|소프웨이브|리프|울쎄|포텐자/],
    ["물광·재생", "속건조·생기", /리쥬란|물광|쥬베룩|스킨부스터|줄기세포|엑소좀/],
    ["바디 케어", "바디라인 마무리", /바디|제모|리포|윤곽|승모근/],
  ];
  return defs
    .map(([title, concept, re]) => ({ title, concept, items: pickByCat(pool, re) }))
    .filter((g) => g.items.length)
    .slice(0, 6);
}

export async function suggestPackages(input: { month: string; treatments: string[]; description?: string; examples?: string[]; provider?: string; model?: string; eventCount?: number; itemsPerEvent?: number }): Promise<PackageResult> {
  try {
    const r = await fetch("/api/packages", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
    if (r.ok) {
      const d = await r.json();
      if (Array.isArray(d.groups) && d.groups.length) {
        track(d);
        return { groups: d.groups, note: viaLabel(d.via, d.model) };
      }
      return { groups: pkgFallback(input), note: d.note || "오프라인 추천" };
    }
  } catch {
    /* 폴백 */
  }
  return { groups: pkgFallback(input), note: "오프라인 추천 (AI 서버 미연결)" };
}

export async function suggestTitles(input: { month: string; treatments: string[]; description?: string; examples?: string[]; provider?: string; model?: string }): Promise<TitleResult> {
  try {
    const r = await fetch("/api/title", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    if (r.ok) {
      const d = await r.json();
      if (Array.isArray(d.titles) && d.titles.length) {
        track(d);
        return { titles: d.titles, note: viaLabel(d.via, d.model) };
      }
      return { titles: fallback(input), note: d.note || "오프라인 추천" };
    }
  } catch {
    /* 네트워크/서버 없음 → 폴백 */
  }
  return { titles: fallback(input), note: "오프라인 추천 (AI 서버 미연결)" };
}
