// 캔바 로그인 시작: PKCE 생성 → authorize로 302 리다이렉트.
import { AUTHORIZE_URL, SCOPES, PKCE, clientId, isConfigured, redirectUri, makePkce, randomState, seal, cookie } from "./_canva";

export default async function handler(req: any, res: any) {
  if (!isConfigured()) { res.status(503).json({ error: "Canva 환경변수가 설정되지 않았습니다" }); return; }
  const { verifier, challenge } = makePkce();
  const state = randomState();
  const redirect = redirectUri(req);

  res.setHeader("Set-Cookie", cookie(PKCE, seal({ v: verifier, s: state, r: redirect }), 600, "/api/canva"));

  const u = new URL(AUTHORIZE_URL);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("client_id", clientId());
  u.searchParams.set("redirect_uri", redirect);
  u.searchParams.set("scope", SCOPES.join(" "));
  u.searchParams.set("code_challenge", challenge);
  u.searchParams.set("code_challenge_method", "S256");
  u.searchParams.set("state", state);

  res.statusCode = 302;
  res.setHeader("Location", u.toString());
  res.end();
}
