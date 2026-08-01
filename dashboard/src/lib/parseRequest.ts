import type ExcelJS from "exceljs";
import type { RequestData, EventGroup, EventItem } from "./types";

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "object" && v !== null && "result" in (v as any)) {
    v = (v as any).result;
  }
  if (typeof v === "number") return isNaN(v) ? null : Math.round(v);
  const s = String(v).replace(/[^0-9.]/g, "");
  if (!s) return null; // '?', '-', '미정' 등 숫자 없는 표기는 가격 미정으로
  const n = Number(s);
  return isNaN(n) ? null : Math.round(n);
}

function text(cell: ExcelJS.Cell): string {
  const v: any = cell?.value;
  if (v == null) return "";
  if (typeof v === "object") {
    if ("richText" in v) return v.richText.map((r: any) => r.text).join("").trim();
    if ("result" in v) return String(v.result).trim();
    if ("text" in v) return String(v.text).trim();
    return String(v).trim();
  }
  return String(v).trim();
}

const isMonthSheet = (n: string) => /^\d{4}\.\d{1,2}$/.test(n);

export async function loadWorkbook(
  buf: ArrayBuffer
): Promise<{ wb: ExcelJS.Workbook; sheets: string[]; monthSheets: string[] }> {
  const ExcelJSmod = (await import("exceljs")).default;
  const wb = new ExcelJSmod.Workbook();
  await wb.xlsx.load(buf);
  const sheets = wb.worksheets.map((w) => w.name);
  return { wb, sheets, monthSheets: sheets.filter(isMonthSheet) };
}

export function parseSheet(wb: ExcelJS.Workbook, sheetName: string): RequestData {
  const ws = wb.getWorksheet(sheetName);
  if (!ws) throw new Error(`시트를 찾을 수 없습니다: ${sheetName}`);
  const c = (addr: string) => ws.getCell(addr);

  const deliverables = {
    wide: `${text(c("F3"))} ${text(c("F4"))}`.trim(),
    list: `${text(c("G3"))} ${text(c("G4"))}`.trim(),
    instagram: text(c("H3")) || "인스타(2개)",
  };

  const groups: EventGroup[] = [];
  let current: EventGroup | null = null;
  let emphasis: string | null = null;

  // 세로 병합 셀 대응: ExcelJS는 병합 범위의 모든 셀이 대표(master) 값을 돌려주므로,
  // 대표 셀이 아닌 행을 새 그룹/새 항목으로 오인하지 않도록 이어짐 여부를 확인한다.
  const isMergedCont = (cell: ExcelJS.Cell) => cell.isMerged && (cell as any).master?.address !== cell.address;

  for (let r = 5; r <= ws.rowCount; r++) {
    const cellA = c(`A${r}`);
    const a = text(cellA);
    const aCont = isMergedCont(cellA); // 위 타이틀 셀의 병합 이어짐 행
    const cellB = c(`B${r}`);
    const b = isMergedCont(cellB) ? "" : text(cellB); // 병합 이어짐(예: 안내 블록)은 항목 아님
    if (a && (a.includes("월초") || a.includes("월 초 강조") || a.includes("월 중순") || a.includes("강조 :") || a.includes("강조:"))) {
      if (!aCont) emphasis = a;
      continue;
    }
    // 같은 타이틀이 반복 입력된 경우(병합 대신 채우기)도 새 그룹으로 쪼개지 않음
    if (a && !aCont && a !== groups[groups.length - 1]?.group) {
      current = { group: a, items: [] };
      groups.push(current);
    }
    if (b) {
      const item: EventItem = {
        name: b,
        normal: num(c(`C${r}`).value),
        event: num(c(`D${r}`).value),
        eventVat: num(c(`E${r}`).value),
        featured: !!c(`B${r}`).font?.bold,
      };
      if (!current) {
        current = { group: "(미분류)", items: [] };
        groups.push(current);
      }
      current.items.push(item);
    }
  }

  return {
    title: text(c("A1")) || `${sheetName} 디자인 작업 요청서`,
    sheet: sheetName,
    emphasis,
    deliverables,
    groups: groups.filter((g) => g.items.length),
  };
}
