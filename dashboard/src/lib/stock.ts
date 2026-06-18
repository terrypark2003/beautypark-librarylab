export interface StockPhoto { id: string; thumb: string; url: string; credit: string }

export async function searchStock(q: string, orient = "portrait"): Promise<{ results: StockPhoto[]; via?: string; note?: string }> {
  try {
    const r = await fetch(`/api/stock?q=${encodeURIComponent(q)}&orient=${orient}`);
    if (r.ok) {
      const d = await r.json();
      return { results: d.results || [], via: d.via, note: d.note };
    }
  } catch {
    /* 폴백 */
  }
  return { results: [], note: "검색 실패 (서버 미연결)" };
}

// 외부 이미지를 프록시 통해 dataURL로 가져와 포스터에 합성·다운로드 가능하게 함
export async function stockToDataUrl(url: string): Promise<string> {
  const r = await fetch(`/api/stock-img?url=${encodeURIComponent(url)}`);
  if (!r.ok) throw new Error("이미지를 불러오지 못했습니다");
  const blob = await r.blob();
  return await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
}
