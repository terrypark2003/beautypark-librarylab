// 이미지 프록시: 외부 스톡 이미지를 같은 도메인으로 가져와 CORS 문제 없이 합성/다운로드 가능하게 함.
export default async function handler(req: any, res: any) {
  const url = String(req.query?.url || "");
  if (!/^https:\/\//.test(url)) { res.status(400).send("bad url"); return; }
  try {
    const r = await fetch(url, { headers: { "User-Agent": "beautypark-dashboard/1.0" } });
    if (!r.ok) { res.status(502).send("fetch fail"); return; }
    const ct = r.headers.get("content-type") || "image/jpeg";
    if (!ct.startsWith("image/")) { res.status(415).send("not image"); return; }
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader("content-type", ct);
    res.setHeader("cache-control", "public, max-age=86400");
    res.setHeader("access-control-allow-origin", "*");
    res.status(200).send(buf);
  } catch (e: any) {
    res.status(502).send("err");
  }
}
