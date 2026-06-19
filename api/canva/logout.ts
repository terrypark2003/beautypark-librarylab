// 캔바 연결 해제: 세션 쿠키(청크 포함) 삭제.
import { sessionClearCookies } from "./_canva";

export default async function handler(_req: any, res: any) {
  res.setHeader("Set-Cookie", sessionClearCookies());
  res.status(200).json({ ok: true });
}
