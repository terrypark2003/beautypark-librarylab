import raw from "../data/2026-07.json";
import type { RequestData } from "./types";

// tools/parse_request.py 가 만든 JSON(한글 키)을 RequestData 형태로 변환한 기본 샘플.
export function sampleData(): RequestData {
  const s: any = raw;
  const d = s.deliverables || {};
  return {
    title: s.title,
    sheet: s.sheet,
    emphasis: s.emphasis,
    deliverables: {
      wide: `플친 와이드 ${d["플친 와이드"] ?? ""}`.trim(),
      list: `플친 리스트 ${d["플친 리스트"] ?? ""}`.trim(),
      instagram: "인스타(2개)",
    },
    groups: (s.event_groups || []).map((g: any) => ({
      group: g.group,
      items: (g.items || []).map((it: any) => ({
        name: it.name,
        normal: it["정상가"] ?? null,
        event: it["이벤트가"] ?? null,
        eventVat: it["이벤트가_VAT포함"] ?? null,
        featured: !!it.featured,
      })),
    })),
  };
}
