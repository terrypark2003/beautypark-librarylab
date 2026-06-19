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
import { searchIcons, iconToDataUrl, type IconResult } from "../lib/iconStickers";
import { STICKER_SVGS, SVG_KEYS } from "../lib/stickerAssets";
import { DESIGNED_SVGS, DESIGNED_KEYS, DESIGNED_LABELS } from "../lib/designedStickers";
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
type XY = { dx: number; dy: number };
// 마우스 드래그로 조절되는 포스터별 배치(패널/로고/타이틀 이동 + 패널 크기)
type Layout = { panel: XY; logo: XY; head: XY; panelScale: number };
const DEFAULT_LAYOUT: Layout = { panel: { dx: 0, dy: 0 }, logo: { dx: 0, dy: 0 }, head: { dx: 0, dy: 0 }, panelScale: 1 };

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
  showPrice: boolean; // 가격 표시 ON/OFF
  nameSize: number; // 상품명 크기 배율
  nameWeight: number; // 상품명 굵기
  priceSize: number; // 금액 크기 배율
  priceFont: "serif" | "cormorant" | "sans"; // 금액 폰트
  brandTop: string; // 우상단 윗줄(빈칸=기본 EVENT · 월)
  brandSub: string; // 우상단 아랫줄
  brandFont: "sans" | "serif"; // 우상단 폰트
  brandStyle: "stack" | "line" | "hidden"; // 우상단 형식
  titleFx: "none" | "shadow" | "lift" | "3d" | "outline" | "glow"; // 타이틀 글자 효과
}
const DEFAULT_OPTS: Opts = {
  logoScale: 1, panelTop: 0, panelBottom: 0, panelWidth: 100, panelAlign: "center",
  showHeader: false, headerPeriod: "", headerTarget: "카카오톡 플러스 친구 대상", showDiscount: false, showPrice: true,
  nameSize: 1, nameWeight: 600, priceSize: 1, priceFont: "serif",
  brandTop: "", brandSub: "BEOMEO", brandFont: "sans", brandStyle: "stack", titleFx: "none",
};

const SIZES = [
  { key: "portrait", label: "세로 포스터 (1080×1527)", w: 1080, h: 1527 },
  { key: "insta45", label: "인스타 4:5 (1080×1350)", w: 1080, h: 1350 },
  { key: "square", label: "인스타 1:1 (1080×1080)", w: 1080, h: 1080 },
  { key: "story", label: "스토리 9:16 (1080×1920)", w: 1080, h: 1920 },
  { key: "wide", label: "가로 팝업 16:9 (1200×675)", w: 1200, h: 675 },
  { key: "pop11", label: "홈팝업 1:1 (1280×1280)", w: 1280, h: 1280 },
  { key: "pop43", label: "홈팝업 4:3 (1704×1280)", w: 1704, h: 1280 },
  { key: "pop169", label: "홈팝업 16:9 (2400×1350)", w: 2400, h: 1350 },
  { key: "pop34", label: "홈팝업 3:4 (1120×1492)", w: 1120, h: 1492 },
  { key: "popA4", label: "홈팝업 A4 (1240×1754)", w: 1240, h: 1754 },
  { key: "promoThumb", label: "기획전 썸네일 (1080×540)", w: 1080, h: 540 },
  { key: "promoGuide", label: "기획전 안내용 (960×1280)", w: 960, h: 1280 },
] as const;

const LAYOUTS = [
  { key: "classic", label: "기본" }, { key: "center", label: "센터" }, { key: "band", label: "밴드" },
  { key: "editorial", label: "에디토리얼" }, { key: "minimal", label: "미니멀" },
  { key: "studio", label: "미니멀 에디토리얼" },
] as const;

