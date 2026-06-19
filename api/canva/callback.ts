// 캔바 OAuth 콜백: code → 토큰 교환 → 세션 쿠키 설정 → 앱으로 복귀.
import { PKCE, isConfigured, parseCookies, unseal, exchangeCode, sessionToCookie, clearCookie } from "./_canva";

export default async function handler(req: any, res: any) {
  const back = (ok: boolean, msg?: string) => {
    res.statusCode = 302;
    res.setHeader("Location", `/?canva=${ok ? "connected" : "error"}${msg ? `&msg=${encodeURIComponent(msg)}` : ""}`);
    res.end();
  };

  if (!isConfigured()) { back(false, "미설정"); return; }

  const code = String(req.query?.code || "");
  const state = String(req.query?.state || "");
  if (req.query?.error) { back(false, String(req.query.error)); return; }

  const raw = parseCookies(req)[PKCE];
  const pkce = raw ? unseal<{ v: string; s: string; r: string }>(raw) : null;
  if (!code || !pkce || !state || state !== pkce.s) { back(false, "state 불일치"); return; }

  try {
    const tok = await exchangeCode(code, pkce.v, pkce.r);
    res.setHeader("Set-Cookie", [sessionToCookie(tok), clearCookie(PKCE, "/api/canva")]);
    back(true);
  } catch (e: any) {
    back(false, String(e?.message || e).slice(0, 120));
  }
}
