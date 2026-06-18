import { useEffect, useMemo, useRef, useState } from "react";
import type { Workbook } from "exceljs";
import { toPng } from "html-to-image";
import type { RequestData } from "../lib/types";
import { sampleData } from "../lib/sample";
import { loadWorkbook, parseSheet } from "../lib/parseRequest";
import { THEMES, THEME_LIST, themeKeyForGroup } from "../lib/themes";
import { themeBg } from "../lib/backgrounds";
import type { Sticker } from "../lib/poster";
import { searchStock, stockToDataUrl, type StockPhoto } from "../lib/stock";
import { STICKER_SVGS, SVG_KEYS } from "../lib/stickerAssets";
import { Poster } from "./Poster";

const THEME_QUERY: Record<string, string> = {
  summer: "summer pastel aesthetic soft background",
  cool: "water bubbles blue minimal background",
  green: "green leaves botanical soft background",
  luxe: "dark luxury velvet gold background",
  sky: "blue summer sky clouds soft",
  board: "beige paper texture minimal background",
};

const STICKERS = ["✦", "✧", "★", "❀", "✿", "❤", "☀", "✨", "🌸", "🍑", "🌿", "💧"];
const BADGES = ["EVENT", "NEW", "HOT", "1+1", "BEST", "한정"];
const uid = () => Math.random().toString(36).slice(2, 9);
const clamp = (v: number) => Math.max(-10, Math.min(110, v));

