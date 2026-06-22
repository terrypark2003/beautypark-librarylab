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
