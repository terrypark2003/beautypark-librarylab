import { useEffect, useMemo, useState } from "react";
import { history, listMonths, label, key, fixedMonths, parseEmphasis, discount, fmtMan, searchItems, type HMonth } from "../lib/history";
import { fetchFeedback, saveFeedbackEntry, fbKey, type FeedbackMap } from "../lib/auth";
import { FeedbackChips } from "./FeedbackChips";

const DOT: Record<string, string> = { 상: "bg-emerald-500", 중: "bg-amber-400", 하: "bg-red-400" };

function monthStats(m: HMonth) {
  const items = m.groups.flatMap((g) => g.items);
  const events = items.map((i) => i.event).filter((v): v is number => v != null && v > 0);
  const discs = items.map((i) => discount(i.normal, i.event)).filter((d): d is number => d != null);
  return {
    groups: m.groups.length,
    items: items.length,
    avgDisc: discs.length ? Math.round(discs.reduce((a, b) => a + b, 0) / discs.length) : null,
    min: events.length ? Math.min(...events) : null,
    max: events.length ? Math.max(...events) : null,
  };
}

export default function EventHistory() {
  const months = useMemo(() => listMonths().reverse(), []); // 최신 월 먼저
  const [sel, setSel] = useState(months[0]);
  // #history?q=물광주사 형태로 검색을 공유·북마크할 수 있게 초기값을 해시에서 읽는다
  const [q, setQ] = useState(() => new URLSearchParams(location.hash.split("?")[1] || "").get("q") || "");
  const [feedback, setFeedback] = useState<FeedbackMap>({});
  const [fbErr, setFbErr] = useState<string | null>(null);
  useEffect(() => { fetchFeedback().then(setFeedback); }, []);

  const byYear = useMemo(() => {
    const m: Record<string, string[]> = {};
    for (const k of months) (m[k.split(".")[0]] ||= []).push(k);
    return Object.entries(m).sort((a, b) => Number(b[0]) - Number(a[0]));
  }, [months]);

  const fbOf = (month: string, group: string) => feedback[month]?.[fbKey(group)];
  async function change(month: string, group: string, rating: string, note: string) {
    const k = fbKey(group);
    setFeedback((f) => {
      const n = structuredClone(f);
      if (!rating && !note) { if (n[month]) { delete n[month][k]; if (!Object.keys(n[month]).length) delete n[month]; } }
      else (n[month] ||= {})[k] = { ...(n[month]?.[k] || {}), rating: rating as any, note };
      return n;
    });
    const r = await saveFeedbackEntry(month, k, rating, note);
    setFbErr(r.ok ? null : r.error || "저장 실패");
  }

  const totalItems = useMemo(() => months.reduce((n, k) => n + history[k].groups.reduce((a, g) => a + g.items.length, 0), 0), [months]);
  const results = useMemo(() => searchItems(q), [q]);

  const data = history[sel];
  const idx = months.indexOf(sel);
  const newer = months[idx - 1], older = months[idx + 1];
  const [sy, sm] = sel.split(".").map(Number);
  const lastYear = history[key(sy - 1, sm)] ? key(sy - 1, sm) : null;
  const em = parseEmphasis(data.emphasis);
  const st = monthStats(data);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-taupe/20 bg-ivory p-5">
        <div>
          <h2 className="font-serif text-2xl text-charcoal">📚 이벤트 히스토리</h2>
          <p className="text-sm text-charcoal/55">{label(months[months.length - 1])} ~ {label(months[0])} · {months.length}개월 · 시술 {totalItems.toLocaleString()}건 · 가격은 부가세 별도</p>
        </div>
        <div className="flex items-center gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="시술명 검색 — 예: 물광주사, 세르프, 아이슈링크"
            className="w-72 rounded-md border border-taupe/30 bg-white px-3 py-2 text-sm" />
          {q && <button onClick={() => setQ("")} className="text-xs text-charcoal/50 hover:underline">지우기</button>}
        </div>
      </div>
      {fbErr && <div className="text-xs text-red-600">⚠ 반응 저장 실패: {fbErr}</div>}

      {q.trim() ? (
        <SearchResults q={q} results={results} onPick={(k) => { setSel(k); setQ(""); }} />
      ) : (
        <div className="flex flex-col gap-5 md:flex-row">
          {/* 월 목록 — 모바일은 가로 스크롤 칩, 데스크톱은 세로 목록 */}
          <div className="flex w-full min-w-0 gap-1.5 overflow-x-auto pb-1 md:hidden">
            {months.map((k) => (
              <button key={k} onClick={() => setSel(k)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs ${sel === k ? "bg-taupe text-white" : "border border-taupe/25 bg-white text-charcoal/70"}`}>
                {k.replace(".", "년 ")}월
              </button>
            ))}
          </div>
          <aside className="hidden shrink-0 md:block md:w-44">
            <div className="max-h-[70vh] overflow-auto rounded-lg border border-taupe/15 bg-white p-2">
              {byYear.map(([year, keys]) => (
                <div key={year} className="mb-2">
                  <div className="px-2 py-1 text-[11px] font-semibold tracking-wider text-charcoal/40">{year}년</div>
                  {keys.map((k) => {
                    const h = history[k];
                    const n = h.groups.reduce((a, g) => a + g.items.length, 0);
                    const fbs = Object.values(feedback[k] || {}).map((e) => e.rating).filter(Boolean);
                    const on = sel === k;
                    return (
                      <button key={k} onClick={() => setSel(k)}
                        className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-sm ${on ? "bg-taupe text-white" : "text-charcoal/80 hover:bg-taupe/10"}`}>
                        <span>{k.split(".")[1]}월</span>
                        <span className="flex items-center gap-1">
                          {fbs.map((r, i) => <span key={i} className={`inline-block h-1.5 w-1.5 rounded-full ${DOT[r]}`} />)}
                          <span className={`text-[10px] ${on ? "text-white/70" : "text-charcoal/40"}`}>{n}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </aside>

          {/* 월 상세 */}
          <section className="min-w-0 flex-1 space-y-4">
            <div className="rounded-xl border border-taupe/20 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-serif text-2xl text-taupe-deep">{label(sel)}</h3>
                  <div className="text-xs text-charcoal/50">{data.title}</div>
                </div>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {older && <button onClick={() => setSel(older)} className="rounded border border-taupe/30 px-2 py-1 hover:bg-taupe/10">← {label(older)}</button>}
                  {lastYear && <button onClick={() => setSel(lastYear)} className="rounded border border-taupe-deep/40 px-2 py-1 text-taupe-deep hover:bg-taupe/10">작년 같은 달</button>}
                  {newer && <button onClick={() => setSel(newer)} className="rounded border border-taupe/30 px-2 py-1 hover:bg-taupe/10">{label(newer)} →</button>}
                </div>
              </div>
              {(em.wolcho || em.jungsun) && (
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {em.wolcho && <span className="rounded-full bg-taupe/10 px-2.5 py-1 text-taupe-deep"><b>월초</b> {em.wolcho}</span>}
                  {em.jungsun && <span className="rounded-full bg-taupe/10 px-2.5 py-1 text-taupe-deep"><b>월중순</b> {em.jungsun}</span>}
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-charcoal/60">
                <span>이벤트 <b className="text-charcoal">{st.groups}</b></span>
                <span>시술 <b className="text-charcoal">{st.items}</b></span>
                {st.avgDisc != null && <span>평균 할인 <b className="text-charcoal">{st.avgDisc}%</b></span>}
                {st.min != null && st.max != null && <span>이벤트가 <b className="text-charcoal">{fmtMan(st.min)}만 ~ {fmtMan(st.max)}만</b></span>}
              </div>
              {fixedMonths.has(sel) && (
                <p className="mt-3 rounded bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                  ⚠ 이 달 요청서는 열 순서가 달라 정상가·이벤트가가 뒤집혀 저장돼 있었습니다. 큰 값을 정상가로 자동 보정해 표시하며, 정상가가 비어 있던 줄은 이벤트가 칸의 값이 실제로는 정상가일 수 있어요.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {data.groups.map((g, gi) => {
                const fb = fbOf(sel, g.group);
                return (
                  <div key={gi} className="min-w-0 overflow-hidden rounded-lg border border-taupe/15 bg-white">
                    <div className="flex items-start justify-between gap-2 border-b border-taupe/10 bg-ivory/60 px-3 py-2">
                      <div className="min-w-0">
                        <div className="whitespace-pre-line text-sm font-semibold text-taupe-deep">{g.group}</div>
                        {fb?.note && <div className="mt-0.5 text-[11px] text-charcoal/55">💬 {fb.note}</div>}
                      </div>
                      <FeedbackChips entry={fb} onChange={(r, n) => change(sel, g.group, r, n)} />
                    </div>
                    <table className="w-full table-fixed text-sm">
                      <colgroup><col /><col className="w-14" /><col className="w-16" /><col className="w-12" /></colgroup>
                      <tbody>
                        {g.items.map((it, ii) => {
                          const d = discount(it.normal, it.event);
                          return (
                            <tr key={ii} className="border-b border-taupe/10 last:border-0">
                              <td className="break-words px-3 py-1.5 text-charcoal/85">{it.name}</td>
                              <td className="whitespace-nowrap px-2 py-1.5 text-right text-xs text-charcoal/40 line-through">{it.normal ? `${fmtMan(it.normal)}만` : ""}</td>
                              <td className="whitespace-nowrap px-2 py-1.5 text-right font-semibold text-taupe-deep">{it.event != null ? `${fmtMan(it.event)}만` : "—"}</td>
                              <td className="whitespace-nowrap py-1.5 pr-3 text-right text-[11px] text-emerald-700">{d != null ? `${d}%↓` : ""}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function SearchResults({ q, results, onPick }: { q: string; results: ReturnType<typeof searchItems>; onPick: (month: string) => void }) {
  const monthsHit = new Set(results.map((r) => r.month)).size;
  const priced = results.filter((r) => r.item.event != null && r.item.event > 0);
  const lo = priced.length ? priced.reduce((a, b) => (b.item.event! < a.item.event! ? b : a)) : null;
  const hi = priced.length ? priced.reduce((a, b) => (b.item.event! > a.item.event! ? b : a)) : null;
  return (
    <div className="rounded-xl border border-taupe/20 bg-white p-5">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
        <span className="font-semibold text-charcoal">「{q.trim()}」 {results.length}건</span>
        {results.length > 0 && <span className="text-charcoal/55">{monthsHit}개월 등장</span>}
        {lo && hi && lo !== hi && (
          <span className="text-charcoal/55">이벤트가 최저 <b className="text-taupe-deep">{fmtMan(lo.item.event)}만</b> ({label(lo.month)}) ~ 최고 <b className="text-taupe-deep">{fmtMan(hi.item.event)}만</b> ({label(hi.month)})</span>
        )}
      </div>
      {results.length === 0 ? (
        <p className="py-6 text-center text-sm text-charcoal/45">일치하는 시술이 없어요. 띄어쓰기 없이 짧게 검색해 보세요.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-taupe/20 text-left text-[11px] text-charcoal/50">
                <th className="px-2 py-1.5 font-medium">월</th><th className="px-2 py-1.5 font-medium">이벤트</th><th className="px-2 py-1.5 font-medium">시술명</th>
                <th className="px-2 py-1.5 text-right font-medium">정상가</th><th className="px-2 py-1.5 text-right font-medium">이벤트가</th><th className="px-2 py-1.5 text-right font-medium">할인</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => {
                const d = discount(r.item.normal, r.item.event);
                return (
                  <tr key={i} className="border-b border-taupe/10 last:border-0 hover:bg-ivory/60">
                    <td className="whitespace-nowrap px-2 py-1.5"><button onClick={() => onPick(r.month)} className="text-taupe-deep hover:underline">{label(r.month)}</button></td>
                    <td className="max-w-[14rem] truncate px-2 py-1.5 text-xs text-charcoal/60" title={r.group}>{r.group.split("\n")[0]}</td>
                    <td className="px-2 py-1.5 text-charcoal/85">{r.item.name}</td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-right text-xs text-charcoal/40 line-through">{r.item.normal ? `${fmtMan(r.item.normal)}만` : ""}</td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-right font-semibold text-taupe-deep">{r.item.event != null ? `${fmtMan(r.item.event)}만` : "—"}</td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-right text-[11px] text-emerald-700">{d != null ? `${d}%↓` : ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
