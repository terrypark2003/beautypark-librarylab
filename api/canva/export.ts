// 포스터 PNG(dataURL) → 캔바 에셋 업로드 → 디자인 생성 → 편집 URL 반환.
// 무료 플랜에서도 동작(브랜드 템플릿 자동완성과 별개).
import { isConfigured, getAccessToken, canvaFetch } from "./_canva";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") { res.status(405).json({ error: "POST only" }); return; }
  if (!isConfigured()) { res.status(503).json({ error: "Canva 미설정" }); return; }

  let token: string | null = null;
  try { token = await getAccessToken(req, res); }
  catch (e: any) { res.status(401).json({ error: "토큰 갱신 실패: " + String(e?.message || e).slice(0, 120) }); return; }
  if (!token) { res.status(401).json({ error: "캔바에 연결되어 있지 않습니다" }); return; }

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  const title: string = String(body?.title || "뷰티파크 포스터").slice(0, 80);
  const width = Math.round(Number(body?.width)) || 1080;
  const height = Math.round(Number(body?.height)) || 1527;
  const m = /^data:image\/\w+;base64,(.+)$/s.exec(String(body?.imageDataUrl || ""));
  if (!m) { res.status(400).json({ error: "imageDataUrl(png) 필요" }); return; }
  const bytes = Buffer.from(m[1], "base64");

  try {
    // 1) 에셋 업로드 잡 생성 (octet-stream + Base64 파일명 메타데이터)
    const up = await canvaFetch(token, "/asset-uploads", {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Asset-Upload-Metadata": JSON.stringify({ name_base64: Buffer.from(`${title}.png`).toString("base64") }),
      },
      body: bytes,
    });
    const upText = await up.text();
    if (!up.ok) { res.status(502).json({ error: `에셋 업로드 ${up.status}: ${upText.slice(0, 200)}` }); return; }

    // 2) 잡 완료까지 폴링
    let job = safeJson(upText)?.job;
    for (let i = 0; i < 25 && job && job.status !== "success" && job.status !== "failed"; i++) {
      await new Promise((r) => setTimeout(r, 600));
      const jr = await canvaFetch(token, `/asset-uploads/${job.id}`);
      job = safeJson(await jr.text())?.job;
    }
    if (!job || job.status !== "success" || !job.asset?.id) {
      res.status(504).json({ error: `에셋 처리 실패: ${job?.status || "timeout"}` }); return;
    }

    // 3) 커스텀 사이즈 디자인 생성(에셋 포함)
    const dr = await canvaFetch(token, "/designs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ design_type: { type: "custom", width, height }, asset_id: job.asset.id, title }),
    });
    const drText = await dr.text();
    if (!dr.ok) { res.status(502).json({ error: `디자인 생성 ${dr.status}: ${drText.slice(0, 200)}` }); return; }
    const design = safeJson(drText)?.design;

    res.status(200).json({ editUrl: design?.urls?.edit_url, viewUrl: design?.urls?.view_url, designId: design?.id });
  } catch (e: any) {
    res.status(500).json({ error: String(e?.message || e).slice(0, 200) });
  }
}

function safeJson(t: string): any { try { return JSON.parse(t); } catch { return null; } }
