import { useState } from "react";
import type { RequestData } from "./lib/types";
import PlanningView from "./components/PlanningView";
import PosterStudio from "./components/PosterStudio";
import EventHub from "./components/EventHub";
import { BrandPanel, ChannelsPanel, CalendarPanel, ChecklistPanel } from "./components/Panels";
import CostMeter from "./components/CostMeter";

const FLOW = [
  { id: "plan", label: "① 이벤트 기획", hint: "히스토리 참고" },
  { id: "posters", label: "② 디자인 생성", hint: "배경 + 포스터" },
] as const;
const REF = [
  { id: "copy", label: "카피 덱(텍스트)", hint: "엑셀 → 카피" },
  { id: "brand", label: "브랜드 가이드", hint: "로고 · 컬러" },
  { id: "channels", label: "채널 · 계정", hint: "바로가기" },
  { id: "calendar", label: "운영 캘린더", hint: "발행 주기" },
  { id: "checklist", label: "인수인계", hint: "체크리스트" },
] as const;

type TabId = (typeof FLOW)[number]["id"] | (typeof REF)[number]["id"];

export default function App() {
  const [tab, setTab] = useState<TabId>("plan");
  const [planData, setPlanData] = useState<RequestData | null>(null);

  const NavBtn = ({ id, label, hint }: { id: TabId; label: string; hint: string }) => (
    <button
      onClick={() => setTab(id)}
      className={`whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm transition ${
        tab === id ? "bg-taupe text-white" : "text-charcoal/70 hover:bg-taupe/10"
      }`}
    >
      <div className="font-medium">{label}</div>
      <div className={`text-xs ${tab === id ? "text-white/70" : "text-charcoal/40"}`}>{hint}</div>
    </button>
  );

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="shrink-0 border-b border-taupe/20 bg-ivory md:w-64 md:border-b-0 md:border-r">
        <div className="p-5">
          <div className="font-serif text-2xl tracking-wide text-taupe-deep">BEAUTY PARK</div>
          <div className="text-xs text-charcoal/60">뷰티파크의원 범어점 · 운영 대시보드</div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:gap-0.5">
          <div className="px-1 pt-1 text-[11px] font-semibold uppercase tracking-wider text-charcoal/35 md:pt-0">워크플로우</div>
          {FLOW.map((t) => <NavBtn key={t.id} {...t} />)}
          <div className="px-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-charcoal/35">참고자료</div>
          {REF.map((t) => <NavBtn key={t.id} {...t} />)}
        </nav>
        <CostMeter />
      </aside>

      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-6xl p-5 md:p-8">
          {tab === "plan" && <PlanningView onGenerate={(d) => { setPlanData(d); setTab("posters"); }} />}
          {tab === "posters" && <PosterStudio initialData={planData} />}
          {tab === "copy" && <EventHub />}
          {tab === "brand" && <BrandPanel />}
          {tab === "channels" && <ChannelsPanel />}
          {tab === "calendar" && <CalendarPanel />}
          {tab === "checklist" && <ChecklistPanel />}
        </div>
      </main>
    </div>
  );
}
