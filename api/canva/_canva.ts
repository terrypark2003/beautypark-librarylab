// 캔바 Connect API 공통 헬퍼 (OAuth 2.0 + PKCE).
// 환경변수: CANVA_CLIENT_ID, CANVA_CLIENT_SECRET, (선택) CANVA_REDIRECT_URI, CANVA_SESSION_SECRET
// 문서: https://www.canva.dev/docs/connect/authentication/
import crypto from "node:crypto";

export const AUTHORIZE_URL = "https://www.canva.com/api/oauth/authorize";
export const TOKEN_URL = "https://api.canva.com/rest/v1/oauth/token";
export const API_BASE = "https://api.canva.com/rest/v1";

// MVP 스코프: 프로필 읽기 + 에셋 업로드 + 디자인 생성/열기.
// (브랜드 템플릿 자동완성은 유료 플랜 + brandtemplate 스코프 추가가 필요 — 2단계)
export const SCOPES = ["profile:read", "asset:write", "design:content:write", "design:meta:read"];

export const SESSION = "canva_session";
export const PKCE = "canva_pkce";

export const clientId = () => process.env.CANVA_CLIENT_ID || "";
export const clientSecret = () => process.env.CANVA_CLIENT_SECRET || "";
const sessionSecret = () => process.env.CANVA_SESSION_SECRET || process.env.CANVA_CLIENT_SECRET || "";
export const isConfigured = () => !!(clientId() && clientSecret() && sessionSecret());

export function redirectUri(req: any): string {
  if (process.env.CANVA_REDIRECT_URI) return process.env.CANVA_REDIRECT_URI;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = (req.headers["x-forwarded-proto"] as string) || "https";
  return `${proto}://${host}/api/canva/callback`;
}

// ---- base64url ----
const b64url = (b: Buffer) => b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

// ---- PKCE (S256) ----
export function makePkce() {
  const verifier = b64url(crypto.randomBytes(48));
  const challenge = b64url(crypto.createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}
export const randomState = () => b64url(crypto.randomBytes(16));

// ---- 쿠키 봉인(AES-256-GCM) : httpOnly 쿠키 값까지 암호화해 토큰 노출 방지 ----
const key = () => crypto.createHash("sha256").update(sessionSecret()).digest();
export function seal(obj: any): string {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([c.update(JSON.stringify(obj), "utf8"), c.final()]);
  return b64url(Buffer.concat([iv, c.getAuthTag(), data]));
}
export function unseal<T = any>(token: string): T | null {
  try {
    const raw = Buffer.from(token.replace(/-/g, "+").replace(/_/g, "/"), "base64");
    const iv = raw.subarray(0, 12), tag = raw.subarray(12, 28), data = raw.subarray(28);
    const d = crypto.createDecipheriv("aes-256-gcm", key(), iv);
    d.setAuthTag(tag);
    return JSON.parse(Buffer.concat([d.update(data), d.final()]).toString("utf8")) as T;
  } catch { return null; }
}

// ---- 쿠키 ----
export function parseCookies(req: any): Record<string, string> {
  const out: Record<string, string> = {};
  String(req.headers.cookie || "").split(";").forEach((p) => {
    const i = p.indexOf("=");
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
export const cookie = (name: string, value: string, maxAge: number, path = "/") =>
  `${name}=${encodeURIComponent(value)}; Path=${path}; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
export const clearCookie = (name: string, path = "/") =>
  `${name}=; Path=${path}; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;

// ---- 토큰 교환 / 갱신 ----
const basicAuth = () => "Basic " + Buffer.from(`${clientId()}:${clientSecret()}`).toString("base64");
type TokenResp = { access_token: string; refresh_token: string; expires_in: number; token_type: string; scope: string };

async function tokenRequest(body: URLSearchParams): Promise<TokenResp> {
  const r = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { Authorization: basicAuth(), "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`token ${r.status}: ${text.slice(0, 200)}`);
  return JSON.parse(text);
}
export const exchangeCode = (code: string, verifier: string, redirect: string) =>
  tokenRequest(new URLSearchParams({ grant_type: "authorization_code", code, code_verifier: verifier, redirect_uri: redirect }));
export const refresh = (refreshToken: string) =>
  tokenRequest(new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }));

// ---- 세션 (캔바 토큰이 단일 쿠키 4KB 한도를 넘을 수 있어 여러 청크로 분할 저장) ----
export type Session = { a: string; r: string; e: number };
const SESSION_MAXAGE = 60 * 60 * 24 * 30;
const CHUNK = 3000;
const MAX_CHUNKS = 8;

function chunkSet(name: string, value: string, maxAge: number): string[] {
  const out: string[] = [];
  let idx = 0;
  for (let i = 0; i < value.length; i += CHUNK, idx++) out.push(cookie(`${name}${idx}`, value.slice(i, i + CHUNK), maxAge));
  for (let i = idx; i < MAX_CHUNKS; i++) out.push(clearCookie(`${name}${i}`)); // 이전 잔여 청크 정리
  out.push(clearCookie(name)); // 구버전 단일 쿠키 정리
  return out;
}
function chunkRead(req: any, name: string): string | null {
  const c = parseCookies(req);
  let out = "", i = 0;
  while (c[`${name}${i}`] !== undefined) { out += c[`${name}${i}`]; i++; }
  return out || c[name] || null;
}

export const sessionSetCookies = (t: TokenResp): string[] =>
  chunkSet(SESSION, seal({ a: t.access_token, r: t.refresh_token, e: Date.now() + (t.expires_in - 60) * 1000 } as Session), SESSION_MAXAGE);
export function sessionClearCookies(): string[] {
  const out = [clearCookie(SESSION)];
  for (let i = 0; i < MAX_CHUNKS; i++) out.push(clearCookie(`${SESSION}${i}`));
  return out;
}
export const readSession = (req: any): Session | null => {
  const raw = chunkRead(req, SESSION);
  return raw ? unseal<Session>(raw) : null;
};

// 유효한 액세스 토큰 반환(만료 시 자동 갱신 후 세션 쿠키 재설정). 없으면 null.
export async function getAccessToken(req: any, res: any): Promise<string | null> {
  const s = readSession(req);
  if (!s) return null;
  if (Date.now() < s.e) return s.a;
  const t = await refresh(s.r);
  res.setHeader("Set-Cookie", sessionSetCookies(t));
  return t.access_token;
}

export const canvaFetch = (token: string, path: string, init: any = {}) =>
  fetch(`${API_BASE}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.headers || {}) } });
