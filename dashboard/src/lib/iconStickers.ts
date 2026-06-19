// Iconify 공개 API로 '디자인된' 컬러 벡터 스티커를 검색.
// 무료·키 불필요·CORS 허용. 결과를 dataURL(SVG)로 변환해 이미지 스티커로 사용한다.
// 컬러 이모지/일러스트 세트 위주로 제한해 '캔바 느낌' 요소만 노출.
const PREFIXES = "noto,fluent-emoji-flat,openmoji,twemoji,emojione,fxemoji,streamline-emojis";

export interface IconResult { id: string; thumb: string }

const api = "https://api.iconify.design";
const path = (id: string) => id.replace(":", "/");

export function iconThumb(id: string): string {
  return `${api}/${path(id)}.svg?height=72`;
}

export async function searchIcons(query: string): Promise<{ icons: IconResult[]; note?: string }> {
  const q = query.trim();
  if (!q) return { icons: [] };
  try {
    const r = await fetch(`${api}/search?query=${encodeURIComponent(q)}&limit=96&prefixes=${PREFIXES}`);
    if (!r.ok) return { icons: [], note: `검색 실패 (${r.status})` };
    const d = await r.json();
    const ids: string[] = Array.isArray(d?.icons) ? d.icons : [];
    return { icons: ids.map((id) => ({ id, thumb: iconThumb(id) })) };
  } catch (e: any) {
    return { icons: [], note: `검색 오류: ${e?.message || e}` };
  }
}

// 선택한 아이콘 SVG를 받아 dataURL로 변환(html-to-image 캡처 안전).
export async function iconToDataUrl(id: string): Promise<string> {
  const r = await fetch(`${api}/${path(id)}.svg?height=240`);
  if (!r.ok) throw new Error(`아이콘 로드 실패 (${r.status})`);
  const svg = await r.text();
  const b64 = btoa(String.fromCharCode(...new TextEncoder().encode(svg)));
  return `data:image/svg+xml;base64,${b64}`;
}
