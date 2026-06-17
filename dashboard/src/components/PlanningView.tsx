import { useMemo, useState } from "react";
import type { RequestData } from "../lib/types";
import { references, latest, nextMonth, key, label, history, type HMonth } from "../lib/history";

interface PItem { name: string; normalMan: string; eventMan: string }
interface PGroup { group: string; items: PItem[] }

const toMan = (won: number | null) => (won == null ? "" : String(won / 10000));
const manToWon = (s: string): number | null => {
  const n = Number(s);
  return s.trim() === "" || isNaN(n) ? null : Math.round(n * 10000);
};
const fmtMan = (won: number | null) => (won == null ? "—" : `${won / 10000}만`);

function fromHistory(h: HMonth): PGroup[] {
  return h.groups.map((g) => ({
    group: g.group,
    items: g.items.map((it) => ({ name: it.name, normalMan: toMan(it.normal), eventMan: toMan(it.event) })),
  }));
}

export default function PlanningView({ onGenerate }: { onGenerate: (d: RequestData) => void }) {
  const init = nextMonth(latest().y, latest().m);
  const [y, setY] = useState(init.y);
  const [m, setM] = useState(init.m);
  const [plan, setPlan] = useState<PGroup[]>([]);
  const [emphasis, setEmphasis] = useState("");

  const refs = useMemo(() => references(y, m), [y, m]);

  const update = (fn: (p: PGroup[]) => PGroup[]) => setPlan((p) => fn(structuredClone(p)));
  const addGroup = () => update((p) => [...p, { group: "새 이벤트", items: [{ name: "", normalMan: "", eventMan: "" }] }]);
  const loadRef = (h: HMonth) => { setPlan(fromHistory(h)); if (h.emphasis) setEmphasis(h.emphasis.replace(/\s*\|\s*#.*$/, "")); };

  function generate() {
    const data: RequestData = {
      title: `${y}.${m} 이벤트 기획`,
      sheet: key(y, m),
      emphasis: emphasis || null,
      deliverables: { wide: "플친 와이드", list: "플친 리스트", instagram: "인스타(2개)" },
      groups: plan
        .map((g) => ({
          group: g.group.trim() || "이벤트",
          items: g.items
            .filter((it) => it.name.trim())
            .map((it) => ({ name: it.name.trim(), normal: manToWon(it.normalMan), event: manToWon(it.eventMan), eventVat: null, featured: false })),
        }))
        .filter((g) => g.items.length),
    };
    if (!data.groups.length) return;
    onGenerate(data);
  }

  const planItems = plan.reduce((n, g) => n + g.items.length, 0);

  return (
    <div className="space-y-6">
      {/* 월 선택 */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-taupe/20 bg-ivory p-5">
        <div className="flex items-center gap-2">
          <h2 className="font-serif text-2xl text-charcoal">이벤트 기획</h2>
          <span className="text-sm text-charcoal/55">작년·재작년 같은 달을 참고해 이달 라인업 구성</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-charcoal/60">기획 대상</span>
          <select value={y} onChange={(e) => setY(Number(e.target.value))} className="rounded-md border border-taupe/40 bg-white px-2 py-1.5">
            {[2025, 2026, 2027].map((yy) => <option key={yy} value={yy}>{yy}년</option>)}
          </select>
          <select value={m} onChange={(e) => setM(Number(e.target.value))} className="rounded-md border border-taupe/40 bg-white px-2 py-1.5">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((mm) => <option key={mm} value={mm}>{mm}월</option>)}
          </select>
        </div>
      </div>

      {/* 참고: 작년/재작년/직전월 */}
      <div>
        <h3 className="mb-3 font-serif text-lg text-taupe-deep">📚 과거 참고 ({m}월 라인업 히스토리)</h3>
        <div className="grid gap-3 lg:grid-cols-3">
          {refs.map((r) => (
            <div key={r.key} className="rounded-lg border border-taupe/15 bg-white p-3">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <span className="rounded-full bg-taupe/10 px-2 py-0.5 text-xs font-medium text-taupe-deep">{r.tag}</span>
                  <span className="ml-2 text-sm font-semibold">{r.data ? label(r.key) : `${label(r.key)} (없음)`}</span>
                </div>
                {r.data && (
                  <button onClick={() => loadRef(r.data!)} className="rounded border border-taupe/40 px-2 py-1 text-xs text-taupe-deep hover:bg-taupe/10">이 구성 불러오기</button>
                )}
              </div>
              {r.data ? (
                <div className="max-h-72 space-y-2 overflow-auto pr-1">
                  {r.data.emphasis && <p className="text-xs italic text-charcoal/55">“{r.data.emphasis.replace(/\s*\|\s*#.*$/, "")}”</p>}
                  {r.data.groups.map((g, gi) => (
                    <div key={gi} className="rounded bg-ivory/60 p-2">
                      <div className="text-xs font-semibold text-taupe-deep">{g.group}</div>
                      <ul className="mt-1 space-y-0.5">
                        {g.items.map((it, ii) => (
                          <li key={ii} className="flex justify-between gap-2 text-[11px] text-charcoal/75">
                            <span className="truncate">{it.name}</span>
                            <span className="shrink-0 font-medium">{fmtMan(it.event)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-charcoal/40">데이터 없음</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 기획 워크스페이스 */}
      <div className="rounded-xl border border-taupe/20 bg-white p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-serif text-lg text-taupe-deep">이달의 기획 ({y}.{m}) · 이벤트 {plan.length} / 시술 {planItems}</h3>
          <div className="flex gap-2">
            <button onClick={addGroup} className="rounded-md border border-taupe/40 px-3 py-1.5 text-xs font-semibold text-taupe-deep hover:bg-taupe/10">+ 이벤트 추가</button>
            <button onClick={generate} disabled={!planItems} className="rounded-md bg-taupe px-4 py-1.5 text-xs font-semibold text-white hover:bg-taupe-deep disabled:opacity-40">디자인 생성으로 보내기 →</button>
          </div>
        </div>

        <label className="mb-3 block">
          <span className="text-xs text-charcoal/60">월 테마(강조 문구)</span>
          <input value={emphasis} onChange={(e) => setEmphasis(e.target.value)} placeholder="예: 한여름의 시작, 바캉스 전 정비는 뷰티파크"
            className="mt-1 w-full rounded-md border border-taupe/30 px-3 py-2 text-sm" />
        </label>

        {plan.length === 0 && <p className="rounded-md bg-ivory p-4 text-center text-sm text-charcoal/50">위 과거 참고에서 “이 구성 불러오기”로 시작하거나, “+ 이벤트 추가”로 직접 구성하세요.</p>}

        <div className="space-y-4">
          {plan.map((g, gi) => (
            <div key={gi} className="rounded-lg border border-taupe/15 p-3">
              <div className="mb-2 flex items-center gap-2">
                <input value={g.group} onChange={(e) => update((p) => { p[gi].group = e.target.value; return p; })}
                  className="flex-1 rounded-md border border-taupe/30 px-2 py-1.5 text-sm font-semibold" />
                <button onClick={() => update((p) => { p.splice(gi, 1); return p; })} className="rounded px-2 py-1 text-xs text-charcoal/50 hover:bg-red-50 hover:text-red-600">이벤트 삭제</button>
              </div>
              <div className="space-y-1.5">
                {g.items.map((it, ii) => (
                  <div key={ii} className="flex items-center gap-2">
                    <input value={it.name} placeholder="시술명 (구성·횟수 포함)" onChange={(e) => update((p) => { p[gi].items[ii].name = e.target.value; return p; })}
                      className="flex-1 rounded border border-taupe/20 px-2 py-1 text-xs" />
                    <input value={it.normalMan} placeholder="정상" onChange={(e) => update((p) => { p[gi].items[ii].normalMan = e.target.value; return p; })}
                      className="w-16 rounded border border-taupe/20 px-2 py-1 text-right text-xs" />
                    <input value={it.eventMan} placeholder="이벤트" onChange={(e) => update((p) => { p[gi].items[ii].eventMan = e.target.value; return p; })}
                      className="w-16 rounded border border-taupe/20 px-2 py-1 text-right text-xs font-semibold text-taupe-deep" />
                    <span className="text-[10px] text-charcoal/40">만</span>
                    <button onClick={() => update((p) => { p[gi].items[ii] && p[gi].items.splice(ii, 1); return p; })} className="text-xs text-charcoal/40 hover:text-red-600">✕</button>
                  </div>
                ))}
                <button onClick={() => update((p) => { p[gi].items.push({ name: "", normalMan: "", eventMan: "" }); return p; })} className="text-xs text-taupe hover:underline">+ 시술 추가</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
