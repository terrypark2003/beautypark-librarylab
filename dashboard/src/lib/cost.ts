// AI 사용 비용 추정 추적(브라우저 localStorage). 서버가 호출마다 cost(USD)를 돌려주면 이번 달에 누적.
// Anthropic은 '잔액' API가 없어, 예산(사용자 입력) − 누적 사용액 으로 '남은 금액'을 계산한다.

export const KRW_PER_USD = 1400; // 표시용 근사 환율

const SPEND_KEY = "bp_ai_spend"; // { "2026-06": { usd, calls } }
const BUDGET_KEY = "bp_ai_budget_usd"; // number | ""

export interface MonthSpend { usd: number; calls: number }
type SpendMap = Record<string, MonthSpend>;

export function curMonth(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function readMap(): SpendMap {
  try { return JSON.parse(localStorage.getItem(SPEND_KEY) || "{}") || {}; } catch { return {}; }
}
function writeMap(m: SpendMap) {
  try { localStorage.setItem(SPEND_KEY, JSON.stringify(m)); } catch { /* quota/private mode */ }
  window.dispatchEvent(new Event("bp-spend"));
}

export function getSpend(month = curMonth()): MonthSpend {
  return readMap()[month] || { usd: 0, calls: 0 };
}

/** 한 번의 AI 호출 비용(USD)을 이번 달에 더한다. cost<=0 이면 호출 수만 증가. */
export function addSpend(usd: number, month = curMonth()) {
  if (!isFinite(usd) || usd < 0) usd = 0;
  const m = readMap();
  const cur = m[month] || { usd: 0, calls: 0 };
  m[month] = { usd: cur.usd + usd, calls: cur.calls + 1 };
  writeMap(m);
}

export function resetSpend(month = curMonth()) {
  const m = readMap();
  delete m[month];
  writeMap(m);
}

export function getBudgetUsd(): number | null {
  const v = localStorage.getItem(BUDGET_KEY);
  if (v == null || v === "") return null;
  const n = Number(v);
  return isFinite(n) && n > 0 ? n : null;
}
export function setBudgetUsd(v: number | null) {
  if (v == null || !isFinite(v) || v <= 0) localStorage.removeItem(BUDGET_KEY);
  else localStorage.setItem(BUDGET_KEY, String(v));
  window.dispatchEvent(new Event("bp-spend"));
}

export const usd = (n: number) => `$${n < 0.01 && n > 0 ? n.toFixed(4) : n.toFixed(2)}`;
export const krw = (nUsd: number) => `${Math.round(nUsd * KRW_PER_USD).toLocaleString("ko-KR")}원`;
