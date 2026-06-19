// 캔바 연결 해제: 세션 쿠키 삭제.
import { SESSION, clearCookie } from "./_canva";

export default async function handler(_req: any, res: any) {
  res.setHeader("Set-Cookie", clearCookie(SESSION));
  res.status(200).json({ ok: true });
}
