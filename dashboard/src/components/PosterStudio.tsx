import { useEffect, useMemo, useRef, useState } from "react";
import type { Workbook } from "exceljs";
import { toPng } from "html-to-image";
import type { RequestData } from "../lib/types";
import { sampleData } from "../lib/sample";
import { loadWorkbook, parseSheet } from "../lib/parseRequest";
import { THEME_LIST, themeKeyForGroup } from "../lib/themes";
import { Poster } from "./Poster";

const sanitize = (s: string) => s.replace(/[\\/:*?"<>|\n]/g, "").replace(/\s+/g, "").slice(0, 40);

export default function PosterStudio() {
  const [data, setData] = useState<RequestData>(() => sampleData());
  const [source, setSource] = useState("샘플 · 2026.6");
  const [wb, setWb] = useState<Workbook | null>(null);
  const [monthSheets, setMonthSheets] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [themes, setThemes] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const captureRef = useRef<HTMLDivElement>(null);
  const [cap, setCap] = useState<{ gi: number; name: string } | null>(null);

  const themeFor = (gi: number) => themes[gi] ?? themeKeyForGroup(data.groups[gi]?.group ?? "");

  // 업로드/시트 변경 시 테마 초기화
  useMemo(() => setThemes({}), [data]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const buf = await file.arrayBuffer();
      const { wb, monthSheets } = await loadWorkbook(buf);
      const target = monthSheets[0] ?? wb.worksheets[0]?.name;
      setWb(wb);
      setMonthSheets(monthSheets);
      setData(parseSheet(wb, target));
      setSource(`${file.name} · ${target}`);
    } catch (err) {
      setError(`엑셀을 읽지 못했습니다: ${(err as Error).message}`);
    }
  }
  function onSheet(e: React.ChangeEvent<HTMLSelectElement>) {
    if (!wb) return;
    setData(parseSheet(wb, e.target.value));
    setSource(`${source.split(" · ")[0]} · ${e.target.value}`);
  }

  // 캡처 → PNG 다운로드
  useEffect(() => {
    if (!cap) return;
    let cancelled = false;
    (async () => {
      try {
        await (document as any).fonts?.ready;
        await new Promise((r) => setTimeout(r, 120));
        const node = captureRef.current;
        if (node && !cancelled) {
          const url = await toPng(node, { pixelRatio: 2, width: 1080, height: 1527, cacheBust: true });
          const a = document.createElement("a");
          a.href = url;
          a.download = cap.name;
          a.click();
        }
      } catch (e) {
        setError(`PNG 생성 실패: ${(e as Error).message}`);
      } finally {
        if (!cancelled) setCap(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cap]);

  function downloadOne(gi: number) {
    const g = data.groups[gi];
    setCap({ gi, name: `뷰티파크_${data.sheet}_${sanitize(g.group)}.png` });
  }

  async function downloadAll() {
    setBusy(true);
    for (let gi = 0; gi < data.groups.length; gi++) {
      const g = data.groups[gi];
      await new Promise<void>((resolve) => {
        setCap({ gi, name: `뷰티파크_${data.sheet}_${sanitize(g.group)}.png` });
        const check = setInterval(() => {
          if (captureRef.current === null) return;
          resolve();
          clearInterval(check);
        }, 50);
        setTimeout(() => resolve(), 1500); // 안전 타임아웃
      });
      await new Promise((r) => setTimeout(r, 250));
    }
    setBusy(false);
  }

  return (
    <div className="space-y-7">
      {/* 업로드 바 */}
      <div className="rounded-xl border border-taupe/20 bg-ivory p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl text-charcoal">{data.title}</h2>
            <p className="text-sm text-charcoal/60">입력 소스: {source} · 이벤트 {data.groups.length}개 → 포스터 {data.groups.length}장</p>
          </div>
          <div className="flex items-center gap-2">
            {monthSheets.length > 1 && (
              <select onChange={onSheet} defaultValue={data.sheet} className="rounded-md border border-taupe/40 bg-white px-2 py-1.5 text-sm">
                {monthSheets.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}
            <input ref={fileRef} type="file" accept=".xlsx" onChange={onFile} className="hidden" />
            <button onClick={() => fileRef.current?.click()} className="rounded-md bg-taupe px-4 py-2 text-sm font-semibold text-white transition hover:bg-taupe-deep">
              디자인 작업 요청서(.xlsx) 업로드
            </button>
            <button onClick={downloadAll} disabled={busy} className="rounded-md border border-taupe/40 bg-white px-4 py-2 text-sm font-semibold text-taupe-deep transition hover:bg-taupe/10 disabled:opacity-50">
              {busy ? "생성 중…" : "전체 PNG 다운로드"}
            </button>
          </div>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      {/* 포스터 그리드 */}
      <div className="grid gap-7 md:grid-cols-2 xl:grid-cols-3">
        {data.groups.map((g, gi) => (
          <div key={gi} className="flex flex-col items-center gap-3">
            <div className="poster-scale">
              <Poster group={g} themeKey={themeFor(gi)} sheet={data.sheet} />
            </div>
            <div className="flex w-[360px] items-center gap-2">
              <select
                value={themeFor(gi)}
                onChange={(e) => setThemes((m) => ({ ...m, [gi]: e.target.value }))}
                className="flex-1 rounded-md border border-taupe/40 bg-white px-2 py-1.5 text-xs"
              >
                {THEME_LIST.map((t) => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
              <button onClick={() => downloadOne(gi)} className="rounded-md bg-taupe px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-taupe-deep">
                PNG 다운로드
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 캡처용 숨김 풀사이즈 포스터 */}
      <div style={{ position: "fixed", left: -20000, top: 0, pointerEvents: "none" }} aria-hidden>
        {cap && <Poster ref={captureRef} group={data.groups[cap.gi]} themeKey={themeFor(cap.gi)} sheet={data.sheet} />}
      </div>
    </div>
  );
}
