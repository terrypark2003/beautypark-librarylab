import { useState } from "react";

// 로그인 화면. 직원: 이름+비번(초기=전화 뒤4자리, 첫 로그인 시 변경).
// 대표: 로고 10번 클릭 → 관리자 로그인.
export default function Login({ initialMode = "login", onAuthed }: { initialMode?: "login" | "setpw"; onAuthed: () => void }) {
  const [mode, setMode] = useState<"login" | "setpw" | "admin">(initialMode);
  const [name, setName] = useState("");
  const [pw, setPw] = useState("");
  const [np, setNp] = useState("");
  const [np2, setNp2] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [clicks, setClicks] = useState(0);

  const post = async (url: string, body: any) => {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || "요청 실패");
    return d;
  };

  async function doLogin() {
    setBusy(true); setErr("");
    try { const d = await post("/api/auth?action=login", { name: name.trim(), password: pw }); if (d.mustSet) { setMode("setpw"); setPw(""); } else onAuthed(); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }
  async function doSetPw() {
    if (np.length < 4) { setErr("비밀번호는 4자 이상이어야 합니다"); return; }
    if (np !== np2) { setErr("비밀번호가 일치하지 않습니다"); return; }
    setBusy(true); setErr("");
    try { await post("/api/auth?action=set-password", { newPassword: np }); onAuthed(); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }
  async function doAdmin() {
    setBusy(true); setErr("");
    try { await post("/api/auth?action=admin-login", { password: pw }); onAuthed(); }
    catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }
  const onLogo = () => setClicks((c) => { const n = c + 1; if (n >= 10) { setMode("admin"); setErr(""); setPw(""); return 0; } return n; });

  const input = "w-full rounded-lg border border-taupe/30 px-3 py-2.5 text-sm outline-none focus:border-taupe";
  const btn = "w-full rounded-lg bg-taupe px-4 py-2.5 text-sm font-semibold text-white hover:bg-taupe-deep disabled:opacity-50";

  return (
    <div className="flex min-h-screen items-center justify-center bg-ivory p-6">
      <div className="w-full max-w-sm rounded-2xl border border-taupe/20 bg-white p-7 shadow-xl">
        <div onClick={onLogo} className="select-none font-serif text-2xl tracking-wide text-taupe-deep" style={{ cursor: "default" }}>BEAUTY PARK</div>
        <div className="mb-5 text-xs text-charcoal/55">뷰티파크의원 범어점 · 운영 대시보드</div>

        {mode === "login" && (
          <div className="space-y-2.5">
            <input className={input} placeholder="이름" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doLogin()} />
            <input className={input} type="password" placeholder="비밀번호" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doLogin()} />
            <button className={btn} onClick={doLogin} disabled={busy}>{busy ? "확인 중…" : "로그인"}</button>
            <p className="pt-1 text-[11px] text-charcoal/45">초기 비밀번호는 <b>전화번호 뒤 4자리</b>입니다. 첫 로그인 후 새 비밀번호를 설정하세요.</p>
          </div>
        )}
        {mode === "setpw" && (
          <div className="space-y-2.5">
            <div className="text-sm font-medium text-charcoal/80">새 비밀번호 설정</div>
            <input className={input} type="password" placeholder="새 비밀번호(4자 이상)" value={np} onChange={(e) => setNp(e.target.value)} />
            <input className={input} type="password" placeholder="새 비밀번호 확인" value={np2} onChange={(e) => setNp2(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doSetPw()} />
            <button className={btn} onClick={doSetPw} disabled={busy}>{busy ? "저장 중…" : "설정하고 시작하기"}</button>
          </div>
        )}
        {mode === "admin" && (
          <div className="space-y-2.5">
            <div className="text-sm font-medium text-taupe-deep">🛠 대표 관리자 로그인</div>
            <input className={input} type="password" placeholder="관리자 비밀번호" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doAdmin()} autoFocus />
            <button className={btn} onClick={doAdmin} disabled={busy}>{busy ? "확인 중…" : "관리자 로그인"}</button>
            <button className="w-full text-[11px] text-charcoal/45 hover:underline" onClick={() => { setMode("login"); setErr(""); }}>← 직원 로그인으로</button>
          </div>
        )}
        {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
      </div>
    </div>
  );
}
