import { PALETTE, LOGO_VARIANTS, CHANNELS, FOOTER } from "../lib/brand";

export function BrandPanel() {
  return (
    <div className="space-y-8">
      <section>
        <h3 className="mb-3 font-serif text-xl text-taupe-deep">브랜드 컬러</h3>
        <p className="mb-3 text-xs text-amber-700">
          ⚠️ HEX는 로고 이미지 추정값 — 원본/브랜드가이드 수치로 확정 권장
        </p>
        <div className="flex flex-wrap gap-3">
          {PALETTE.map((c) => (
            <div key={c.hex} className="w-32 overflow-hidden rounded-lg border border-taupe/15 bg-white">
              <div className="h-16" style={{ background: c.hex }} />
              <div className="p-2 text-xs">
                <div className="font-medium text-charcoal">{c.name}</div>
                <div className="text-charcoal/60">{c.hex}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-3 font-serif text-xl text-taupe-deep">로고 변형 (5종)</h3>
        <div className="grid gap-2 md:grid-cols-2">
          {LOGO_VARIANTS.map((l) => (
            <div key={l.name} className="rounded-lg border border-taupe/15 bg-white p-3 text-sm">
              <span className="font-medium text-charcoal">{l.name}</span>
              <span className="text-charcoal/60"> — {l.use}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-charcoal/50">원본 파일: assets/brand/ (SVG 권장)</p>
      </section>

      <section>
        <h3 className="mb-2 font-serif text-xl text-taupe-deep">공통 푸터</h3>
        <pre className="whitespace-pre-wrap rounded-lg border border-taupe/15 bg-white p-4 text-xs text-charcoal/80">
          {FOOTER}
        </pre>
      </section>
    </div>
  );
}

export function ChannelsPanel() {
  return (
    <div className="space-y-3">
      <h3 className="font-serif text-xl text-taupe-deep">채널 · 계정 허브</h3>
      <div className="grid gap-2">
        {CHANNELS.map((c) => (
          <div
            key={c.name}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-taupe/15 bg-white p-3"
          >
            <div>
              <div className="font-medium text-charcoal">{c.name}</div>
              <div className="text-sm text-charcoal/60">{c.handle}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-taupe/10 px-3 py-1 text-xs text-taupe-deep">{c.status}</span>
              {c.url && (
                <a
                  href={c.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-taupe underline hover:text-taupe-deep"
                >
                  바로가기 ↗
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const CADENCE = [
  { when: "전월 하순", what: "익월 이벤트 기획 → POP/영상/웹배너 1차안 → 원내 검수 → 확정" },
  { when: "매월 1일", what: "인스타 + 카카오 + 메타광고 동시 런칭, 홈페이지 배너/팝업 교체" },
  { when: "매월 중순", what: "전월 마케팅 리포트(PDF) + 익월 콘텐츠 일정표 전달" },
  { when: "주 2~3회", what: "인스타 게시물 (월/수/금) — 전일 검수요청 → 익일 발행 → URL 회신" },
  { when: "주간~격주", what: "플친 메시지 — 전일 테스트발송 → 검수 → 익일 오전 11시 예약발송" },
];

export function CalendarPanel() {
  return (
    <div className="space-y-3">
      <h3 className="font-serif text-xl text-taupe-deep">운영 캘린더 · 발행 주기</h3>
      <div className="overflow-hidden rounded-lg border border-taupe/15 bg-white">
        {CADENCE.map((c, i) => (
          <div key={i} className="flex gap-4 border-b border-taupe/10 p-3 last:border-0">
            <div className="w-28 shrink-0 font-medium text-taupe-deep">{c.when}</div>
            <div className="text-sm text-charcoal/80">{c.what}</div>
          </div>
        ))}
      </div>
      <p className="text-xs text-charcoal/50">
        모든 발행물 공통 루프: 제작 → 단톡방 사전공유 → 원장/실장 검수 → 확정 → 발행 → URL 회신
      </p>
    </div>
  );
}

const HANDOVER = [
  "인스타그램 — 비밀번호 재설정·2단계 백업코드 재발급, 대행사 기기 로그아웃",
  "카카오톡 채널 — 라랩 관리자 권한 회수, 신규 관리자 등록",
  "메타 비즈니스 — 파트너 권한 회수 (자산은 병원 명의라 이전 불필요)",
  "홈페이지/기획전 빌더 — 관리자 접속 계정 확보",
  "네이버 스마트플레이스 / 링크트리(리틀리) 권한 확인",
  "디자인 원본·과거 콘텐츠·리포트·이벤트 기획안 아카이브 인계",
  "외주 네이버 블로그 2개 — 내부전환 vs 외주유지 결정",
];

export function ChecklistPanel() {
  return (
    <div className="space-y-3">
      <h3 className="font-serif text-xl text-taupe-deep">인수인계 체크리스트</h3>
      <p className="text-sm text-charcoal/60">라이브러리랩 계약 종료(2026년 8월 예정) 대비</p>
      <ul className="space-y-2 rounded-lg border border-taupe/15 bg-white p-4 text-sm">
        {HANDOVER.map((h, i) => (
          <li key={i} className="flex items-start gap-2">
            <input type="checkbox" className="mt-1 accent-taupe" />
            <span>{h}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
