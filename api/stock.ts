// 무료 스톡 사진 검색.
// 1순위: Pexels (PEXELS_API_KEY 있을 때, 고품질) → 2순위: Wikimedia Commons (키 불필요).
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
    // 키 불필요 폴백: Wikimedia Commons
    const wu = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q + " filetype:bitmap")}&gsrnamespace=6&gsrlimit=28&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=500&format=json&origin=*`;
    const r2 = await fetch(wu, { headers: { "User-Agent": "beautypark-librarylab-dashboard/1.0 (clinic marketing tool)" } });
    if (r2.ok) {
      const d = await r2.json();
      const pages = d?.query?.pages || {};
      const results = Object.values(pages)
        .filter((p: any) => p.imageinfo?.[0])
        .map((p: any) => {
          const ii = p.imageinfo[0];
          return { id: String(p.pageid), thumb: ii.thumburl || ii.url, url: ii.url, credit: String(p.title || "").replace(/^File:/, "") };
        });
      res.status(200).json({ via: "wikimedia", results });
      return;
    }
    res.status(200).json({ results: [], note: `stock ${r2.status}` });
  } catch (e: any) {
    res.status(200).json({ results: [], note: String(e?.message || e).slice(0, 120) });
  }
}
