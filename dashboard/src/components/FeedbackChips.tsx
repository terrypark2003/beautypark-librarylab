import { useState } from "react";
import type { FeedbackEntry } from "../lib/auth";

const COLORS: Record<string, string> = {
  상: "bg-emerald-100 text-emerald-700 border-emerald-300",
  중: "bg-amber-100 text-amber-700 border-amber-300",
  하: "bg-red-100 text-red-600 border-red-300",
};

/** 이벤트(그룹) 반응 상/중/하 + 메모 입력. 같은 등급을 다시 누르면 해제. */
export function FeedbackChips({ entry, onChange }: { entry?: FeedbackEntry; onChange: (rating: string, note: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState("");
  const rating = entry?.rating || "";
  const saveNote = () => { onChange(rating, note.trim()); setEditing(false); };
  return (
    <div className="shrink-0">
      <div className="flex items-center gap-0.5" title="이 이벤트의 반응을 기록하세요 (다음 기획 참고용)">
        {(["상", "중", "하"] as const).map((rt) => (
          <button key={rt} onClick={() => onChange(rating === rt ? "" : rt, entry?.note || "")}
            className={`rounded border px-1.5 py-0 text-[11px] leading-5 ${rating === rt ? COLORS[rt] : "border-taupe/25 text-charcoal/40 hover:bg-taupe/10"}`}>{rt}</button>
        ))}
        <button onClick={() => { setNote(entry?.note || ""); setEditing((v) => !v); }} title={entry?.note || "메모"}
          className={`rounded border border-taupe/25 px-1.5 py-0 text-[11px] leading-5 hover:bg-taupe/10 ${entry?.note ? "text-taupe-deep" : "text-charcoal/40"}`}>✎</button>
      </div>
      {editing && (
        <div className="mt-1 flex items-center gap-1">
          <input value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveNote()} autoFocus
            placeholder="반응 메모 (예: 문의 많았음)" className="w-44 rounded border border-taupe/30 px-1.5 py-0.5 text-[11px]" />
          <button onClick={saveNote} className="rounded bg-taupe px-1.5 py-0.5 text-[10px] font-semibold text-white">저장</button>
        </div>
      )}
    </div>
  );
}