const PREVIEW_W = 330; // 세로형 미리보기 폭
const PREVIEW_W_LAND = 760; // 가로형은 한 줄에 한 장씩 크게

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
  const [layouts, setLayouts] = useState<Record<number, Layout>>({});
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
  // 디자인 스티커 검색(Iconify)
  const [iconGi, setIconGi] = useState<number | null>(null);
  const [iconQ, setIconQ] = useState("");
  const [iconResults, setIconResults] = useState<IconResult[]>([]);
  const [iconLoading, setIconLoading] = useState(false);
  const [iconNote, setIconNote] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const captureRef = useRef<HTMLDivElement>(null);
  const [cap, setCap] = useState<{ gi: number; name: string; action: "download" | "canva" } | null>(null);
  // 캔바 연동
  const [canva, setCanva] = useState<{ configured: boolean; connected: boolean; name?: string } | null>(null);
  const [canvaBusy, setCanvaBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const size = SIZES.find((s) => s.key === sizeKey)!;
  const land = size.w > size.h; // 가로 팝업 등 가로형
  const previewW = land ? PREVIEW_W_LAND : PREVIEW_W;
  const themeFor = (gi: number) => themes[gi] ?? themeKeyForGroup(data.groups[gi]?.group ?? "");
  const variantFor = (gi: number) => variants[gi] ?? LAYOUTS[gi % LAYOUTS.length].key;
  const defaultScript = (gi: number) => {
    const g = data.groups[gi];
    return g ? (THEMES[themeFor(gi)] || THEMES.summer).headline(g).script ?? "" : "";
  };
  const scriptFor = (gi: number) => (scripts[gi] !== undefined ? scripts[gi] : defaultScript(gi));
  const O = (gi: number): Opts => ({ ...DEFAULT_OPTS, ...(opts[gi] || {}) });
  const setO = (gi: number, patch: Partial<Opts>) => setOpts((m) => ({ ...m, [gi]: { ...DEFAULT_OPTS, ...(m[gi] || {}), ...patch } }));

  useMemo(() => { setThemes({}); setPlates({}); setVariants({}); setScripts({}); setOpts({}); setLayouts({}); setStickers({}); setSelSticker(null); }, [data]);
  const L = (gi: number): Layout => ({ ...DEFAULT_LAYOUT, ...(layouts[gi] || {}) });
  const setL = (gi: number, patch: Partial<Layout>) => setLayouts((m) => ({ ...m, [gi]: { ...DEFAULT_LAYOUT, ...(m[gi] || {}), ...patch } }));

  // 마우스 드래그(패널/로고/타이틀 이동 · 패널 크기 · 스티커 이동)
  function onDragStart(gi: number, e: React.PointerEvent) {
    const el = (e.target as HTMLElement).closest("[data-drag]") as HTMLElement | null;
    if (!el) return;
    const tag = el.getAttribute("data-drag")!;
    const scale = previewW / size.w;
    if (tag.startsWith("s:")) {
      const id = tag.slice(2);
      const st = (stickers[gi] || []).find((s) => s.id === id);
      if (!st) return;
      dragRef.current = { gi, tag, sx: e.clientX, sy: e.clientY, scale, base: { x: st.x, y: st.y } };
      setSelSticker({ gi, id });
    } else if (tag === "panel-size") {
      dragRef.current = { gi, tag, sx: e.clientX, sy: e.clientY, scale, base: { s: L(gi).panelScale } };
    } else {
      // panel | logo | head
      const cur = (L(gi) as any)[tag] as XY;
      dragRef.current = { gi, tag, sx: e.clientX, sy: e.clientY, scale, base: { dx: cur.dx, dy: cur.dy } };
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  }
  function onDragMove(e: React.PointerEvent) {
    const d = dragRef.current;
    if (!d) return;
    const dxp = (e.clientX - d.sx) / d.scale;
    const dyp = (e.clientY - d.sy) / d.scale;
    if (d.tag.startsWith("s:")) {
      const id = d.tag.slice(2);
      const x = clamp(d.base.x + (dxp / size.w) * 100);
      const y = clamp(d.base.y + (dyp / size.h) * 100);
      setStickers((m) => ({ ...m, [d.gi]: (m[d.gi] || []).map((s) => (s.id === id ? { ...s, x, y } : s)) }));
    } else if (d.tag === "panel-size") {
      const s = Math.max(0.6, Math.min(1.8, d.base.s + dyp / 500)); // 아래로 끌면 커지고 위로 끌면 작아짐
      setL(d.gi, { panelScale: s });
    } else {
      setL(d.gi, { [d.tag]: { dx: d.base.dx + dxp, dy: d.base.dy + dyp } } as Partial<Layout>);
    }
  }
  const onDragEnd = () => { dragRef.current = null; };

  const addSticker = (gi: number, char: string, badge = false) => {
    const size = char.startsWith("img:") ? 7 : char.startsWith("svg:") ? 4.5 : badge ? 1.5 : 2.6;
    const s: Sticker = { id: uid(), char, x: 50, y: 40, size, rot: 0, badge };
    setStickers((m) => ({ ...m, [gi]: [...(m[gi] || []), s] }));
    setSelSticker({ gi, id: s.id });
  };
  const addImageSticker = (gi: number, file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => addSticker(gi, `img:${String(reader.result)}`);
    reader.readAsDataURL(file);
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
  const resetPanel = (gi: number) => setLayouts((m) => ({ ...m, [gi]: { ...DEFAULT_LAYOUT } }));

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
  async function runIcons() {
    if (!iconQ.trim()) return;
    setIconLoading(true);
    const res = await searchIcons(iconQ.trim());
    setIconResults(res.icons); setIconNote(res.note); setIconLoading(false);
  }
  async function pickIcon(it: IconResult) {
    if (iconGi == null) return;
    setIconLoading(true);
    try { addSticker(iconGi, `img:${await iconToDataUrl(it.id)}`); setIconGi(null); }
    catch (e) { setIconNote(`적용 실패: ${(e as Error).message}`); }
    finally { setIconLoading(false); }
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
    const toCanva = cap.action === "canva";
    (async () => {
      try {
        await (document as any).fonts?.ready;
        await new Promise((r) => setTimeout(r, 150));
        const node = captureRef.current;
        if (node && !cancelled) {
          // 캔바 전송은 원본 사이즈(서버리스 본문 한도), 홈팝업·기획전은 권장 해상도 그대로(정확히), 그 외는 2배(대형은 1.5배)
          const exact = toCanva || sizeKey.startsWith("pop") || sizeKey.startsWith("promo");
          const pr = exact ? 1 : size.w >= 1600 ? 1.5 : 2;
          const url = await toPng(node, { pixelRatio: pr, width: size.w, height: size.h, cacheBust: true });
          if (toCanva) await sendToCanva(cap.gi, url);
          else { const a = document.createElement("a"); a.href = url; a.download = cap.name; a.click(); }
        }
      } catch (e) { setError(`${toCanva ? "캔바 전송" : "PNG 생성"} 실패: ${(e as Error).message}`); }
      finally { if (!cancelled) { setCap(null); if (toCanva) setCanvaBusy(false); } }
    })();
    return () => { cancelled = true; };
  }, [cap, size.w, size.h]);

  // 캔바 연결 상태 조회 + 콜백 복귀 처리
  const refreshCanva = () => fetch("/api/canva/status").then((r) => r.json()).then(setCanva).catch(() => {});
  useEffect(() => { refreshCanva(); }, []);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const c = p.get("canva");
    if (!c) return;
    if (c === "connected") { setNotice("캔바 계정이 연결되었습니다 ✓"); refreshCanva(); }
    else setError(`캔바 연결 실패: ${p.get("msg") || ""}`);
    p.delete("canva"); p.delete("msg");
    const qs = p.toString();
    window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
  }, []);

  async function sendToCanva(gi: number, dataUrl: string) {
    const r = await fetch("/api/canva/export", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageDataUrl: dataUrl, title: `뷰티파크 ${data.sheet} ${data.groups[gi].group}`, width: size.w, height: size.h }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.editUrl) throw new Error(d.error || `export ${r.status}`);
    setNotice("캔바에 디자인을 만들었어요. 새 탭에서 편집하세요 ✓");
    window.open(d.editUrl, "_blank");
  }
  const exportCanva = (gi: number) => { setError(null); setNotice(null); setCanvaBusy(true); setCap({ gi, name: fileName(gi), action: "canva" }); };
  async function canvaLogout() { await fetch("/api/canva/logout", { method: "POST" }).catch(() => {}); refreshCanva(); }

  const fileName = (gi: number) => `뷰티파크_${data.sheet}_${sanitize(data.groups[gi].group)}_${sizeKey}.png`;
  const downloadOne = (gi: number) => setCap({ gi, name: fileName(gi), action: "download" });
  async function downloadAll() {
    setBusy(true);
    for (let gi = 0; gi < data.groups.length; gi++) {
      await new Promise<void>((resolve) => {
        setCap({ gi, name: fileName(gi), action: "download" });
        const iv = setInterval(() => { if (captureRef.current === null) { clearInterval(iv); resolve(); } }, 50);
        setTimeout(() => { clearInterval(iv); resolve(); }, 3000);
      });
      await new Promise((r) => setTimeout(r, 250));
    }
    setBusy(false);
  }

  const previewWrap = (w: number, h: number): React.CSSProperties => ({ width: previewW, height: (previewW * h) / w, overflow: "hidden", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,.12)" });
  const previewInner: React.CSSProperties = { transform: `scale(${previewW / size.w})`, transformOrigin: "top left" };

  const posterProps = (gi: number) => {
    const plate = plates[gi];
    const o = O(gi);
    return {
      group: data.groups[gi], themeKey: themeFor(gi), sheet: data.sheet, width: size.w, height: size.h,
      bgUrl: plate?.url, photoBg: !plate ? themeBg(themeFor(gi)) : undefined, hideTitle: plate?.hideTitle,
      logoScale: o.logoScale, panelTop: o.panelTop, panelBottom: o.panelBottom, panelWidth: o.panelWidth, panelAlign: o.panelAlign,
      scriptOverride: scriptFor(gi), variant: variantFor(gi),
      showHeader: o.showHeader, headerPeriod: o.headerPeriod, headerTarget: o.headerTarget, showDiscount: o.showDiscount, showPrice: o.showPrice,
      nameSize: o.nameSize, nameWeight: o.nameWeight, priceSize: o.priceSize, priceFont: o.priceFont,
      brandTop: o.brandTop, brandSub: o.brandSub, brandFont: o.brandFont, brandStyle: o.brandStyle, titleFx: o.titleFx,
      panelDx: L(gi).panel.dx, panelDy: L(gi).panel.dy, panelScale: L(gi).panelScale,
      logoDx: L(gi).logo.dx, logoDy: L(gi).logo.dy, headDx: L(gi).head.dx, headDy: L(gi).head.dy,
      stickers: stickers[gi] || [],
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
            {canva?.configured && (canva.connected ? (
              <span className="flex items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-2 text-xs font-medium text-emerald-700">
                캔바 {canva.name ? `· ${canva.name}` : "연결됨"} ✓
                <button onClick={canvaLogout} className="text-emerald-600/70 hover:underline">해제</button>
              </span>
            ) : (
              <a href="/api/canva/login" className="rounded-md border border-taupe/40 bg-white px-4 py-2 text-sm font-semibold text-taupe-deep transition hover:bg-taupe/10">캔바 연결</a>
            ))}
          </div>
        </div>
        <p className="mt-2 text-xs text-charcoal/55">💡 사이즈를 고르고, 각 포스터의 <b>⚙ 세부옵션</b>에서 로고·패널·할인율·헤더를 <b>포스터별로</b> 조절하세요. 배경을 올리면 그 위에 합성됩니다.{canva?.connected && <> 포스터별 <b>↗ 캔바에서 편집</b>으로 캔바에 디자인을 만들 수 있어요.</>}</p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {notice && <p className="mt-2 text-sm text-emerald-700">{notice}</p>}
      </div>

      <div className={land ? "grid justify-items-center gap-7 grid-cols-1" : "grid gap-7 md:grid-cols-2 xl:grid-cols-3"}>
        {data.groups.map((g, gi) => {
          const plate = plates[gi];
          const o = O(gi);
          return (
            <div key={gi} className="flex flex-col items-center gap-2.5">
              <div style={{ ...previewWrap(size.w, size.h), touchAction: "none", cursor: "grab" }}
                onPointerDown={(e) => onDragStart(gi, e)} onPointerMove={onDragMove} onPointerUp={onDragEnd} onPointerCancel={onDragEnd}>
                <div style={previewInner}><Poster {...posterProps(gi)} /></div>
              </div>

              <div className="flex items-center gap-1.5" style={{ width: previewW }}>
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

              <div className="flex items-center gap-2" style={{ width: previewW }}>
                <label className="flex-1 cursor-pointer rounded-md border border-dashed border-taupe/50 bg-white px-2 py-1.5 text-center text-xs text-taupe-deep hover:bg-taupe/5">
                  {plate ? "배경 변경" : "배경 업로드"}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => onPlate(gi, e.target.files?.[0])} />
                </label>
                <button onClick={() => { setStockGi(gi); setStockResults([]); setStockNote(undefined); }} className="rounded-md border border-taupe/40 px-2 py-1.5 text-xs text-taupe-deep hover:bg-taupe/10">🔍사진</button>
                <button onClick={() => applyThemePhoto(gi)} className="rounded-md border border-taupe/40 px-2 py-1.5 text-xs text-taupe-deep hover:bg-taupe/10">🎨테마</button>
                {plate && <button onClick={() => removePlate(gi)} className="rounded-md border border-taupe/40 px-2 py-1.5 text-xs text-charcoal/60 hover:bg-taupe/10">제거</button>}
                <button onClick={() => setOpenOpts((m) => ({ ...m, [gi]: !m[gi] }))} className={`rounded-md border px-2 py-1.5 text-xs ${openOpts[gi] ? "border-taupe bg-taupe text-white" : "border-taupe/40 text-taupe-deep hover:bg-taupe/10"}`}>⚙</button>
              </div>

              {canva?.connected && (
                <button onClick={() => exportCanva(gi)} disabled={canvaBusy} style={{ width: previewW }}
                  className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50">
                  {canvaBusy ? "캔바로 보내는 중…" : "↗ 캔바에서 편집 (디자인 생성)"}
                </button>
              )}

              <div className="flex items-center gap-2" style={{ width: previewW }}>
                <span className="shrink-0 text-[11px] text-charcoal/50">✎ 영문태그</span>
                <input value={scriptFor(gi)} onChange={(e) => setScripts((m) => ({ ...m, [gi]: e.target.value }))} placeholder="예: Early Summer (빈칸=숨김)" className="min-w-0 flex-1 rounded-md border border-taupe/30 px-2 py-1 text-xs" />
              </div>

              {openOpts[gi] && (
                <div className="space-y-2 rounded-md border border-taupe/25 bg-ivory/60 p-3 text-[11px] text-charcoal/75" style={{ width: previewW }}>
                  <label className="flex items-center gap-2">로고 크기<input type="range" min={0.6} max={3} step={0.05} value={o.logoScale} onChange={(e) => setO(gi, { logoScale: Number(e.target.value) })} className="flex-1 accent-taupe" /><span className="w-9 text-right tabular-nums">{Math.round(o.logoScale * 100)}%</span></label>
                  <label className="flex items-center gap-2">패널 상단<input type="range" min={0} max={14} step={0.5} value={o.panelTop} onChange={(e) => setO(gi, { panelTop: Number(e.target.value) })} className="flex-1 accent-taupe" /><span className="w-9 text-right tabular-nums">{o.panelTop}</span></label>
                  <label className="flex items-center gap-2">패널 하단<input type="range" min={0} max={14} step={0.5} value={o.panelBottom} onChange={(e) => setO(gi, { panelBottom: Number(e.target.value) })} className="flex-1 accent-taupe" /><span className="w-9 text-right tabular-nums">{o.panelBottom}</span></label>
                  <label className="flex items-center gap-2">패널 너비<input type="range" min={40} max={100} step={2} value={o.panelWidth} onChange={(e) => setO(gi, { panelWidth: Number(e.target.value) })} className="flex-1 accent-taupe" /><span className="w-9 text-right tabular-nums">{o.panelWidth}%</span></label>

                  <div className="space-y-1.5 rounded border border-taupe/15 bg-white/60 p-2">
                    <div className="font-medium text-charcoal/60">패널 글자 (하얀 박스 안)</div>
                    <label className="flex items-center gap-2">상품명 크기<input type="range" min={0.7} max={1.5} step={0.05} value={o.nameSize} onChange={(e) => setO(gi, { nameSize: Number(e.target.value) })} className="flex-1 accent-taupe" /><span className="w-9 text-right tabular-nums">{Math.round(o.nameSize * 100)}%</span></label>
                    <label className="flex items-center gap-2">상품명 굵기
                      <select value={o.nameWeight} onChange={(e) => setO(gi, { nameWeight: Number(e.target.value) })} className="ml-auto rounded border border-taupe/40 bg-white px-1 py-0.5">
                        <option value={400}>가늘게</option><option value={600}>기본</option><option value={700}>굵게</option><option value={800}>더 굵게</option>
                      </select>
                    </label>
                    <label className="flex items-center gap-2">금액 크기<input type="range" min={0.7} max={1.6} step={0.05} value={o.priceSize} onChange={(e) => setO(gi, { priceSize: Number(e.target.value) })} className="flex-1 accent-taupe" /><span className="w-9 text-right tabular-nums">{Math.round(o.priceSize * 100)}%</span></label>
                    <label className="flex items-center gap-2">금액 폰트
                      <select value={o.priceFont} onChange={(e) => setO(gi, { priceFont: e.target.value as Opts["priceFont"] })} className="ml-auto rounded border border-taupe/40 bg-white px-1 py-0.5">
                        <option value="serif">세리프(Playfair)</option><option value="cormorant">코모란트</option><option value="sans">산세리프</option>
                      </select>
                    </label>
                  </div>

                  <div className="flex items-center gap-2 rounded border border-taupe/15 bg-white/60 p-2">
                    <span className="font-medium text-charcoal/60">타이틀 효과</span>
                    <select value={o.titleFx} onChange={(e) => setO(gi, { titleFx: e.target.value as Opts["titleFx"] })} className="ml-auto rounded border border-taupe/40 bg-white px-1 py-0.5">
                      <option value="none">없음</option>
                      <option value="shadow">그림자</option>
                      <option value="lift">떠있는 그림자</option>
                      <option value="3d">3D 입체</option>
                      <option value="outline">외곽선</option>
                      <option value="glow">네온 글로우</option>
                    </select>
                  </div>

                  <div className="space-y-1.5 rounded border border-taupe/15 bg-white/60 p-2">
                    <div className="font-medium text-charcoal/60">코너 표기 (우상단)</div>
                    <input value={o.brandTop} onChange={(e) => setO(gi, { brandTop: e.target.value })} placeholder={`윗줄 (빈칸 = EVENT · ${data.sheet})`} className="w-full rounded border border-taupe/30 px-2 py-1" />
                    <input value={o.brandSub} onChange={(e) => setO(gi, { brandSub: e.target.value })} placeholder="아랫줄 (예: BEOMEO · 빈칸 = 숨김)" className="w-full rounded border border-taupe/30 px-2 py-1" />
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1">폰트<select value={o.brandFont} onChange={(e) => setO(gi, { brandFont: e.target.value as Opts["brandFont"] })} className="rounded border border-taupe/40 bg-white px-1 py-0.5"><option value="sans">산세리프</option><option value="serif">세리프</option></select></label>
                      <label className="flex items-center gap-1">형식<select value={o.brandStyle} onChange={(e) => setO(gi, { brandStyle: e.target.value as Opts["brandStyle"] })} className="rounded border border-taupe/40 bg-white px-1 py-0.5"><option value="stack">2줄</option><option value="line">한 줄</option><option value="hidden">숨김</option></select></label>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1">정렬<select value={o.panelAlign} onChange={(e) => setO(gi, { panelAlign: e.target.value as any })} className="rounded border border-taupe/40 bg-white px-1 py-0.5"><option value="left">좌</option><option value="center">중</option><option value="right">우</option></select></label>
                    <label className="flex items-center gap-1"><input type="checkbox" checked={o.showPrice} onChange={(e) => setO(gi, { showPrice: e.target.checked })} className="accent-taupe" />가격</label>
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
                    <div className="mb-1 flex items-center justify-between"><span className="font-medium">스티커 · 누끼</span><button onClick={() => resetPanel(gi)} className="rounded border border-taupe/30 px-1.5 py-0.5 text-[10px] hover:bg-taupe/10">위치·크기 초기화</button></div>

                    <div className="mb-0.5 text-[10px] font-medium text-charcoal/45">디자인 요소</div>
                    <div className="flex flex-wrap gap-1">
                      {DESIGNED_KEYS.map((k) => (
                        <button key={k} onClick={() => addSticker(gi, `svg:${k}`)} title={DESIGNED_LABELS[k] || k} className="rounded border border-taupe/30 bg-white p-1 hover:ring-2 hover:ring-taupe/40">
                          <span style={{ width: 26, height: 26, display: "block" }} dangerouslySetInnerHTML={{ __html: DESIGNED_SVGS[k] }} />
                        </button>
                      ))}
                    </div>

                    <div className="mt-1.5 flex gap-1.5">
                      <button onClick={() => { setIconGi(gi); setIconResults([]); setIconNote(undefined); }} className="flex-1 rounded-md border border-taupe/40 bg-white px-2 py-1.5 text-[11px] font-medium text-taupe-deep hover:bg-taupe/10">🔎 디자인 스티커 검색</button>
                      <label className="flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-md border border-dashed border-taupe/50 bg-white px-2 py-1.5 text-[11px] text-taupe-deep hover:bg-taupe/5">
                        🖼 누끼 업로드
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; addImageSticker(gi, f); e.target.value = ""; }} />
                      </label>
                    </div>

                    <div className="mt-1.5 text-[10px] font-medium text-charcoal/45">기본 도형 · 이모지</div>
                    <div className="flex flex-wrap gap-1">
                      {SVG_KEYS.map((k) => (
                        <button key={k} onClick={() => addSticker(gi, `svg:${k}`)} title={k} className="rounded border border-taupe/30 p-1 hover:bg-taupe/10">
                          <span style={{ fontSize: 18, lineHeight: 0, display: "block" }} dangerouslySetInnerHTML={{ __html: STICKER_SVGS[k] }} />
                        </button>
                      ))}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {STICKERS.map((c) => <button key={c} onClick={() => addSticker(gi, c)} className="rounded border border-taupe/30 px-1.5 py-0.5 text-sm leading-none hover:bg-taupe/10">{c}</button>)}
                      {BADGES.map((c) => <button key={c} onClick={() => addSticker(gi, c, true)} className="rounded border border-taupe/30 px-1.5 py-0.5 text-[10px] font-bold hover:bg-taupe/10">{c}</button>)}
                    </div>

                    {selSticker?.gi === gi && (() => {
                      const st = (stickers[gi] || []).find((s) => s.id === selSticker!.id);
                      if (!st) return null;
                      const label = st.char.startsWith("img:") ? "🖼 이미지" : st.char.startsWith("svg:") ? (DESIGNED_LABELS[st.char.slice(4)] || st.char.slice(4)) : st.char;
                      return (
                        <div className="mt-2 space-y-1 rounded bg-white p-2">
                          <div className="flex items-center justify-between"><span>선택: <b>{label}</b></span><button onClick={() => delSticker(gi, st.id)} className="text-red-600 hover:underline">삭제</button></div>
                          <label className="flex items-center gap-2">크기<input type="range" min={0.6} max={16} step={0.1} value={st.size} onChange={(e) => updSticker(gi, st.id, { size: Number(e.target.value) })} className="flex-1 accent-taupe" /></label>
                          <label className="flex items-center gap-2">회전<input type="range" min={-180} max={180} step={1} value={st.rot} onChange={(e) => updSticker(gi, st.id, { rot: Number(e.target.value) })} className="flex-1 accent-taupe" /></label>
                        </div>
                      );
                    })()}
                    <div className="mt-1 text-[10px] text-charcoal/40">💡 미리보기에서 <b>로고·타이틀·패널·스티커</b>를 마우스로 끌어 옮기고, 패널 <b>아래 가장자리</b>를 위/아래로 끌면 크기가 바뀝니다.</div>
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

      {iconGi !== null && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/40 p-4" onClick={() => setIconGi(null)}>
          <div className="mt-10 w-full max-w-3xl rounded-xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h3 className="font-serif text-lg text-taupe-deep">디자인 스티커 검색</h3>
              <input value={iconQ} onChange={(e) => setIconQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && runIcons()} placeholder="영문 키워드: flower, sparkle, gift, ribbon, heart, sun, star, crown…" className="min-w-[200px] flex-1 rounded-md border border-taupe/30 px-3 py-1.5 text-sm" />
              <button onClick={runIcons} disabled={iconLoading} className="rounded-md bg-taupe px-4 py-1.5 text-sm font-semibold text-white hover:bg-taupe-deep disabled:opacity-50">{iconLoading ? "…" : "검색"}</button>
              <button onClick={() => setIconGi(null)} className="rounded-md border border-taupe/30 px-3 py-1.5 text-sm text-charcoal/70">닫기</button>
            </div>
            <div className="mb-2 flex flex-wrap gap-1">
              {["flower", "sparkle", "heart", "gift", "ribbon", "sun", "star", "crown", "leaf", "balloon"].map((q) => (
                <button key={q} onClick={() => { setIconQ(q); setIconLoading(true); searchIcons(q).then((r) => { setIconResults(r.icons); setIconNote(r.note); setIconLoading(false); }); }} className="rounded-full border border-taupe/30 px-2 py-0.5 text-[11px] text-charcoal/65 hover:bg-taupe/10">{q}</button>
              ))}
            </div>
            {iconNote && <p className="mb-2 text-xs text-charcoal/50">{iconNote}</p>}
            <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
              {iconResults.map((it) => (
                <button key={it.id} onClick={() => pickIcon(it)} title={it.id} className="flex aspect-square items-center justify-center rounded-md border border-taupe/15 p-1.5 hover:ring-2 hover:ring-taupe">
                  <img src={it.thumb} alt="" loading="lazy" className="h-full w-full object-contain" />
                </button>
              ))}
            </div>
            {iconResults.length === 0 && !iconLoading && <p className="py-8 text-center text-sm text-charcoal/40">키워드를 입력해 검색하세요. 컬러 이모지·일러스트(무료) 수천 종에서 클릭해 스티커로 추가합니다.</p>}
          </div>
        </div>
      )}

      <div style={{ position: "fixed", left: -30000, top: 0, pointerEvents: "none" }} aria-hidden>
        {cap && <Poster ref={captureRef} {...posterProps(cap.gi)} />}
      </div>
    </div>
  );
}
