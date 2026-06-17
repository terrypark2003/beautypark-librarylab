import { useState } from "react";
import EventHub from "./components/EventHub";
import { BrandPanel, ChannelsPanel, CalendarPanel, ChecklistPanel } from "./components/Panels";

const TABS = [
  { id: "events", label: "이벤트 콘텐츠 허브", hint: "엑셀 → 카피 덱" },
  { id: "brand", label: "브랜드 가이드", hint: "로고 · 컬러" },
  { id: "channels", label: "채널 · 계정", hint: "바로가기" },
  { id: "calendar", label: "운영 캘린더", hint: "발행 주기" },
  { id: "checklist", label: "인수인계", hint: "체크리스트" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function App() {
  const [tab, setTab] = useState<TabId>("events");

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* 사이드바 */}
      <aside className="shrink-0 border-b border-taupe/20 bg-ivory md:w-64 md:border-b-0 md:border-r">
        <div className="p-5">
          <div className="font-serif text-2xl tracking-wide text-taupe-deep">BEAUTY PARK</div>
          <div className="text-xs text-charcoal/60">뷰티파크의원 범어점 · 운영 대시보드</div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:gap-0.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm transition ${
                tab === t.id
                  ? "bg-taupe text-white"
                  : "text-charcoal/70 hover:bg-taupe/10"
              }`}
            >
              <div className="font-medium">{t.label}</div>
              <div className={`text-xs ${tab === t.id ? "text-white/70" : "text-charcoal/40"}`}>
                {t.hint}
              </div>
            </button>
          ))}
        </nav>
      </aside>

      {/* 본문 */}
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-5xl p-5 md:p-8">
          {tab === "events" && <EventHub />}
          {tab === "brand" && <BrandPanel />}
          {tab === "channels" && <ChannelsPanel />}
          {tab === "calendar" && <CalendarPanel />}
          {tab === "checklist" && <ChecklistPanel />}
        </div>
      </main>
    </div>
  );
}
