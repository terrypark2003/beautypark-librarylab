// 캔바 연결 상태(토큰 노출 없음). configured=환경변수 여부, connected=로그인 여부.
import { isConfigured, getAccessToken, canvaFetch } from "./_canva";

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store"); // 연결 직후 상태가 캐시(304)로 묵지 않도록
  if (!isConfigured()) { res.status(200).json({ configured: false, connected: false }); return; }

  let token: string | null = null;
  try { token = await getAccessToken(req, res); } catch { token = null; }
  if (!token) { res.status(200).json({ configured: true, connected: false }); return; }

  let name: string | undefined;
  try {
    const r = await canvaFetch(token, "/users/me/profile");
    if (r.ok) name = (await r.json())?.profile?.display_name;
  } catch { /* 프로필은 부가정보 — 실패해도 연결은 유효 */ }

  res.status(200).json({ configured: true, connected: true, name });
}
