import { useEffect, useState } from "react";

type Emp = { id: string; name: string; phone4: string; hasPw: boolean; active: boolean };
type Log = { ts: number; user: string; role: string; action: string; detail?: string };

export default function AdminPanel() {
  const [tab, setTab] = useState<"emp" | "log">("emp");
  const [emps, setEmps] = useState<Emp[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");

  const loadEmps = () => fetch("/api/auth?action=employees", { cache: "no-store" }).then((r) => r.json()).then((d) => setEmps(d.employees || [])).catch(() => {});
  const loadLogs = () => fetch("/api/auth?action=logs", { cache: "no-store" }).then((r) => r.json()).then((d) => setLogs(d.logs || [])).catch(() => {});
  useEffect(() => { loadEmps(); loadLogs(); }, []);

  async function add() {
    const ph = phone.replace(/[^0-9]/g, "");
    if (!name.trim() || ph.length < 4) { setMsg("이름과 전화번호(4자리 이상)를 입력하세요"); return; }
    setMsg("");
    await fetch("/api/auth?action=employees", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), phone: ph }) });
    setName(""); setPhone(""); loadEmps();
  }
  async function del(id: string, nm: string) { if (!confirm(`${nm} 직원을 삭제할까요?`)) return; await fetch("/api/auth?action=employees", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); loadEmps(); }
  async function reset(id: string, nm: string) { if (!confirm(`${nm}의 비밀번호를 초기화할까요? (초기 비번 = 전화 뒤 4자리)`)) return; await fetch("/api/auth?action=employees", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reset", id }) }); loadEmps(); }

  const fmtTs = (t: number) => new Date(t).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  const shownLogs = logs.filter((l) => !q || l.user.includes(q) || l.action.includes(q) || (l.detail || "").includes(q));
  const th = "border-b border-taupe/20 px-2 py-1.5 text-left font-medium text-charcoal/55";
  const td = "border-b border-taupe/10 px-2 py-1.5";

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <h2 className="font-serif text-2xl text-charcoal">🛠 관리자</h2>
        <span className="text-sm text-charcoal/55">직원 계정 · 사용 로그</span>
        <div className="ml-auto flex gap-1">
          <button onClick={() => setTab("emp")} className={`rounded-md px-3 py-1.5 text-sm ${tab === "emp" ? "bg-taupe text-white" : "text-charcoal/60 hover:bg-taupe/10"}`}>직원 관리</button>
          <button onClick={() => setTab("log")} className={`rounded-md px-3 py-1.5 text-sm ${tab === "log" ? "bg-taupe text-white" : "text-charcoal/60 hover:bg-taupe/10"}`}>사용 로그</button>
        </div>
      </div>

      {tab === "emp" && (
        <div className="rounded-xl border border-taupe/20 bg-white p-5">
          <div className="mb-3 flex flex-wrap items-end gap-2">
            <label className="text-xs text-charcoal/60">이름<input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-40 rounded-md border border-taupe/30 px-2 py-1.5 text-sm" /></label>
            <label className="text-xs text-charcoal/60">전화번호<input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010-0000-0000" className="mt-1 block w-44 rounded-md border border-taupe/30 px-2 py-1.5 text-sm" /></label>
            <button onClick={add} className="rounded-md bg-taupe px-4 py-2 text-sm font-semibold text-white hover:bg-taupe-deep">+ 직원 추가</button>
            {msg && <span className="text-xs text-red-600">{msg}</span>}
          </div>
          <p className="mb-2 text-[11px] text-charcoal/45">추가하면 초기 비밀번호는 전화번호 뒤 4자리입니다. 직원이 첫 로그인 때 새 비밀번호를 설정합니다.</p>
          <table className="w-full text-sm">
            <thead><tr><th className={th}>이름</th><th className={th}>초기비번(뒤4)</th><th className={th}>비번 설정</th><th className={th}>관리</th></tr></thead>
            <tbody>
              {emps.map((e) => (
                <tr key={e.id}>
                  <td className={td}>{e.name}</td>
                  <td className={`${td} tabular-nums`}>{e.phone4}</td>
                  <td className={td}>{e.hasPw ? <span className="text-emerald-600">설정됨</span> : <span className="text-charcoal/40">초기(미설정)</span>}</td>
                  <td className={td}><button onClick={() => reset(e.id, e.name)} className="mr-2 text-xs text-taupe-deep hover:underline">비번 초기화</button><button onClick={() => del(e.id, e.name)} className="text-xs text-red-600 hover:underline">삭제</button></td>
                </tr>
              ))}
              {emps.length === 0 && <tr><td className={`${td} text-charcoal/40`} colSpan={4}>등록된 직원이 없습니다. 위에서 추가하세요.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === "log" && (
        <div className="rounded-xl border border-taupe/20 bg-white p-5">
          <div className="mb-3 flex items-center gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="검색(이름·동작)" className="w-56 rounded-md border border-taupe/30 px-2 py-1.5 text-sm" />
            <button onClick={loadLogs} className="rounded-md border border-taupe/40 px-3 py-1.5 text-sm text-taupe-deep hover:bg-taupe/10">새로고침</button>
            <span className="text-xs text-charcoal/45">{shownLogs.length}건</span>
          </div>
          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full text-sm">
              <thead><tr><th className={th}>시각</th><th className={th}>사용자</th><th className={th}>동작</th><th className={th}>상세</th></tr></thead>
              <tbody>
                {shownLogs.map((l, i) => (
                  <tr key={i}>
                    <td className={`${td} whitespace-nowrap text-charcoal/55`}>{fmtTs(l.ts)}</td>
                    <td className={td}>{l.user}{l.role === "admin" && <span className="ml-1 text-[10px] text-taupe-deep">(대표)</span>}</td>
                    <td className={td}>{l.action}</td>
                    <td className={`${td} text-charcoal/60`}>{l.detail || ""}</td>
                  </tr>
                ))}
                {shownLogs.length === 0 && <tr><td className={`${td} text-charcoal/40`} colSpan={4}>로그가 없습니다.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
