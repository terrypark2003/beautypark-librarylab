// 수가표(가격표) 파서 — 사용자가 올린 엑셀에서 '사용명칭→가격'을 추출.
// 시술명 자동완성 + 가격 자동입력에 사용. 브라우저 localStorage에만 저장(깃 비커밋).
import type { Workbook } from "exceljs";

export type PriceBook = Record<string, { normal: number | null; event: number | null }>;
const KEY = "bp_pricebook";

// 앞에 붙는 "26년 6월E)", "26년 6월 화수목E)" 같은 이벤트 접두어 제거
export function cleanTxName(s: string): string {
  return String(s ?? "")
    .replace(/^\s*\d{2,4}\s*년\s*\d{1,2}\s*월[^)]*\)\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

const toText = (v: any): string => {
  if (v == null) return "";
  if (typeof v === "object") return String(v.text ?? v.result ?? "").trim();
  return String(v).trim();
};
const toNum = (v: any): number => {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "object") v = v.result ?? v.text ?? "";
  const n = Number(String(v).replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
};
const preVat = (x: number) => Math.round(x / 1.1); // 부가세 포함 → 부가세 전

export function parsePriceBook(wb: Workbook): PriceBook {
  const book: PriceBook = {};
  for (const ws of wb.worksheets) {
    let headerRow = -1, nameCol = -1, priceCol = -1, flagCol = -1;
    ws.eachRow((row, rn) => {
      if (headerRow >= 0 || rn > 8) return;
      const cells = (row.values as any[]) || [];
      let ni = -1, pi = -1, fi = -1;
      for (let c = 1; c < cells.length; c++) {
        const t = toText(cells[c]);
        if (ni < 0 && /(사용\s*명칭|시술\s*명|상품\s*명|품목|명칭|제품명)/.test(t)) ni = c;
        if (pi < 0 && /(티켓\s*가격|가격|금액|수가|단가)/.test(t)) pi = c;
        if (fi < 0 && /flag|노출|view/i.test(t)) fi = c;
      }
      if (ni >= 0 && pi >= 0) { headerRow = rn; nameCol = ni; priceCol = pi; flagCol = fi; }
    });
    if (headerRow < 0) continue;

    const agg: Record<string, { y: number[]; n: number[] }> = {};
    ws.eachRow((row, rn) => {
      if (rn <= headerRow) return;
      const cells = (row.values as any[]) || [];
      const name = cleanTxName(toText(cells[nameCol]));
      if (!name) return;
      const price = toNum(cells[priceCol]);
      const flag = flagCol >= 0 ? toText(cells[flagCol]).toUpperCase() : "Y";
      const g = (agg[name] = agg[name] || { y: [], n: [] });
      (flag === "N" ? g.n : g.y).push(price);
    });
    for (const [name, g] of Object.entries(agg)) {
      // 이벤트가 = 노출(Y) 가격 중 최저 양수, 없으면 N 중 최저 양수
      const ev = [...g.y].filter((p) => p > 0).sort((a, b) => a - b)[0] ?? [...g.n].filter((p) => p > 0).sort((a, b) => a - b)[0];
      if (!ev) continue;
      // 정상가 = 이벤트가보다 큰 N 가격 중 가장 가까운 값(보통 1회 정상가)
      const nm = [...g.n].filter((p) => p > ev).sort((a, b) => a - b)[0];
      book[name] = { event: preVat(ev), normal: nm ? preVat(nm) : null };
    }
  }
  return book;
}

export function loadPriceBook(): PriceBook {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}
export function savePriceBook(b: PriceBook) {
  try { localStorage.setItem(KEY, JSON.stringify(b)); } catch { /* 용량 초과 등 무시 */ }
}
