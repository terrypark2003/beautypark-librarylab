import { useEffect, useMemo, useRef, useState } from "react";
import type { Workbook } from "exceljs";
import { toPng } from "html-to-image";
import type { RequestData } from "../lib/types";
import { sampleData } from "../lib/sample";
import { loadWorkbook, parseSheet } from "../lib/parseRequest";
import { THEME_LIST, themeKeyForGroup } from "../lib/themes";
import { Poster } from "./Poster";

const sanitize = (s: string) => s.replace(/[\\/:*?"<>|\n]/g, "").replace(/\s+/g, "").slice(0, 40);
type Plate = { url: string; top: number };

export default function PosterStudio() {
  const [data, setData] = useState<RequestData>(() => sampleData());
  const [source, setSource] = useState("샘플 · 2026.6");
  const [wb, setWb] = useState<Workbook | null>(null);
  const [monthSheets, setMonthSheets] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [themes, setThemes] = useState<Record<number, string>>({});
  const [plates, setPlates] = useState<Record<number, Plate>>({});
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const captureRef = useRef<HTMLDivElement>(null);
  const [cap, setCap] = useState<{ gi: number; name: string } | null>(null);

  const themeFor = (gi: number) => themes[gi] ?? themeKeyForGroup(data.groups[gi]?.group ?? "");

  useMemo(() => {
    setThemes({});
    setPlates({});
  }, [data]);

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

  function onPlate(gi: number, file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPlates((p) => ({ ...p, [gi]: { url: String(reader.result), top: p[gi]?.top ?? 560 } }));
    reader.readAsDataURL(file);
  }
  function setTop(gi: number, top: number) {
    setPlates((p) => (p[gi] ? { ...p, [gi]: { ...p[gi], top } } : p));
  }
  function removePlate(gi: number) {
    setPlates((p) => {
      const n = { ...p };
      delete n[gi];
      return n;
    });
  }

  useEffect(() => {
    if (!cap) return;
    let cancelled = false;
    (async () => {
      try {
        await (document as any).fonts?.ready;
        await new Promise((r) => setTimeout(r, 140));
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
    setCap({ gi, name: `뷰티파크_${data.sheet}_${sanitize(data.groups[gi].group)}.png` });
  }
  async function downloadAll() {
    setBusy(true);
    for (let gi = 0; gi < data.groups.length; gi++) {
      await new Promise<void>((resolve) => {
        setCap({ gi, name: `뷰티파크_${data.sheet}_${sanitize(data.groups[gi].group)}.png` });
        const iv = setInterval(() => {
          if (captureRef.current === null) {
            clearInterval(iv);
            resolve();
          }
        }, 50);
        setTimeout(() => { clearInterval(iv); resolve(); }, 2500);
      });
      await new Promise((r) => setTimeout(r, 250));
    }
    setBusy(false);
  }

  return (
    <div className="space-y-7">
      <div className="rounded-xl border border-taupe/20 bg-ivory p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl text-charcoal">{data.title}</h2>
            <p className="text-sm text-charcoal/60">입력 소스: {source} · 이벤트 {data.groups.length}개 → 포스터 {data.groups.length}장</p>
          </div>
          <div className="flex items-center gap-2">
            {monthSheets.length > 1 && (
              <select onChange={onSheet} defaultValue={data.sheet} className="rounded-md border border-taupe/40 bg-white px-2 py-1.5 text-sm">
                {monthSheets.map((s) => (<option key={s} value={s}>{s}</option>))}
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
        <p className="mt-2 text-xs text-charcoal/55">
          💡 각 포스터에 <b>배경 플레이트(아트)</b>를 올리면 — 가격 패널만 그 위에 자동 합성됩니다(업체 스타일 재현). 플레이트 없으면 기본 테마로 자동 생성.
        </p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      <div className="grid gap-7 md:grid-cols-2 xl:grid-cols-3">
        {data.groups.map((g, gi) => {
          const plate = plates[gi];
          return (
            <div key={gi} className="flex flex-col items-center gap-2.5">
              <div className="poster-scale">
                <Poster group={g} themeKey={themeFor(gi)} sheet={data.sheet} bgUrl={plate?.url} panelTop={plate?.top} />
              </div>

              <div className="flex w-[360px] items-center gap-2">
                {!plate ? (
                  <select value={themeFor(gi)} onChange={(e) => setThemes((m) => ({ ...m, [gi]: e.target.value }))} className="flex-1 rounded-md border border-taupe/40 bg-white px-2 py-1.5 text-xs">
                    {THEME_LIST.map((t) => (<option key={t.key} value={t.key}>{t.label}</option>))}
                  </select>
                ) : (
                  <label className="flex flex-1 items-center gap-2 text-xs text-charcoal/70">
                    패널위치
                    <input type="range" min={300} max={1000} step={5} value={plate.top} onChange={(e) => setTop(gi, Number(e.target.value))} className="flex-1 accent-taupe" />
                  </label>
                )}
                <button onClick={() => downloadOne(gi)} className="rounded-md bg-taupe px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-taupe-deep">PNG</button>
              </div>

              <div className="flex w-[360px] items-center gap-2">
                <label className="flex-1 cursor-pointer rounded-md border border-dashed border-taupe/50 bg-white px-2 py-1.5 text-center text-xs text-taupe-deep hover:bg-taupe/5">
                  {plate ? "배경 플레이트 변경" : "배경 플레이트 업로드 (아트)"}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => onPlate(gi, e.target.files?.[0])} />
                </label>
                {plate && (
                  <button onClick={() => removePlate(gi)} className="rounded-md border border-taupe/40 px-2 py-1.5 text-xs text-charcoal/60 hover:bg-taupe/10">제거</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ position: "fixed", left: -20000, top: 0, pointerEvents: "none" }} aria-hidden>
        {cap && (
          <Poster ref={captureRef} group={data.groups[cap.gi]} themeKey={themeFor(cap.gi)} sheet={data.sheet} bgUrl={plates[cap.gi]?.url} panelTop={plates[cap.gi]?.top} />
        )}
      </div>
    </div>
  );
}
