import raw from "../data/history.json";

export interface HItem { name: string; event: number | null; normal: number | null }
export interface HGroup { group: string; items: HItem[] }
export interface HMonth { title: string; emphasis: string; groups: HGroup[] }

// 시트 월 표기가 섞여 있어(2025.08 vs 2026.7) 키를 '연.월(앞자리0 제거)'로 정규화
export const history: Record<string, HMonth> = {};
for (const [k, v] of Object.entries(raw as Record<string, HMonth>)) {
  const [y, m] = k.split(".").map(Number);
  if (!isNaN(y) && !isNaN(m) && (v as any).groups) history[`${y}.${m}`] = v;
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

/** 기획 참고용: 동월 작년·재작년 + 직전월 */
export function references(y: number, m: number): { tag: string; key: string; data?: HMonth }[] {
  const refs = [
    { tag: "작년 동월", key: key(y - 1, m) },
    { tag: "재작년 동월", key: key(y - 2, m) },
    { tag: "직전월", key: prevMonthKey(y, m) },
  ];
  return refs.map((r) => ({ ...r, data: history[r.key] }));
}
