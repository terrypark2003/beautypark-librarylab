// 로그인/관리자/사용로그 공통 헬퍼. 저장소: Vercel KV(Upstash Redis REST).
// 환경변수: KV_REST_API_URL, KV_REST_API_TOKEN (Vercel KV 연결 시 자동 주입)
//          ADMIN_PASSWORD (대표 관리자 비번), (선택) AUTH_SECRET (세션 암호화 키)
import crypto from "node:crypto";

const KV_URL = () => process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const KV_TOKEN = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
const secret = () => process.env.AUTH_SECRET || process.env.CANVA_SESSION_SECRET || KV_TOKEN() || "bp-dev-secret";

export const kvConfigured = () => !!(KV_URL() && KV_TOKEN());
export const adminConfigured = () => !!process.env.ADMIN_PASSWORD;
// 로그인 게이트는 KV + 관리자비번이 모두 설정됐을 때만 활성(잠금 사고 방지)
export const authConfigured = () => kvConfigured() && adminConfigured();

export async function kv(cmd: (string | number)[]): Promise<any> {
  const r = await fetch(KV_URL(), { method: "POST", headers: { Authorization: `Bearer ${KV_TOKEN()}`, "Content-Type": "application/json" }, body: JSON.stringify(cmd) });
  if (!r.ok) throw new Error(`kv ${r.status}: ${(await r.text()).slice(0, 120)}`);
  return (await r.json())?.result;
}

// ---- 직원 명부(단일 JSON 블롭) ----
export type Emp = { id: string; name: string; phone4: string; hash?: string; salt?: string; active?: boolean };
export async function getEmployees(): Promise<Record<string, Emp>> {
  const raw = await kv(["GET", "bp:employees"]);
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}
export const saveEmployees = (e: Record<string, Emp>) => kv(["SET", "bp:employees", JSON.stringify(e)]);

// ---- 사용 로그(리스트, 최근 1만건 유지) ----
export async function addLog(entry: { user: string; role: string; action: string; detail?: string }) {
  try { await kv(["LPUSH", "bp:logs", JSON.stringify({ ...entry, ts: Date.now() })]); await kv(["LTRIM", "bp:logs", 0, 9999]); } catch { /* 로그 실패는 무시 */ }
}
export async function getLogs(n = 800): Promise<any[]> {
  const arr = await kv(["LRANGE", "bp:logs", 0, n - 1]);
  return Array.isArray(arr) ? arr.map((s: string) => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean) : [];
}

// ---- 비밀번호 해시(scrypt) ----
export function hashPw(pw: string, salt?: string) {
  const s = salt || crypto.randomBytes(12).toString("hex");
  return { salt: s, hash: crypto.scryptSync(pw, s, 32).toString("hex") };
}
export function verifyPw(pw: string, salt: string, hash: string) {
  try { const h = crypto.scryptSync(pw, salt, 32).toString("hex"); return crypto.timingSafeEqual(Buffer.from(h), Buffer.from(hash)); } catch { return false; }
}

// ---- 세션 쿠키(AES-256-GCM) ----
const b64url = (b: Buffer) => b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const key = () => crypto.createHash("sha256").update(secret()).digest();
function seal(o: any) { const iv = crypto.randomBytes(12); const c = crypto.createCipheriv("aes-256-gcm", key(), iv); const d = Buffer.concat([c.update(JSON.stringify(o), "utf8"), c.final()]); return b64url(Buffer.concat([iv, c.getAuthTag(), d])); }
function unseal<T = any>(t: string): T | null { try { const raw = Buffer.from(t.replace(/-/g, "+").replace(/_/g, "/"), "base64"); const iv = raw.subarray(0, 12), tag = raw.subarray(12, 28), d = raw.subarray(28); const dc = crypto.createDecipheriv("aes-256-gcm", key(), iv); dc.setAuthTag(tag); return JSON.parse(Buffer.concat([dc.update(d), dc.final()]).toString("utf8")); } catch { return null; } }

export const SESSION = "bp_session";
export type Session = { uid: string; name: string; role: "employee" | "admin"; mustSet?: boolean; t: number };
export const setSessionCookie = (s: Session) => `${SESSION}=${seal(s)}; Path=/; Max-Age=${60 * 60 * 24 * 14}; HttpOnly; Secure; SameSite=Lax`;
export const clearSessionCookie = () => `${SESSION}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
export function readSession(req: any): Session | null {
  const c = String(req.headers.cookie || "").split(";").map((p) => p.trim()).find((p) => p.startsWith(SESSION + "="));
  return c ? unseal<Session>(decodeURIComponent(c.slice(SESSION.length + 1))) : null;
}
