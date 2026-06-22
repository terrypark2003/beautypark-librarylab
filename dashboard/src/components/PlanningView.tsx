import { useMemo, useRef, useState } from "react";
import type { RequestData } from "../lib/types";
import { references, latest, nextMonth, key, label, history, type HMonth } from "../lib/history";
import { loadWorkbook, parseSheet } from "../lib/parseRequest";
import { suggestTitles, suggestPackages, type PackageGroup } from "../lib/ai";
import { parsePriceBook, loadPriceBook, savePriceBook, cleanTxName, type PriceBook } from "../lib/pricebook";
import { logAction } from "../lib/auth";

interface PItem { name: string; normal: string; event: string }
interface PGroup { group: string; items: PItem[] }

// 엔진 선택값: "auto" | "<provider>:<model>" → { provider, model }
function parseEngine(v: string): { provider: string; model?: string } {
  if (!v || v === "auto") return { provider: "auto" };
  const i = v.indexOf(":");
  if (i < 0) return { provider: v };
  return { provider: v.slice(0, i), model: v.slice(i + 1) };
}

function EngineSelect({ value, onChange, compact }: { value: string; onChange: (v: string) => void; compact?: boolean }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      title="AI 엔진 / 모델"
      className={compact
        ? "shrink-0 rounded border border-taupe/20 px-1 py-1 text-[10px]"
        : "rounded-md border border-taupe/30 bg-white px-2 py-1.5 text-sm"}
    >
      <option value="auto">자동 (Gemini→Claude)</option>
      <optgroup label="Gemini">
        <option value="gemini:gemini-2.0-flash">Gemini 2.0 Flash (기본·저렴)</option>
        <option value="gemini:gemini-2.5-flash">Gemini 2.5 Flash</option>
        <option value="gemini:gemini-2.5-pro">Gemini 2.5 Pro (고품질)</option>
      </optgroup>
      <optgroup label="Claude">
        <option value="claude:claude-haiku-4-5">Claude Haiku 4.5 (저렴)</option>
        <option value="claude:claude-sonnet-4-6">Claude Sonnet 4.6</option>
        <option value="claude:claude-opus-4-8">Claude Opus 4.8 (최고품질)</option>
      </optgroup>
    </select>
  );
}

const won = (s: string) => { const n = Number(String(s).replace(/[^0-9]/g, "")); return isNaN(n) ? 0 : n; };
const fmt = (n: number) => n.toLocaleString("ko-KR");
const vatIncl = (e: string) => Math.round(won(e) * 1.1);
const discount = (nm: string, e: string) => (won(nm) > 0 ? Math.round((1 - won(e) / won(nm)) * 100) : 0);
const man = (won: number | null) => (won == null ? "—" : `${won / 10000}만`);

const fromHistory = (h: HMonth): PGroup[] =>
  h.groups.map((g) => ({
    group: g.group,
    items: g.items.map((it) => ({ name: it.name, normal: it.normal != null ? String(it.normal) : "", event: it.event != null ? String(it.event) : "" })),
  }));

