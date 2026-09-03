import raw from "../data/history.json";

export interface HItem { name: string; event: number | null; normal: number | null }
export interface HGroup { group: string; items: HItem[] }
export interface HMonth { title: string; emphasis: string; groups: HGroup[] }

// 25.10~26.4 요청서는 C/D 열 순서가 달라(이벤트가·정상가 자리가 바뀜) 그대로 읽으면
// 정상가 < 이벤트가로 뒤집혀 들어온다. 이벤트가가 정상가보다 높을 일은 없으므로 로드 시 바로잡고,
// 보정이 일어난 달은 fixedMonths에 기록해 화면에서 주의 문구를 띄운다.
export const fixedMonths = new Set<string>();
function fixItem(it: HItem, month: string): HItem {
  if (it.normal != null && it.event != null && it.normal < it.event) {
    fixedMonths.add(month);
    return { ...it, normal: it.event, event: it.normal };
  }
  return it;
}

// 시트 월 표기가 섞여 있어(2025.08 vs 2026.7) 키를 '연.월(앞자리0 제거)'로 정규화
export const history: Record<string, HMonth> = {};
for (const [k, v] of Object.entries(raw as Record<string, HMonth>)) {
  const [y, m] = k.split(".").map(Number);
  if (isNaN(y) || isNaN(m) || !(v as any).groups) continue;
  const mk = `${y}.${m}`;
  history[mk] = { ...v, groups: v.groups.map((g) => ({ ...g, items: g.items.map((it) => fixItem(it, mk)) })) };
}

/** 원 단위 → 만원 표기 (90000 → "9", 1136364 → "113.6") */
export const fmtMan = (v: number | null): string => {
  if (v == null) return "";
  const n = v / 10000;
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, "");
};

/** 할인율(%) — 정상가·이벤트가가 모두 있고 정상가가 더 클 때만 */
export const discount = (normal: number | null, event: number | null): number | null =>
  normal && event && normal > event ? Math.round((1 - event / normal) * 100) : null;

/** "월 초 강조 : A\n월 중순 강조 : B" → { wolcho, jungsun } */
export function parseEmphasis(e: string): { wolcho?: string; jungsun?: string } {
  const src = (e || "").replace(/\s*\|\s*#.*$/, "");
  const w1 = src.match(/월\s*초[^:：]*[:：]\s*([^|\n]+)/);
  const w2 = src.match(/월\s*중순[^:：]*[:：]\s*([^|\n]+)/);
  return { wolcho: w1?.[1].trim(), jungsun: w2?.[1].trim() };
}

/** 시술명 검색(공백 무시) — 최신 월부터 */
export function searchItems(q: string): { month: string; group: string; item: HItem }[] {
  const needle = q.trim().toLowerCase().replace(/\s+/g, "");
  if (!needle) return [];
  const out: { month: string; group: string; item: HItem }[] = [];
  for (const k of listMonths().reverse())
    for (const g of history[k].groups)
      for (const it of g.items)
        if (it.name.toLowerCase().replace(/\s+/g, "").includes(needle)) out.push({ month: k, group: g.group, item: it });
  return out;
}

export const key = (y: number, m: number) => `${y}.${m}`;
export const label = (k: string) => {
  const [y, m] = k.split(".");
  return `${y}년 ${m}월`;
};

export function listMonths(): string[] {
  return Object.keys(history).sort((a, b) => {
    const [ay, am] = a.split(".").map(Number);
    const [by, bm] = b.split(".").map(Number);
    return ay - by || am - bm;
  });
}

export function latest(): { y: number; m: number } {
  const ms = listMonths();
  const [y, m] = (ms[ms.length - 1] || "2026.7").split(".").map(Number);
  return { y, m };
}

export function nextMonth(y: number, m: number): { y: number; m: number } {
  return m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 };
}
export function prevMonthKey(y: number, m: number): string {
  return m === 1 ? key(y - 1, 12) : key(y, m - 1);
}

/** 기획 참고용: 동월 작년·재작년 + 직전월. hist에 오버라이드 맵을 넘기면 그걸 우선 사용 */
export function references(
  y: number,
  m: number,
  hist: Record<string, HMonth> = history
): { tag: string; key: string; data?: HMonth }[] {
  const refs = [
    { tag: "작년 동월", key: key(y - 1, m) },
    { tag: "재작년 동월", key: key(y - 2, m) },
    { tag: "직전월", key: prevMonthKey(y, m) },
  ];
  return refs.map((r) => ({ ...r, data: hist[r.key] }));
}
