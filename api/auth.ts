// 통합 인증/관리 엔드포인트 — /api/auth?action=...  (함수 개수 절약을 위해 단일 함수로 디스패치)
import {
  authConfigured, getEmployees, saveEmployees, verifyPw, hashPw,
  setSessionCookie, clearSessionCookie, readSession, addLog, getLogs,
} from "./_auth";

const uid = () => "e" + Math.random().toString(36).slice(2, 9);
const parseBody = (req: any) => { let b = req.body; if (typeof b === "string") { try { b = JSON.parse(b); } catch { b = {}; } } return b || {}; };

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");
  const action = String(req.query?.action || "");

  // ---- 상태 ----
  if (action === "me") {
    const s = readSession(req);
    res.status(200).json({ configured: authConfigured(), user: s ? { name: s.name, role: s.role, mustSet: !!s.mustSet } : null });
    return;
  }

  // ---- 직원 로그인 ----
  if (action === "login") {
    if (req.method !== "POST") { res.status(405).json({ error: "POST only" }); return; }
    if (!authConfigured()) { res.status(400).json({ error: "로그인이 설정되지 않았습니다" }); return; }
    const b = parseBody(req);
    const name = String(b.name || "").trim(), password = String(b.password || "");
    if (!name || !password) { res.status(400).json({ error: "이름과 비밀번호를 입력하세요" }); return; }
    let emps: Record<string, any>;
    try { emps = await getEmployees(); } catch (e: any) { res.status(502).json({ error: "저장소 오류: " + String(e?.message || e).slice(0, 100) }); return; }
    const emp = Object.values(emps).find((e: any) => e.name.trim() === name && e.active !== false) as any;
    if (!emp) { res.status(401).json({ error: "등록된 직원이 아닙니다 (이름 확인)" }); return; }
    let mustSet = false, ok = false;
    if (emp.hash && emp.salt) ok = verifyPw(password, emp.salt, emp.hash);
    else { ok = password === emp.phone4; mustSet = true; }
    if (!ok) { res.status(401).json({ error: "비밀번호가 올바르지 않습니다" }); return; }
    res.setHeader("Set-Cookie", setSessionCookie({ uid: emp.id, name: emp.name, role: "employee", mustSet, t: Date.now() }));
    await addLog({ user: emp.name, role: "employee", action: "로그인" });
    res.status(200).json({ ok: true, mustSet, name: emp.name });
    return;
  }

  // ---- 비밀번호 설정(첫 로그인) ----
  if (action === "set-password") {
    if (req.method !== "POST") { res.status(405).json({ error: "POST only" }); return; }
    const s = readSession(req);
    if (!s || s.role !== "employee") { res.status(401).json({ error: "로그인이 필요합니다" }); return; }
    const np = String(parseBody(req).newPassword || "");
    if (np.length < 4) { res.status(400).json({ error: "비밀번호는 4자 이상" }); return; }
    const emps = await getEmployees();
    const emp = emps[s.uid];
    if (!emp) { res.status(404).json({ error: "직원 정보 없음" }); return; }
    const { salt, hash } = hashPw(np);
    emp.salt = salt; emp.hash = hash;
    await saveEmployees(emps);
    res.setHeader("Set-Cookie", setSessionCookie({ ...s, mustSet: false }));
    await addLog({ user: emp.name, role: "employee", action: "비밀번호 설정" });
    res.status(200).json({ ok: true });
    return;
  }

  // ---- 로그아웃 ----
  if (action === "logout") {
    res.setHeader("Set-Cookie", clearSessionCookie());
    res.status(200).json({ ok: true });
    return;
  }

  // ---- 대표 관리자 로그인(로고 10번 클릭) ----
  if (action === "admin-login") {
    if (req.method !== "POST") { res.status(405).json({ error: "POST only" }); return; }
    const admin = process.env.ADMIN_PASSWORD || "";
    if (!admin) { res.status(400).json({ error: "ADMIN_PASSWORD가 설정되지 않았습니다" }); return; }
    if (String(parseBody(req).password || "") !== admin) { res.status(401).json({ error: "관리자 비밀번호가 올바르지 않습니다" }); return; }
    res.setHeader("Set-Cookie", setSessionCookie({ uid: "admin", name: "대표", role: "admin", t: Date.now() }));
    await addLog({ user: "대표", role: "admin", action: "관리자 로그인" });
    res.status(200).json({ ok: true });
    return;
  }

  // ---- 작업 로그 기록(로그인 사용자) ----
  if (action === "log") {
    if (req.method !== "POST") { res.status(405).json({ error: "POST only" }); return; }
    const s = readSession(req);
    if (!s) { res.status(200).json({ ok: false }); return; }
    const b = parseBody(req);
    const act = String(b.action || "").slice(0, 40), detail = String(b.detail || "").slice(0, 140);
    if (act) await addLog({ user: s.name, role: s.role, action: act, detail });
    res.status(200).json({ ok: true });
    return;
  }

  // ===== 관리자 전용 =====
  const s = readSession(req);
  const admin = s && s.role === "admin";

  if (action === "employees") {
    if (!admin) { res.status(403).json({ error: "관리자만 가능합니다" }); return; }
    if (req.method === "GET") {
      const e = await getEmployees();
      res.status(200).json({ employees: Object.values(e).map((x: any) => ({ id: x.id, name: x.name, phone4: x.phone4, hasPw: !!x.hash, active: x.active !== false })) });
      return;
    }
    const b = parseBody(req);
    if (req.method === "POST") {
      const e = await getEmployees();
      if (b.action === "reset") {
        const emp = e[String(b.id || "")];
        if (emp) { delete emp.hash; delete emp.salt; await saveEmployees(e); await addLog({ user: "대표", role: "admin", action: "비번 초기화", detail: emp.name }); }
        res.status(200).json({ ok: true }); return;
      }
      if (b.action === "bulk" && Array.isArray(b.list)) {
        let added = 0; const skipped: string[] = [];
        for (const item of b.list as any[]) {
          const nm = String(item?.name || "").trim(), ph = String(item?.phone || "").replace(/[^0-9]/g, "");
          if (!nm || ph.length < 4) { skipped.push(`${nm || "(이름없음)"}: 전화번호 확인`); continue; }
          if (Object.values(e).some((x: any) => x.name.trim() === nm && x.phone4 === ph.slice(-4))) { skipped.push(`${nm}: 이미 등록됨`); continue; }
          const nid = uid();
          e[nid] = { id: nid, name: nm, phone4: ph.slice(-4), active: true };
          added++;
        }
        if (added) await saveEmployees(e);
        await addLog({ user: "대표", role: "admin", action: "직원 일괄추가", detail: `${added}명 추가` });
        res.status(200).json({ ok: true, added, skipped });
        return;
      }
      const name = String(b.name || "").trim(), phone = String(b.phone || "").replace(/[^0-9]/g, "");
      if (!name || phone.length < 4) { res.status(400).json({ error: "이름과 전화번호(4자리 이상)를 입력하세요" }); return; }
      const id = uid();
      e[id] = { id, name, phone4: phone.slice(-4), active: true };
      await saveEmployees(e);
      await addLog({ user: "대표", role: "admin", action: "직원 추가", detail: name });
      res.status(200).json({ ok: true, id });
      return;
    }
    if (req.method === "DELETE") {
      const e = await getEmployees();
      const id = String(b.id || req.query?.id || "");
      if (e[id]) { const nm = e[id].name; delete e[id]; await saveEmployees(e); await addLog({ user: "대표", role: "admin", action: "직원 삭제", detail: nm }); }
      res.status(200).json({ ok: true });
      return;
    }
    res.status(405).json({ error: "method" });
    return;
  }

  if (action === "logs") {
    if (!admin) { res.status(403).json({ error: "관리자만 가능합니다" }); return; }
    try { res.status(200).json({ logs: await getLogs(800) }); }
    catch (e: any) { res.status(502).json({ error: String(e?.message || e).slice(0, 120), logs: [] }); }
    return;
  }

  res.status(404).json({ error: "unknown action" });
}