export default function PlanningView({ onGenerate }: { onGenerate: (d: RequestData) => void }) {
  const init = nextMonth(latest().y, latest().m);
  const [y, setY] = useState(init.y);
  const [m, setM] = useState(init.m);
  const [plan, setPlan] = useState<PGroup[]>([]);
  const [wolcho, setWolcho] = useState("");
  const [wooljung, setWooljung] = useState("");
  const [overrides, setOverrides] = useState<Record<string, HMonth>>({});
  const [ovError, setOvError] = useState<string | null>(null);
  const ovRef = useRef<HTMLInputElement>(null);
  // 수가표(가격표) — 시술명 자동완성 + 가격 자동입력
  const [priceBook, setPriceBook] = useState<PriceBook>(() => loadPriceBook());
  const pbRef = useRef<HTMLInputElement>(null);
  async function onPriceBook(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setOvError(null);
    try {
      const { wb } = await loadWorkbook(await file.arrayBuffer());
      const book = parsePriceBook(wb);
      if (!Object.keys(book).length) throw new Error("수가표에서 '사용명칭/가격' 열을 찾지 못했습니다");
      setPriceBook(book);
      savePriceBook(book);
    } catch (err) { setOvError(`수가표를 읽지 못했습니다: ${(err as Error).message}`); }
    e.target.value = "";
  }

  // AI 타이틀 추천
  const [aiFor, setAiFor] = useState<number | null>(null);
  const [aiDesc, setAiDesc] = useState("");
  const [aiTitles, setAiTitles] = useState<string[]>([]);
  const [aiNote, setAiNote] = useState<string | undefined>();
  const [aiLoading, setAiLoading] = useState(false);
  const [aiEngine, setAiEngine] = useState<string>("auto");

  const openAi = (gi: number) => { setAiFor(gi); setAiTitles([]); setAiDesc(""); setAiNote(undefined); };
  async function runAi(gi: number) {
    setAiLoading(true);
    const examples = Array.from(new Set(Object.values(effHistory).flatMap((hm) => hm.groups.map((g) => g.group.trim())))).filter(Boolean).slice(0, 40);
    const { provider, model } = parseEngine(aiEngine);
    const res = await suggestTitles({ month: key(y, m), treatments: plan[gi].items.map((i) => i.name).filter(Boolean), description: aiDesc, examples, provider, model });
    setAiTitles(res.titles); setAiNote(res.note); setAiLoading(false);
  }
  const applyTitle = (gi: number, t: string) => { up((p) => { p[gi].group = t; return p; }); setAiFor(null); };

  // AI 패키지(시술 조합) 추천 상태
  const [pkgOpen, setPkgOpen] = useState(false);
  const [pkgDesc, setPkgDesc] = useState("");
  const [pkgGroups, setPkgGroups] = useState<PackageGroup[]>([]);
  const [pkgNote, setPkgNote] = useState<string | undefined>();
  const [pkgLoading, setPkgLoading] = useState(false);
  const [pkgEventCount, setPkgEventCount] = useState(6); // 추천받을 이벤트(패키지) 수
  const [pkgItems, setPkgItems] = useState(2); // 이벤트당 시술 수

  const effHistory = useMemo(() => ({ ...history, ...overrides }), [overrides]);
  const refs = useMemo(() => references(y, m, effHistory), [y, m, effHistory]);

  const priceMap = useMemo(() => {
    const map: Record<string, { normal: number | null; event: number | null }> = {};
    for (const hm of Object.values(effHistory))
      for (const g of hm.groups) for (const it of g.items) if (it.name) map[it.name.trim()] = { normal: it.normal, event: it.event };
    return map;
  }, [effHistory]);

  // 자동완성 후보: 수가표 + 과거 시술명
  const nameOpts = useMemo(
    () => Array.from(new Set([...Object.keys(priceBook), ...Object.keys(priceMap)])).filter(Boolean).sort().slice(0, 3000),
    [priceBook, priceMap]
  );
  // 시술명 → 가격 자동입력값(부가세 전). 수가표 우선, 없으면 과거 데이터.
  const lookupPrice = (name: string) => priceBook[cleanTxName(name)] || priceMap[name.trim()] || priceMap[cleanTxName(name)];

  async function runPkg() {
    setPkgLoading(true);
    const pool = Array.from(new Set(Object.values(effHistory).flatMap((hm) => hm.groups.flatMap((g) => g.items.map((i) => i.name.trim()))))).filter(Boolean);
    const examples = Array.from(new Set(Object.values(effHistory).flatMap((hm) => hm.groups.map((g) => g.group.trim())))).filter(Boolean).slice(0, 40);
    const { provider, model } = parseEngine(aiEngine);
    const res = await suggestPackages({ month: key(y, m), treatments: pool, description: pkgDesc, examples, provider, model, eventCount: pkgEventCount, itemsPerEvent: pkgItems });
    setPkgGroups(res.groups); setPkgNote(res.note); setPkgLoading(false);
    logAction("AI 패키지추천", pkgDesc.slice(0, 60));
  }
  const toPGroup = (g: PackageGroup): PGroup => ({
    group: g.title,
    items: g.items.map((name) => { const p = priceMap[name.trim()]; return { name, normal: p?.normal != null ? String(p.normal) : "", event: p?.event != null ? String(p.event) : "" }; }),
  });
  const applyAllPkg = () => { setPlan(pkgGroups.map(toPGroup)); setPkgOpen(false); };
  const addOnePkg = (g: PackageGroup) => up((p) => [...p, toPGroup(g)]);
  const up = (fn: (p: PGroup[]) => PGroup[]) => setPlan((p) => fn(structuredClone(p)));

  async function onOverride(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setOvError(null);
    try {
      const { wb, monthSheets } = await loadWorkbook(await file.arrayBuffer());
      if (!monthSheets.length) throw new Error("월별 시트(YYYY.M)를 찾지 못했습니다");
      const ov: Record<string, HMonth> = {};
      for (const s of monthSheets) {
        const d = parseSheet(wb, s);
        const [yy, mm] = s.split(".").map(Number);
        ov[`${yy}.${mm}`] = { title: d.title, emphasis: d.emphasis || "", groups: d.groups.map((g) => ({ group: g.group.replace(/\n/g, " ").trim(), items: g.items.filter((it) => it.name && it.name !== "`").map((it) => ({ name: it.name, event: it.event, normal: it.normal })) })) };
      }
      setOverrides((o) => ({ ...o, ...ov }));
    } catch (err) { setOvError(`엑셀을 읽지 못했습니다: ${(err as Error).message}`); }
  }

  function loadRef(h: HMonth) {
    setPlan(fromHistory(h));
    const em = h.emphasis.replace(/\s*\|\s*#.*$/, "");
    const w1 = em.match(/월\s*초[^:]*:\s*([^|]+)/); const w2 = em.match(/월\s*중순[^:]*:\s*([^|]+)/);
    if (w1) setWolcho(w1[1].trim()); if (w2) setWooljung(w2[1].trim());
  }

  function generate() {
    const data: RequestData = {
      title: `${y}.${m} 이벤트 기획`,
      sheet: key(y, m),
      emphasis: [wolcho && `월초 : ${wolcho}`, wooljung && `월 중순 : ${wooljung}`].filter(Boolean).join("\n") || null,
      deliverables: { wide: "플친 와이드", list: "플친 리스트", instagram: "인스타(2개)" },
      groups: plan
        .map((g) => ({ group: g.group.trim() || "이벤트", items: g.items.filter((it) => it.name.trim() && won(it.event) > 0).map((it) => ({ name: it.name.trim(), normal: won(it.normal) || null, event: won(it.event), eventVat: null, featured: false })) }))
        .filter((g) => g.items.length),
    };
    if (data.groups.length) { logAction("디자인 생성으로 보내기", `${data.groups.length}개 이벤트`); onGenerate(data); }
  }

  const planItems = plan.reduce((n, g) => n + g.items.length, 0);
  const cell = "border border-taupe/20 px-2 py-1.5";
  const numInput = "w-full bg-transparent text-right text-sm tabular-nums outline-none";

  return (
    <div className="space-y-6">
      {/* 월 선택 + 오버라이드 */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-taupe/20 bg-ivory p-5">
        <div className="flex items-center gap-2">
          <h2 className="font-serif text-2xl text-charcoal">이벤트 기획</h2>
          <span className="text-sm text-charcoal/55">작년·재작년 같은 달을 참고해 이달 라인업 구성</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-charcoal/60">기획 대상</span>
          <select value={y} onChange={(e) => setY(Number(e.target.value))} className="rounded-md border border-taupe/40 bg-white px-2 py-1.5">{[2025, 2026, 2027].map((yy) => <option key={yy} value={yy}>{yy}년</option>)}</select>
          <select value={m} onChange={(e) => setM(Number(e.target.value))} className="rounded-md border border-taupe/40 bg-white px-2 py-1.5">{Array.from({ length: 12 }, (_, i) => i + 1).map((mm) => <option key={mm} value={mm}>{mm}월</option>)}</select>
          <input ref={ovRef} type="file" accept=".xlsx" className="hidden" onChange={onOverride} />
          <button onClick={() => ovRef.current?.click()} className="rounded-md border border-taupe/40 bg-white px-3 py-1.5 font-medium text-taupe-deep hover:bg-taupe/10">엑셀로 히스토리 덮어쓰기</button>
          <input ref={pbRef} type="file" accept=".xlsx" className="hidden" onChange={onPriceBook} />
          <button onClick={() => pbRef.current?.click()} title="시술명 자동완성·가격 자동입력에 쓸 수가표(엑셀)를 올리세요" className="rounded-md border border-taupe-deep/40 bg-white px-3 py-1.5 font-medium text-taupe-deep hover:bg-taupe/10">💲 수가표 업로드</button>
        </div>
      </div>
      {(Object.keys(overrides).length > 0 || Object.keys(priceBook).length > 0 || ovError) && (
        <div className="-mt-3 flex flex-wrap gap-2 text-xs">
          {Object.keys(overrides).length > 0 && <span className="rounded bg-emerald-50 px-2 py-1 text-emerald-700">✔ 내 엑셀로 덮어씀: {Object.keys(overrides).sort().map(label).join(", ")}</span>}
          {Object.keys(priceBook).length > 0 && <span className="rounded bg-emerald-50 px-2 py-1 text-emerald-700">💲 수가표 {Object.keys(priceBook).length}개 시술 — 시술명 입력 시 자동완성·가격 자동입력</span>}
          {ovError && <span className="text-red-600">{ovError}</span>}
        </div>
      )}

      {/* 과거 참고 */}
      <div>
        <h3 className="mb-3 font-serif text-lg text-taupe-deep">📚 과거 참고 ({m}월 라인업)</h3>
        <div className="grid gap-3 lg:grid-cols-3">
          {refs.map((r) => (
            <div key={r.key} className="rounded-lg border border-taupe/15 bg-white p-3">
              <div className="mb-2 flex items-center justify-between">
                <div><span className="rounded-full bg-taupe/10 px-2 py-0.5 text-xs font-medium text-taupe-deep">{r.tag}</span><span className="ml-2 text-sm font-semibold">{r.data ? label(r.key) : `${label(r.key)} (없음)`}</span></div>
                {r.data && <button onClick={() => loadRef(r.data!)} className="rounded border border-taupe/40 px-2 py-1 text-xs text-taupe-deep hover:bg-taupe/10">불러오기</button>}
              </div>
              {r.data && (
                <div className="max-h-60 space-y-2 overflow-auto pr-1">
                  {r.data.groups.map((g, gi) => (
                    <div key={gi} className="rounded bg-ivory/60 p-2">
                      <div className="text-xs font-semibold text-taupe-deep">{g.group}</div>
                      <ul className="mt-1 space-y-0.5">{g.items.map((it, ii) => <li key={ii} className="flex justify-between gap-2 text-[11px] text-charcoal/75"><span className="truncate">{it.name}</span><span className="shrink-0 font-medium">{man(it.event)}</span></li>)}</ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 작업요청서 표 */}
      <div className="rounded-xl border border-taupe/20 bg-white p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-serif text-lg text-taupe-deep">{y}년 {m}월 디자인 작업 요청서 · 이벤트 {plan.length} / 시술 {planItems}</h3>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setPkgOpen((o) => !o)} className={`rounded-md px-3 py-1.5 text-xs font-semibold ${pkgOpen ? "bg-taupe-deep text-white" : "border border-taupe-deep/40 text-taupe-deep hover:bg-taupe/10"}`}>✨ AI 패키지 추천</button>
            <button onClick={() => up((p) => [...p, { group: "새 이벤트", items: [{ name: "", normal: "", event: "" }] }])} className="rounded-md border border-taupe/40 px-3 py-1.5 text-xs font-semibold text-taupe-deep hover:bg-taupe/10">+ 이벤트</button>
            <button onClick={() => { setPlan([]); }} className="rounded-md border border-taupe/30 px-3 py-1.5 text-xs text-charcoal/60 hover:bg-taupe/10">비우기</button>
            <button onClick={generate} disabled={!planItems} className="rounded-md bg-taupe px-4 py-1.5 text-xs font-semibold text-white hover:bg-taupe-deep disabled:opacity-40">디자인 생성으로 보내기 →</button>
          </div>
        </div>

        {pkgOpen && (
          <div className="mb-4 rounded-lg border border-taupe-deep/25 bg-ivory/70 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-taupe-deep">✨ AI 패키지 추천</span>
              <input value={pkgDesc} onChange={(e) => setPkgDesc(e.target.value)} placeholder="원하는 방향(선택): 예) 휴가 후 미백·진정 위주, 평일 화수목 포함" className="min-w-[180px] flex-1 rounded-md border border-taupe/30 px-2.5 py-1.5 text-sm" />
              <label className="flex items-center gap-1 text-xs text-charcoal/60">이벤트<input type="number" min={1} max={12} value={pkgEventCount} onChange={(e) => setPkgEventCount(Math.max(1, Math.min(12, Math.round(Number(e.target.value)) || 6)))} className="w-12 rounded border border-taupe/30 px-1.5 py-1 text-sm" />개</label>
              <label className="flex items-center gap-1 text-xs text-charcoal/60">시술<input type="number" min={1} max={6} value={pkgItems} onChange={(e) => setPkgItems(Math.max(1, Math.min(6, Math.round(Number(e.target.value)) || 2)))} className="w-12 rounded border border-taupe/30 px-1.5 py-1 text-sm" />개</label>
              <EngineSelect value={aiEngine} onChange={setAiEngine} />
              <button onClick={runPkg} disabled={pkgLoading} className="rounded-md bg-taupe px-4 py-1.5 text-sm font-semibold text-white hover:bg-taupe-deep disabled:opacity-50">{pkgLoading ? "구상 중…" : "추천받기"}</button>
              {pkgGroups.length > 0 && <button onClick={applyAllPkg} className="rounded-md border border-taupe-deep/50 px-3 py-1.5 text-sm font-semibold text-taupe-deep hover:bg-taupe/10">이 구성으로 기획표 채우기 ↧</button>}
            </div>
            {pkgNote && <div className="mt-1 text-[11px] text-charcoal/45">{pkgNote}</div>}
            {pkgGroups.length > 0 && (
              <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {pkgGroups.map((g, gi) => (
                  <div key={gi} className="rounded-lg border border-taupe/20 bg-white p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-charcoal">{g.title}</div>
                      <button onClick={() => addOnePkg(g)} className="shrink-0 rounded border border-taupe/40 px-1.5 py-0.5 text-[11px] text-taupe-deep hover:bg-taupe/10">+ 추가</button>
                    </div>
                    {(g.concept || g.target || g.intensity) && (
                      <div className="mt-0.5 text-[11px] text-charcoal/55">{[g.concept, g.target && `타겟: ${g.target}`, g.intensity && `강도: ${g.intensity}`].filter(Boolean).join(" · ")}</div>
                    )}
                    <ul className="mt-1.5 space-y-0.5">
                      {g.items.map((it, ii) => <li key={ii} className="text-[12px] text-charcoal/80">• {it}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <datalist id="tx-book">{nameOpts.map((n) => <option key={n} value={n} />)}</datalist>
        {plan.length === 0 ? (
          <p className="rounded-md bg-ivory p-4 text-center text-sm text-charcoal/50">과거 참고에서 “불러오기”로 시작하거나 “+ 이벤트”로 직접 구성하세요.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-taupe/10 text-xs text-taupe-deep">
                  <th className={`${cell} w-52 text-left`}>타이틀</th>
                  <th className={`${cell} text-left`}>시술명</th>
                  <th className={`${cell} w-24`}>정상가<div className="font-normal text-charcoal/40">부가세 전</div></th>
                  <th className={`${cell} w-24`}>이벤트가<div className="font-normal text-charcoal/40">부가세 전</div></th>
                  <th className={`${cell} w-24 bg-taupe/15`}>부가세 포함<div className="font-normal text-charcoal/40">자동</div></th>
                  <th className={`${cell} w-16 bg-rose-50`}>할인율</th>
                  <th className={`${cell} w-8`}></th>
                </tr>
              </thead>
              <tbody>
                {plan.map((g, gi) =>
                  g.items.map((it, ii) => (
                    <tr key={`${gi}-${ii}`} className="align-top">
                      {ii === 0 && (
                        <td className={`${cell} bg-ivory/50 align-top`} rowSpan={g.items.length}>
                          <textarea value={g.group} onChange={(e) => up((p) => { p[gi].group = e.target.value; return p; })} rows={1}
                            ref={(el) => { if (el) { el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`; } }}
                            className="w-full resize-none break-words bg-transparent text-sm font-semibold leading-snug outline-none" />
                          <div className="mt-1 flex flex-wrap gap-2 text-[11px]">
                            <button onClick={() => up((p) => { p[gi].items.push({ name: "", normal: "", event: "" }); return p; })} className="text-taupe hover:underline">+ 시술</button>
                            <button onClick={() => up((p) => { p.splice(gi, 1); return p; })} className="text-charcoal/40 hover:text-red-600">그룹삭제</button>
                            <button onClick={() => (aiFor === gi ? setAiFor(null) : openAi(gi))} className="font-semibold text-taupe-deep hover:underline">✨ AI 타이틀</button>
                          </div>
                          {aiFor === gi && (
                            <div className="mt-2 rounded-md border border-taupe/30 bg-white p-2">
                              <div className="flex gap-1">
                                <input value={aiDesc} onChange={(e) => setAiDesc(e.target.value)} placeholder="이벤트 설명(선택)" className="min-w-0 flex-1 rounded border border-taupe/20 px-1.5 py-1 text-[11px] outline-none" />
                                <EngineSelect value={aiEngine} onChange={setAiEngine} compact />
                                <button onClick={() => runAi(gi)} disabled={aiLoading} className="shrink-0 rounded bg-taupe px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-50">{aiLoading ? "…" : "추천"}</button>
                              </div>
                              <div className="mt-1.5 flex flex-col gap-1">
                                {aiTitles.map((t, ti) => (
                                  <button key={ti} onClick={() => applyTitle(gi, t)} className="rounded bg-taupe/10 px-2 py-1 text-left text-[11px] text-charcoal hover:bg-taupe/20">{t}</button>
                                ))}
                              </div>
                              {aiNote && <div className="mt-1 text-[10px] text-charcoal/45">{aiNote}</div>}
                            </div>
                          )}
                        </td>
                      )}
                      <td className={cell}><input value={it.name} list="tx-book" placeholder="시술명 (구성·횟수)" onChange={(e) => up((p) => { const v = e.target.value; p[gi].items[ii].name = v; const pb = lookupPrice(v); if (pb) { if (pb.normal != null) p[gi].items[ii].normal = String(pb.normal); if (pb.event != null) p[gi].items[ii].event = String(pb.event); } return p; })} className="w-full bg-transparent text-sm outline-none" /></td>
                      <td className={cell}><input value={it.normal} inputMode="numeric" placeholder="0" onChange={(e) => up((p) => { p[gi].items[ii].normal = e.target.value; return p; })} className={numInput} /></td>
                      <td className={cell}><input value={it.event} inputMode="numeric" placeholder="0" onChange={(e) => up((p) => { p[gi].items[ii].event = e.target.value; return p; })} className={`${numInput} font-semibold text-taupe-deep`} /></td>
                      <td className={`${cell} bg-taupe/5 text-right tabular-nums text-charcoal/70`}>{won(it.event) ? fmt(vatIncl(it.event)) : "—"}</td>
                      <td className={`${cell} bg-rose-50/50 text-center tabular-nums font-medium ${discount(it.normal, it.event) > 0 ? "text-rose-600" : "text-charcoal/30"}`}>{won(it.normal) && won(it.event) ? `${discount(it.normal, it.event)}%` : "—"}</td>
                      <td className={`${cell} text-center`}><button onClick={() => up((p) => { p[gi].items.length > 1 ? p[gi].items.splice(ii, 1) : p.splice(gi, 1); return p; })} className="text-xs text-charcoal/40 hover:text-red-600">✕</button></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 강조 */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-charcoal/60">월 초 강조<input value={wolcho} onChange={(e) => setWolcho(e.target.value)} placeholder="예: 뷰티스템 런칭 이벤트" className="mt-1 w-full rounded-md border border-taupe/30 px-3 py-2 text-sm" /></label>
          <label className="text-xs text-charcoal/60">월 중순 강조<input value={wooljung} onChange={(e) => setWooljung(e.target.value)} placeholder="예: 상반기 결산" className="mt-1 w-full rounded-md border border-taupe/30 px-3 py-2 text-sm" /></label>
        </div>
      </div>
    </div>
  );
}
