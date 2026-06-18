import { useEffect, useMemo, useRef, useState } from "react";
import type { Workbook } from "exceljs";
import { toPng } from "html-to-image";
import type { RequestData } from "../lib/types";
import { sampleData } from "../lib/sample";
import { loadWorkbook, parseSheet } from "../lib/parseRequest";
import { THEME_LIST, themeKeyForGroup } from "../lib/themes";
import { themeBg } from "../lib/backgrounds";
import { Poster } from "./Poster";

const sanitize = (s: string) => s.replace(/[\\/:*?"<>|\n]/g, "").replace(/\s+/g, "").slice(0, 36);
type Plate = { url: string; hideTitle: boolean };

const SIZES = [
  { key: "portrait", label: "세로 포스터 (1080×1527)", w: 1080, h: 1527 },
  { key: "insta45", label: "인스타 4:5 (1080×1350)", w: 1080, h: 1350 },
  { key: "square", label: "인스타 1:1 (1080×1080)", w: 1080, h: 1080 },
  { key: "story", label: "스토리 9:16 (1080×1920)", w: 1080, h: 1920 },
  { key: "wide", label: "가로 팝업 16:9 (1200×675)", w: 1200, h: 675 },
] as const;

const LAYOUTS = [
  { key: "classic", label: "기본" },
  { key: "center", label: "센터" },
  { key: "band", label: "밴드" },
  { key: "editorial", label: "에디토리얼" },
  { key: "minimal", label: "미니멀" },
] as const;

const PREVIEW_W = 330;

export default function PosterStudio({ initialData }: { initialData?: RequestData | null }) {
  const [data, setData] = useState<RequestData>(() => initialData ?? sampleData());
  const [source, setSource] = useState(initialData ? `기획 · ${initialData.sheet}` : "샘플 · 2026.6");
  const [wb, setWb] = useState<Workbook | null>(null);
  const [monthSheets, setMonthSheets] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [themes, setThemes] = useState<Record<number, string>>({});
  const [plates, setPlates] = useState<Record<number, Plate>>({});
  const [sizeKey, setSizeKey] = useState<string>("portrait");
  const [logoScale, setLogoScale] = useState(1);
  const [panelTop, setPanelTop] = useState(0);
  const [panelBottom, setPanelBottom] = useState(0);
  const [variants, setVariants] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const captureRef = useRef<HTMLDivElement>(null);
  const [cap, setCap] = useState<{ gi: number; name: string } | null>(null);

  const size = SIZES.find((s) => s.key === sizeKey)!;
  const themeFor = (gi: number) => themes[gi] ?? themeKeyForGroup(data.groups[gi]?.group ?? "");
  const variantFor = (gi: number) => variants[gi] ?? LAYOUTS[gi % LAYOUTS.length].key;

  useMemo(() => { setThemes({}); setPlates({}); }, [data]);
  useEffect(() => { if (initialData) { setData(initialData); setSource(`기획 · ${initialData.sheet}`); } }, [initialData]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const { wb, monthSheets } = await loadWorkbook(await file.arrayBuffer());
      const target = monthSheets[0] ?? wb.worksheets[0]?.name;
      setWb(wb); setMonthSheets(monthSheets);
      setData(parseSheet(wb, target));
      setSource(`${file.name} · ${target}`);
    } catch (err) { setError(`엑셀을 읽지 못했습니다: ${(err as Error).message}`); }
  }
  function onSheet(e: React.ChangeEvent<HTMLSelectElement>) {
    if (!wb) return;
    setData(parseSheet(wb, e.target.value));
    setSource(`${source.split(" · ")[0]} · ${e.target.value}`);
  }
  function onPlate(gi: number, file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPlates((p) => ({ ...p, [gi]: { url: String(reader.result), hideTitle: p[gi]?.hideTitle ?? false } }));
    reader.readAsDataURL(file);
  }
  const toggleHide = (gi: number) => setPlates((p) => (p[gi] ? { ...p, [gi]: { ...p[gi], hideTitle: !p[gi].hideTitle } } : p));
  const removePlate = (gi: number) => setPlates((p) => { const n = { ...p }; delete n[gi]; return n; });

  useEffect(() => {
    if (!cap) return;
    let cancelled = false;
    (async () => {
      try {
        await (document as any).fonts?.ready;
        await new Promise((r) => setTimeout(r, 140));
        const node = captureRef.current;
        if (node && !cancelled) {
          const url = await toPng(node, { pixelRatio: size.w >= 1600 ? 1.5 : 2, width: size.w, height: size.h, cacheBust: true });
          const a = document.createElement("a"); a.href = url; a.download = cap.name; a.click();
        }
      } catch (e) { setError(`PNG 생성 실패: ${(e as Error).message}`); }
      finally { if (!cancelled) setCap(null); }
    })();
    return () => { cancelled = true; };
  }, [cap, size.w, size.h]);

  const fileName = (gi: number) => `뷰티파크_${data.sheet}_${sanitize(data.groups[gi].group)}_${sizeKey}.png`;
  const downloadOne = (gi: number) => setCap({ gi, name: fileName(gi) });
  async function downloadAll() {
    setBusy(true);
    for (let gi = 0; gi < data.groups.length; gi++) {
      await new Promise<void>((resolve) => {
        setCap({ gi, name: fileName(gi) });
        const iv = setInterval(() => { if (captureRef.current === null) { clearInterval(iv); resolve(); } }, 50);
        setTimeout(() => { clearInterval(iv); resolve(); }, 3000);
      });
      await new Promise((r) => setTimeout(r, 250));
    }
    setBusy(false);
  }

  const previewWrap = (w: number, h: number): React.CSSProperties => ({ width: PREVIEW_W, height: (PREVIEW_W * h) / w, overflow: "hidden", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,.12)" });
  const previewInner: React.CSSProperties = { transform: `scale(${PREVIEW_W / size.w})`, transformOrigin: "top left" };

  return (
    <div className="space-y-7">
      <div className="rounded-xl border border-taupe/20 bg-ivory p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl text-charcoal">{data.title}</h2>
            <p className="text-sm text-charcoal/60">입력: {source} · 이벤트 {data.groups.length}개 → 포스터 {data.groups.length}장</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={sizeKey} onChange={(e) => setSizeKey(e.target.value)} className="rounded-md border border-taupe/40 bg-white px-2 py-1.5 text-sm font-medium">
              {SIZES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            {monthSheets.length > 1 && (
              <select onChange={onSheet} defaultValue={data.sheet} className="rounded-md border border-taupe/40 bg-white px-2 py-1.5 text-sm">
                {monthSheets.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
            <input ref={fileRef} type="file" accept=".xlsx" onChange={onFile} className="hidden" />
            <button onClick={() => fileRef.current?.click()} className="rounded-md bg-taupe px-4 py-2 text-sm font-semibold text-white transition hover:bg-taupe-deep">엑셀 업로드</button>
            <button onClick={downloadAll} disabled={busy} className="rounded-md border border-taupe/40 bg-white px-4 py-2 text-sm font-semibold text-taupe-deep transition hover:bg-taupe/10 disabled:opacity-50">{busy ? "생성 중…" : "전체 PNG"}</button>
          </div>
        </div>
        <p className="mt-2 text-xs text-charcoal/55">💡 사이즈를 먼저 고르고, 각 포스터에 <b>배경</b>을 올리면 그 위에 타이틀·가격이 합성됩니다. 배경에 이미 타이틀이 있으면 “타이틀 숨김”을 켜세요.</p>
        <div className="mt-2 flex flex-wrap gap-5 text-xs text-charcoal/70">
          <label className="flex items-center gap-2">로고 크기
            <input type="range" min={0.6} max={3} step={0.05} value={logoScale} onChange={(e) => setLogoScale(Number(e.target.value))} className="w-32 accent-taupe" />
            <span className="w-9 tabular-nums">{Math.round(logoScale * 100)}%</span>
          </label>
          <label className="flex items-center gap-2">패널 상단 ↓
            <input type="range" min={0} max={14} step={0.5} value={panelTop} onChange={(e) => setPanelTop(Number(e.target.value))} className="w-28 accent-taupe" />
            <span className="w-6 tabular-nums">{panelTop}</span>
          </label>
          <label className="flex items-center gap-2">패널 하단 ↑
            <input type="range" min={0} max={14} step={0.5} value={panelBottom} onChange={(e) => setPanelBottom(Number(e.target.value))} className="w-28 accent-taupe" />
            <span className="w-6 tabular-nums">{panelBottom}</span>
          </label>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      <div className="grid gap-7 md:grid-cols-2 xl:grid-cols-3">
        {data.groups.map((g, gi) => {
          const plate = plates[gi];
          return (
            <div key={gi} className="flex flex-col items-center gap-2.5">
              <div style={previewWrap(size.w, size.h)}>
                <div style={previewInner}>
                  <Poster group={g} themeKey={themeFor(gi)} sheet={data.sheet} width={size.w} height={size.h}
                    bgUrl={plate?.url} photoBg={!plate ? themeBg(themeFor(gi)) : undefined} hideTitle={plate?.hideTitle}
                    logoScale={logoScale} panelTop={panelTop} panelBottom={panelBottom} variant={variantFor(gi)} />
                </div>
              </div>

              <div className="flex w-[330px] items-center gap-1.5">
                {!plate ? (
                  <select value={themeFor(gi)} onChange={(e) => setThemes((m) => ({ ...m, [gi]: e.target.value }))} className="min-w-0 flex-1 rounded-md border border-taupe/40 bg-white px-1.5 py-1.5 text-xs">
                    {THEME_LIST.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                  </select>
                ) : (
                  <label className="flex min-w-0 flex-1 items-center gap-1 rounded-md border border-taupe/30 bg-white px-1.5 py-1.5 text-xs text-charcoal/75">
                    <input type="checkbox" checked={plate.hideTitle} onChange={() => toggleHide(gi)} className="accent-taupe" />타이틀 숨김
                  </label>
                )}
                <select value={variantFor(gi)} onChange={(e) => setVariants((m) => ({ ...m, [gi]: e.target.value }))} title="레이아웃" className="rounded-md border border-taupe/40 bg-white px-1.5 py-1.5 text-xs">
                  {LAYOUTS.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
                </select>
                <button onClick={() => downloadOne(gi)} className="rounded-md bg-taupe px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-taupe-deep">PNG</button>
              </div>

              <div className="flex w-[330px] items-center gap-2">
                <label className="flex-1 cursor-pointer rounded-md border border-dashed border-taupe/50 bg-white px-2 py-1.5 text-center text-xs text-taupe-deep hover:bg-taupe/5">
                  {plate ? "배경 변경" : "배경 업로드"}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => onPlate(gi, e.target.files?.[0])} />
                </label>
                {plate && <button onClick={() => removePlate(gi)} className="rounded-md border border-taupe/40 px-2 py-1.5 text-xs text-charcoal/60 hover:bg-taupe/10">제거</button>}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ position: "fixed", left: -30000, top: 0, pointerEvents: "none" }} aria-hidden>
        {cap && (
          <Poster ref={captureRef} group={data.groups[cap.gi]} themeKey={themeFor(cap.gi)} sheet={data.sheet} width={size.w} height={size.h}
            bgUrl={plates[cap.gi]?.url} photoBg={!plates[cap.gi] ? themeBg(themeFor(cap.gi)) : undefined} hideTitle={plates[cap.gi]?.hideTitle}
            logoScale={logoScale} panelTop={panelTop} panelBottom={panelBottom} variant={variantFor(cap.gi)} />
        )}
      </div>
    </div>
  );
}