const sanitize = (s: string) => s.replace(/[\\/:*?"<>|\n]/g, "").replace(/\s+/g, "").slice(0, 36);
type Plate = { url: string; hideTitle: boolean };

interface Opts {
  logoScale: number;
  panelTop: number;
  panelBottom: number;
  panelWidth: number;
  panelAlign: "left" | "center" | "right";
  showHeader: boolean;
  headerPeriod: string;
  headerTarget: string;
  showDiscount: boolean;
}
const DEFAULT_OPTS: Opts = {
  logoScale: 1, panelTop: 0, panelBottom: 0, panelWidth: 100, panelAlign: "center",
  showHeader: false, headerPeriod: "", headerTarget: "카카오톡 플러스 친구 대상", showDiscount: false,
};

const SIZES = [
  { key: "portrait", label: "세로 포스터 (1080×1527)", w: 1080, h: 1527 },
  { key: "insta45", label: "인스타 4:5 (1080×1350)", w: 1080, h: 1350 },
  { key: "square", label: "인스타 1:1 (1080×1080)", w: 1080, h: 1080 },
  { key: "story", label: "스토리 9:16 (1080×1920)", w: 1080, h: 1920 },
  { key: "wide", label: "가로 팝업 16:9 (1200×675)", w: 1200, h: 675 },
] as const;

const LAYOUTS = [
  { key: "classic", label: "기본" }, { key: "center", label: "센터" }, { key: "band", label: "밴드" },
  { key: "editorial", label: "에디토리얼" }, { key: "minimal", label: "미니멀" },
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
  const [variants, setVariants] = useState<Record<number, string>>({});
  const [scripts, setScripts] = useState<Record<number, string>>({});
  const [opts, setOpts] = useState<Record<number, Opts>>({});
  const [openOpts, setOpenOpts] = useState<Record<number, boolean>>({});
  const [offsets, setOffsets] = useState<Record<number, { dx: number; dy: number }>>({});
  const [stickers, setStickers] = useState<Record<number, Sticker[]>>({});
  const [selSticker, setSelSticker] = useState<{ gi: number; id: string } | null>(null);
  const dragRef = useRef<{ gi: number; tag: string; sx: number; sy: number; scale: number; base: any } | null>(null);
  const [sizeKey, setSizeKey] = useState<string>("portrait");
  // 스톡 사진 검색
  const [stockGi, setStockGi] = useState<number | null>(null);
  const [stockQ, setStockQ] = useState("");
  const [stockResults, setStockResults] = useState<StockPhoto[]>([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockNote, setStockNote] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const captureRef = useRef<HTMLDivElement>(null);
  const [cap, setCap] = useState<{ gi: number; name: string } | null>(null);

  const size = SIZES.find((s) => s.key === sizeKey)!;
  const themeFor = (gi: number) => themes[gi] ?? themeKeyForGroup(data.groups[gi]?.group ?? "");
  const variantFor = (gi: number) => variants[gi] ?? LAYOUTS[gi % LAYOUTS.length].key;
  const defaultScript = (gi: number) => {
    const g = data.groups[gi];
    return g ? (THEMES[themeFor(gi)] || THEMES.summer).headline(g).script ?? "" : "";
  };
  const scriptFor = (gi: number) => (scripts[gi] !== undefined ? scripts[gi] : defaultScript(gi));
  const O = (gi: number): Opts => ({ ...DEFAULT_OPTS, ...(opts[gi] || {}) });
  const setO = (gi: number, patch: Partial<Opts>) => setOpts((m) => ({ ...m, [gi]: { ...DEFAULT_OPTS, ...(m[gi] || {}), ...patch } }));

  useMemo(() => { setThemes({}); setPlates({}); setVariants({}); setScripts({}); setOpts({}); setOffsets({}); setStickers({}); setSelSticker(null); }, [data]);

  // 마우스 드래그(패널 이동 / 스티커 이동)
  function onDragStart(gi: number, e: React.PointerEvent) {
    const el = (e.target as HTMLElement).closest("[data-drag]") as HTMLElement | null;
    if (!el) return;
    const tag = el.getAttribute("data-drag")!;
    const scale = PREVIEW_W / size.w;
    if (tag.startsWith("s:")) {
      const id = tag.slice(2);
      const st = (stickers[gi] || []).find((s) => s.id === id);
      if (!st) return;
      dragRef.current = { gi, tag, sx: e.clientX, sy: e.clientY, scale, base: { x: st.x, y: st.y } };
      setSelSticker({ gi, id });
    } else {
      dragRef.current = { gi, tag: "panel", sx: e.clientX, sy: e.clientY, scale, base: offsets[gi] || { dx: 0, dy: 0 } };
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  }
  function onDragMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    const dxp = (e.clientX - d.sx) / d.scale;
    const dyp = (e.clientY - d.sy) / d.scale;
    if (d.tag === "panel") {
      setOffsets((m) => ({ ...m, [d.gi]: { dx: d.base.dx + dxp, dy: d.base.dy + dyp } }));
    } else {
      const id = d.tag.slice(2);
      const x = clamp(d.base.x + (dxp / size.w) * 100);
      const y = clamp(d.base.y + (dyp / size.h) * 100);
      setStickers((m) => ({ ...m, [d.gi]: (m[d.gi] || []).map((s) => (s.id === id ? { ...s, x, y } : s)) }));
    }
  }
  const onDragEnd = () => { dragRef.current = null; };

  const addSticker = (gi: number, char: string, badge = false) => {
    const size = char.startsWith("svg:") ? 4 : badge ? 1.5 : 2.6;
    const s: Sticker = { id: uid(), char, x: 50, y: 40, size, rot: 0, badge };
    setStickers((m) => ({ ...m, [gi]: [...(m[gi] || []), s] }));
    setSelSticker({ gi, id: s.id });
  };
  async function applyThemePhoto(gi: number) {
    const res = await searchStock(THEME_QUERY[themeFor(gi)] || "aesthetic minimal background", size.w > size.h ? "landscape" : "portrait");
    const ph = res.results[0];
    if (!ph) { setError(res.note ? `테마사진: ${res.note}` : "테마 사진을 찾지 못했습니다"); return; }
    try { const data = await stockToDataUrl(ph.url); setPlates((m) => ({ ...m, [gi]: { url: data, hideTitle: false } })); }
    catch (e) { setError(`테마사진 적용 실패: ${(e as Error).message}`); }
  }
  const updSticker = (gi: number, id: string, patch: Partial<Sticker>) =>
    setStickers((m) => ({ ...m, [gi]: (m[gi] || []).map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
  const delSticker = (gi: number, id: string) => {
    setStickers((m) => ({ ...m, [gi]: (m[gi] || []).filter((s) => s.id !== id) }));
    setSelSticker(null);
  };
  const resetPanel = (gi: number) => setOffsets((m) => ({ ...m, [gi]: { dx: 0, dy: 0 } }));

  async function runStock() {
    if (!stockQ.trim()) return;
    setStockLoading(true);
    const res = await searchStock(stockQ.trim(), size.w > size.h ? "landscape" : "portrait");
    setStockResults(res.results); setStockNote(res.note); setStockLoading(false);
  }
  async function pickStock(ph: StockPhoto) {
    if (stockGi == null) return;
    setStockLoading(true);
    try {
      const data = await stockToDataUrl(ph.url);
      setPlates((m) => ({ ...m, [stockGi]: { url: data, hideTitle: false } }));
      setStockGi(null);
    } catch (e) { setStockNote(`적용 실패: ${(e as Error).message}`); }
    finally { setStockLoading(false); }
  }
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
        await new Promise((r) => setTimeout(r, 150));
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

  const posterProps = (gi: number) => {
    const plate = plates[gi];
    const o = O(gi);
    return {
      group: data.groups[gi], themeKey: themeFor(gi), sheet: data.sheet, width: size.w, height: size.h,
      bgUrl: plate?.url, photoBg: !plate ? themeBg(themeFor(gi)) : undefined, hideTitle: plate?.hideTitle,
      logoScale: o.logoScale, panelTop: o.panelTop, panelBottom: o.panelBottom, panelWidth: o.panelWidth, panelAlign: o.panelAlign,
      scriptOverride: scriptFor(gi), variant: variantFor(gi),
      showHeader: o.showHeader, headerPeriod: o.headerPeriod, headerTarget: o.headerTarget, showDiscount: o.showDiscount,
      panelDx: offsets[gi]?.dx || 0, panelDy: offsets[gi]?.dy || 0, stickers: stickers[gi] || [],
    };
  };

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
        <p className="mt-2 text-xs text-charcoal/55">💡 사이즈를 고르고, 각 포스터의 <b>⚙ 세부옵션</b>에서 로고·패널·할인율·헤더를 <b>포스터별로</b> 조절하세요. 배경을 올리면 그 위에 합성됩니다.</p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      <div className="grid gap-7 md:grid-cols-2 xl:grid-cols-3">
        {data.groups.map((g, gi) => {
          const plate = plates[gi];
          const o = O(gi);
          return (
            <div key={gi} className="flex flex-col items-center gap-2.5">
              <div style={{ ...previewWrap(size.w, size.h), touchAction: "none", cursor: "grab" }}
                onPointerDown={(e) => onDragStart(gi, e)} onPointerMove={onDragMove} onPointerUp={onDragEnd} onPointerCancel={onDragEnd}>
                <div style={previewInner}><Poster {...posterProps(gi)} /></div>
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
                <button onClick={() => { setStockGi(gi); setStockResults([]); setStockNote(undefined); }} className="rounded-md border border-taupe/40 px-2 py-1.5 text-xs text-taupe-deep hover:bg-taupe/10">🔍사진</button>
                <button onClick={() => applyThemePhoto(gi)} className="rounded-md border border-taupe/40 px-2 py-1.5 text-xs text-taupe-deep hover:bg-taupe/10">🎨테마</button>
                {plate && <button onClick={() => removePlate(gi)} className="rounded-md border border-taupe/40 px-2 py-1.5 text-xs text-charcoal/60 hover:bg-taupe/10">제거</button>}
                <button onClick={() => setOpenOpts((m) => ({ ...m, [gi]: !m[gi] }))} className={`rounded-md border px-2 py-1.5 text-xs ${openOpts[gi] ? "border-taupe bg-taupe text-white" : "border-taupe/40 text-taupe-deep hover:bg-taupe/10"}`}>⚙</button>
              </div>

              <div className="flex w-[330px] items-center gap-2">
                <span className="shrink-0 text-[11px] text-charcoal/50">✎ 영문태그</span>
                <input value={scriptFor(gi)} onChange={(e) => setScripts((m) => ({ ...m, [gi]: e.target.value }))} placeholder="예: Early Summer (빈칸=숨김)" className="min-w-0 flex-1 rounded-md border border-taupe/30 px-2 py-1 text-xs" />
              </div>

              {openOpts[gi] && (
                <div className="w-[330px] space-y-2 rounded-md border border-taupe/25 bg-ivory/60 p-3 text-[11px] text-charcoal/75">
                  <label className="flex items-center gap-2">로고 크기<input type="range" min={0.6} max={3} step={0.05} value={o.logoScale} onChange={(e) => setO(gi, { logoScale: Number(e.target.value) })} className="flex-1 accent-taupe" /><span className="w-9 text-right tabular-nums">{Math.round(o.logoScale * 100)}%</span></label>
                  <label className="flex items-center gap-2">패널 상단<input type="range" min={0} max={14} step={0.5} value={o.panelTop} onChange={(e) => setO(gi, { panelTop: Number(e.target.value) })} className="flex-1 accent-taupe" /><span className="w-9 text-right tabular-nums">{o.panelTop}</span></label>
                  <label className="flex items-center gap-2">패널 하단<input type="range" min={0} max={14} step={0.5} value={o.panelBottom} onChange={(e) => setO(gi, { panelBottom: Number(e.target.value) })} className="flex-1 accent-taupe" /><span className="w-9 text-right tabular-nums">{o.panelBottom}</span></label>
                  <label className="flex items-center gap-2">패널 너비<input type="range" min={40} max={100} step={2} value={o.panelWidth} onChange={(e) => setO(gi, { panelWidth: Number(e.target.value) })} className="flex-1 accent-taupe" /><span className="w-9 text-right tabular-nums">{o.panelWidth}%</span></label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1">정렬<select value={o.panelAlign} onChange={(e) => setO(gi, { panelAlign: e.target.value as any })} className="rounded border border-taupe/40 bg-white px-1 py-0.5"><option value="left">좌</option><option value="center">중</option><option value="right">우</option></select></label>
                    <label className="flex items-center gap-1"><input type="checkbox" checked={o.showDiscount} onChange={(e) => setO(gi, { showDiscount: e.target.checked })} className="accent-taupe" />할인율</label>
                    <label className="flex items-center gap-1"><input type="checkbox" checked={o.showHeader} onChange={(e) => setO(gi, { showHeader: e.target.checked })} className="accent-taupe" />헤더바</label>
                  </div>
                  {o.showHeader && (
                    <div className="space-y-1">
                      <input value={o.headerPeriod} onChange={(e) => setO(gi, { headerPeriod: e.target.value })} placeholder="기간 (예: 2026.08.01~08.31)" className="w-full rounded border border-taupe/30 px-2 py-1" />
                      <input value={o.headerTarget} onChange={(e) => setO(gi, { headerTarget: e.target.value })} placeholder="대상" className="w-full rounded border border-taupe/30 px-2 py-1" />
                    </div>
                  )}
                  <div className="border-t border-taupe/15 pt-2">
                    <div className="mb-1 flex items-center justify-between"><span className="font-medium">스티커</span><button onClick={() => resetPanel(gi)} className="rounded border border-taupe/30 px-1.5 py-0.5 text-[10px] hover:bg-taupe/10">패널 위치 초기화</button></div>
                    <div className="flex flex-wrap gap-1">
                      {STICKERS.map((c) => <button key={c} onClick={() => addSticker(gi, c)} className="rounded border border-taupe/30 px-1.5 py-0.5 text-sm leading-none hover:bg-taupe/10">{c}</button>)}
                      {BADGES.map((c) => <button key={c} onClick={() => addSticker(gi, c, true)} className="rounded border border-taupe/30 px-1.5 py-0.5 text-[10px] font-bold hover:bg-taupe/10">{c}</button>)}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {SVG_KEYS.map((k) => (
                        <button key={k} onClick={() => addSticker(gi, `svg:${k}`)} title={k} className="rounded border border-taupe/30 p-1 hover:bg-taupe/10">
                          <span style={{ fontSize: 20, lineHeight: 0, display: "block" }} dangerouslySetInnerHTML={{ __html: STICKER_SVGS[k] }} />
                        </button>
                      ))}
                    </div>
                    {selSticker?.gi === gi && (() => {
                      const st = (stickers[gi] || []).find((s) => s.id === selSticker!.id);
                      if (!st) return null;
                      return (
                        <div className="mt-2 space-y-1 rounded bg-white p-2">
                          <div className="flex items-center justify-between"><span>선택: <b>{st.char}</b></span><button onClick={() => delSticker(gi, st.id)} className="text-red-600 hover:underline">삭제</button></div>
                          <label className="flex items-center gap-2">크기<input type="range" min={0.6} max={9} step={0.1} value={st.size} onChange={(e) => updSticker(gi, st.id, { size: Number(e.target.value) })} className="flex-1 accent-taupe" /></label>
                          <label className="flex items-center gap-2">회전<input type="range" min={-60} max={60} step={1} value={st.rot} onChange={(e) => updSticker(gi, st.id, { rot: Number(e.target.value) })} className="flex-1 accent-taupe" /></label>
                        </div>
                      );
                    })()}
                    <div className="mt-1 text-[10px] text-charcoal/40">💡 미리보기에서 패널·스티커를 마우스로 끌어 옮기세요.</div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {stockGi !== null && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/40 p-4" onClick={() => setStockGi(null)}>
          <div className="mt-10 w-full max-w-3xl rounded-xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h3 className="font-serif text-lg text-taupe-deep">무료 사진 검색 → 배경</h3>
              <input value={stockQ} onChange={(e) => setStockQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && runStock()} placeholder="예: summer beach, water, flower, sky, marble, skincare" className="min-w-[200px] flex-1 rounded-md border border-taupe/30 px-3 py-1.5 text-sm" />
              <button onClick={runStock} disabled={stockLoading} className="rounded-md bg-taupe px-4 py-1.5 text-sm font-semibold text-white hover:bg-taupe-deep disabled:opacity-50">{stockLoading ? "…" : "검색"}</button>
              <button onClick={() => setStockGi(null)} className="rounded-md border border-taupe/30 px-3 py-1.5 text-sm text-charcoal/70">닫기</button>
            </div>
            {stockNote && <p className="mb-2 text-xs text-charcoal/50">{stockNote}</p>}
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {stockResults.map((ph) => (
                <button key={ph.id} onClick={() => pickStock(ph)} title={ph.credit} className="group relative aspect-[3/4] overflow-hidden rounded-md border border-taupe/15 hover:ring-2 hover:ring-taupe">
                  <img src={ph.thumb} alt="" loading="lazy" className="h-full w-full object-cover" />
                  <span className="absolute inset-x-0 bottom-0 truncate bg-black/45 px-1 py-0.5 text-[9px] text-white opacity-0 group-hover:opacity-100">{ph.credit}</span>
                </button>
              ))}
            </div>
            {stockResults.length === 0 && !stockLoading && <p className="py-8 text-center text-sm text-charcoal/40">검색어를 입력하고 Enter/검색. (무료: Openverse 기본 · Pexels 키 연결 시 고품질)</p>}
          </div>
        </div>
      )}

      <div style={{ position: "fixed", left: -30000, top: 0, pointerEvents: "none" }} aria-hidden>
        {cap && <Poster ref={captureRef} {...posterProps(cap.gi)} />}
      </div>
    </div>
  );
}
