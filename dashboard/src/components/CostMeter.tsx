import { useEffect, useState } from "react";
import { getSpend, getBudgetUsd, setBudgetUsd, resetSpend, curMonth, usd, krw } from "../lib/cost";

// 헤더에 항상 표시되는 'AI 추정 사용액 / 남은 예산' 위젯.
export default function CostMeter() {
  const [, force] = useState(0);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    const h = () => force((n) => n + 1);
    window.addEventListener("bp-spend", h);
    window.addEventListener("storage", h);
    return () => { window.removeEventListener("bp-spend", h); window.removeEventListener("storage", h); };
  }, []);

  const spend = getSpend();
  const budget = getBudgetUsd();
  const remain = budget != null ? budget - spend.usd : null;
  const pct = budget != null && budget > 0 ? Math.min(100, Math.round((spend.usd / budget) * 100)) : null;
  const over = remain != null && remain < 0;

  const save = () => {
    const n = Number(draft.replace(/[^0-9.]/g, ""));
    setBudgetUsd(isFinite(n) && n > 0 ? n : null);
    setOpen(false);
  };

  return (
    <div className="relative px-5 pb-4">
      <button
        onClick={() => { setDraft(budget != null ? String(budget) : ""); setOpen((v) => !v); }}
        className="w-full rounded-lg border border-taupe/25 bg-white/70 px-3 py-2 text-left transition hover:border-taupe/50"
        title="AI 추정 사용액 — 클릭해서 예산 설정"
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-charcoal/40">AI 추정 사용액</span>
          <span className="text-[10px] text-charcoal/35">{curMonth()}</span>
        </div>
        <div className="mt-0.5 flex items-baseline gap-1.5">
          <span className="font-serif text-lg text-taupe-deep">{usd(spend.usd)}</span>
          <span className="text-xs text-charcoal/50">≈ {krw(spend.usd)}</span>
        </div>
        {budget != null ? (
          <>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-taupe/15">
              <div className={`h-full rounded-full ${over ? "bg-red-400" : "bg-taupe"}`} style={{ width: `${pct}%` }} />
            </div>
            <div className={`mt-1 text-[11px] ${over ? "text-red-500" : "text-charcoal/55"}`}>
              예산 {usd(budget)} 중 {over ? `초과 ${usd(-remain!)}` : `남음 ${usd(remain!)}`} · {spend.calls}회
            </div>
          </>
        ) : (
          <div className="mt-1 text-[11px] text-charcoal/40">예산 미설정 · {spend.calls}회 · 클릭해 설정</div>
        )}
      </button>

      {open && (
        <div className="absolute left-5 right-5 z-20 mt-1 rounded-lg border border-taupe/30 bg-white p-3 shadow-lg">
          <div className="text-xs font-semibold text-taupe-deep">이번 달 예산 (USD)</div>
          <div className="mt-1.5 flex items-center gap-1.5">
            <span className="text-sm text-charcoal/50">$</span>
            <input
              autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()}
              inputMode="decimal" placeholder="예: 10"
              className="w-full rounded-md border border-taupe/30 px-2 py-1.5 text-sm outline-none focus:border-taupe"
            />
          </div>
          {draft && Number(draft) > 0 && (
            <div className="mt-1 text-[11px] text-charcoal/45">≈ {krw(Number(draft))} (환율 1,400원 기준 근사)</div>
          )}
          <div className="mt-2 flex gap-1.5">
            <button onClick={save} className="flex-1 rounded-md bg-taupe px-2 py-1.5 text-xs font-semibold text-white hover:bg-taupe-deep">저장</button>
            <button onClick={() => { setBudgetUsd(null); setOpen(false); }} className="rounded-md border border-taupe/30 px-2 py-1.5 text-xs text-charcoal/60 hover:bg-taupe/10">예산 해제</button>
          </div>
          <button
            onClick={() => { if (confirm("이번 달 누적 사용액을 0으로 초기화할까요?")) { resetSpend(); setOpen(false); } }}
            className="mt-2 w-full rounded-md border border-taupe/20 px-2 py-1 text-[11px] text-charcoal/45 hover:bg-taupe/10"
          >
            이번 달 사용액 초기화
          </button>
          <p className="mt-2 text-[10px] leading-snug text-charcoal/40">
            토큰 사용량 기반 <b>추정치</b>(Gemini·Claude 합산)입니다. Gemini 무료 한도 적용 시 실제 청구는 더 낮을 수 있어요. 이 브라우저 기준으로 집계됩니다.
          </p>
        </div>
      )}
    </div>
  );
}
