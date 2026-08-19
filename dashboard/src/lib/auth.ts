export type Me = {
  configured: boolean;
  user: { name: string; role: "employee" | "admin"; mustSet: boolean } | null;
};

export async function fetchMe(): Promise<Me> {
  try {
    const r = await fetch("/api/auth?action=me", { cache: "no-store" });
    return await r.json();
  } catch {
    return { configured: false, user: null };
  }
}

// 주요 동작 사용 로그(현재 로그인 사용자) — 실패해도 무시(fire-and-forget)
export function logAction(action: string, detail?: string) {
  fetch("/api/auth?action=log", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, detail }) }).catch(() => {});
}

// ---- 이벤트 반응(월별·그룹별 상/중/하 + 메모) ----
export type FeedbackEntry = { rating: "상" | "중" | "하" | ""; note?: string; by?: string; ts?: number };
export type FeedbackMap = Record<string, Record<string, FeedbackEntry>>; // "YYYY.M" → 그룹명 → 반응

export async function fetchFeedback(): Promise<FeedbackMap> {
  try {
    const r = await fetch("/api/auth?action=feedback-get", { cache: "no-store" });
    const d = await r.json();
    return d.feedback || {};
  } catch { return {}; }
}

export async function saveFeedbackEntry(month: string, group: string, rating: string, note: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const r = await fetch("/api/auth?action=feedback-set", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ month, group, rating, note }) });
    const d = await r.json().catch(() => ({}));
    return r.ok ? { ok: true } : { ok: false, error: d.error || `저장 실패 (${r.status})` };
  } catch (e) { return { ok: false, error: String(e) }; }
}

// 그룹명 정규화(줄바꿈·공백 차이로 키가 어긋나지 않게)
export const fbKey = (group: string) => group.replace(/\s+/g, " ").trim();
