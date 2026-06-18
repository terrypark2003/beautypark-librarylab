// 무료 스톡 사진 검색. PEXELS_API_KEY 있으면 Pexels(고품질), 없으면 Openverse(키 불필요).
export default async function handler(req: any, res: any) {
  const q = String(req.query?.q || "").trim();
  const orient = String(req.query?.orient || "");
  if (!q) { res.status(200).json({ results: [] }); return; }

  const pexels = process.env.PEXELS_API_KEY;
  try {
    if (pexels) {
      const u = `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=28${orient ? `&orientation=${orient}` : ""}`;
      const r = await fetch(u, { headers: { Authorization: pexels } });
      if (r.ok) {
        const d = await r.json();
        res.status(200).json({
          via: "pexels",
          results: (d.photos || []).map((p: any) => ({ id: String(p.id), thumb: p.src?.medium, url: p.src?.large2x || p.src?.large || p.src?.original, credit: p.photographer || "Pexels" })),
        });
        return;
      }
    }
    const r2 = await fetch(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&page_size=28&mature=false`, {
      headers: { "User-Agent": "beautypark-dashboard/1.0" },
    });
    if (r2.ok) {
      const d = await r2.json();
      res.status(200).json({
        via: "openverse",
        results: (d.results || []).map((x: any) => ({ id: String(x.id), thumb: x.thumbnail || x.url, url: x.url, credit: x.creator || "Openverse" })),
      });
      return;
    }
    res.status(200).json({ results: [], note: `stock ${r2.status}` });
  } catch (e: any) {
    res.status(200).json({ results: [], note: String(e?.message || e).slice(0, 120) });
  }
}
