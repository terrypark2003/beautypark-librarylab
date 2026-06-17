import { useMemo, useRef, useState } from "react";
import type { Workbook } from "exceljs";
import type { RequestData } from "../lib/types";
import { sampleData } from "../lib/sample";
import { loadWorkbook, parseSheet } from "../lib/parseRequest";
import {
  buildDeck,
  cardToText,
  postToText,
  formatWon,
  type DeckCard,
  type InstaPost,
} from "../lib/generateDeck";
import { CopyButton } from "./CopyButton";

const COMPLIANCE = [
  "시술명·성분·횟수 엑셀과 1:1 일치 (파서 추출 → 전사오류 0)",
  "가격/VAT 표기 방식 원내 확정 (현재 VAT 포함가 = 최종가)",
  "금지 표현(최상급·효과보장·과장 전후사진) 점검",
  "의료광고 심의 대상 여부 확인",
  "'베러미' 잔재 표현·구 로고 미사용",
  "발행 루프: 단톡방 사전공유 → 원장/실장 검수 → 발행 → URL 회신",
];

function PriceTable({ card }: { card: DeckCard }) {
  if (!card.rows.length)
    return card.note ? <p className="text-sm text-charcoal/70">{card.note}</p> : null;
  return (
    <table className="w-full text-sm">
      <tbody>
        {card.rows.map((r, i) => (
          <tr key={i} className="border-b border-taupe/10 last:border-0">
            <td className="py-1.5 pr-3">
              {r.featured && <span className="mr-1 text-taupe">★</span>}
              {r.name}
            </td>
            <td className="whitespace-nowrap py-1.5 text-right">
              {r.was != null && (
                <span className="mr-2 text-charcoal/40 line-through">{formatWon(r.was)}</span>
              )}
              <span className="font-semibold text-taupe-deep">{formatWon(r.now)}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CardBlock({ card }: { card: DeckCard }) {
  return (
    <div className="rounded-lg border border-taupe/15 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="font-semibold text-charcoal">{card.heading}</h4>
        <CopyButton text={cardToText(card)} />
      </div>
      {card.note && card.rows.length > 0 && (
        <p className="mb-2 text-xs text-charcoal/60">{card.note}</p>
      )}
      <PriceTable card={card} />
    </div>
  );
}

function InstaCard({ post, footer }: { post: InstaPost; footer: string }) {
  return (
    <div className="rounded-lg border border-taupe/15 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="font-semibold text-charcoal">📷 {post.title}</h4>
        <CopyButton text={postToText(post, footer)} label="게시물 복사" />
      </div>
      <ol className="list-decimal space-y-1 pl-5 text-sm">
        <li className="font-medium text-taupe-deep">표지: {post.cover}</li>
        {post.slides.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
        <li className="text-charcoal/60">마감 안내 + 공통 푸터 + 해시태그</li>
      </ol>
      <p className="mt-2 text-xs text-taupe">{post.hashtags}</p>
    </div>
  );
}

function Section({ title, spec, children }: { title: string; spec: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline gap-2">
        <h3 className="font-serif text-xl text-taupe-deep">{title}</h3>
        <span className="text-xs text-charcoal/50">{spec}</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">{children}</div>
    </section>
  );
}

export default function EventHub() {
  const [data, setData] = useState<RequestData>(() => sampleData());
  const [source, setSource] = useState("샘플 · 2026.7 (assets/event-requests)");
  const [wb, setWb] = useState<Workbook | null>(null);
  const [monthSheets, setMonthSheets] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const deck = useMemo(() => buildDeck(data), [data]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const buf = await file.arrayBuffer();
      const { wb, monthSheets } = await loadWorkbook(buf);
      const target = monthSheets[0] ?? wb.worksheets[0]?.name;
      setWb(wb);
      setMonthSheets(monthSheets);
      setData(parseSheet(wb, target));
      setSource(`${file.name} · ${target}`);
    } catch (err) {
      setError(`엑셀을 읽지 못했습니다: ${(err as Error).message}`);
    }
  }

  function onSheet(e: React.ChangeEvent<HTMLSelectElement>) {
    if (!wb) return;
    setData(parseSheet(wb, e.target.value));
    setSource(`${source.split(" · ")[0]} · ${e.target.value}`);
  }

  return (
    <div className="space-y-8">
      {/* 업로드 + 소스 */}
      <div className="rounded-xl border border-taupe/20 bg-ivory p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl text-charcoal">{data.title}</h2>
            <p className="text-sm text-charcoal/60">입력 소스: {source}</p>
          </div>
          <div className="flex items-center gap-2">
            {monthSheets.length > 1 && (
              <select
                onChange={onSheet}
                defaultValue={data.sheet}
                className="rounded-md border border-taupe/40 bg-white px-2 py-1.5 text-sm"
              >
                {monthSheets.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx"
              onChange={onFile}
              className="hidden"
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="rounded-md bg-taupe px-4 py-2 text-sm font-semibold text-white transition hover:bg-taupe-deep"
            >
              디자인 작업 요청서(.xlsx) 업로드
            </button>
          </div>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-white px-3 py-1 text-taupe-deep">{data.deliverables.wide}</span>
          <span className="rounded-full bg-white px-3 py-1 text-taupe-deep">{data.deliverables.list}</span>
          <span className="rounded-full bg-white px-3 py-1 text-taupe-deep">{data.deliverables.instagram}</span>
          <span className="rounded-full bg-taupe/10 px-3 py-1">이벤트 그룹 {data.groups.length}개</span>
        </div>
      </div>

      {/* 월 테마 */}
      <div className="rounded-xl border border-taupe/15 bg-white p-5">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-serif text-xl text-taupe-deep">월 테마 · 강조</h3>
          <CopyButton
            text={`월초 강조: ${deck.theme.wolcho}\n월 중순 강조: ${deck.theme.wooljungsun}`}
          />
        </div>
        <p className="text-sm">
          <span className="font-medium text-taupe">월초</span> {deck.theme.wolcho}
        </p>
        <p className="text-sm">
          <span className="font-medium text-taupe">월 중순</span> {deck.theme.wooljungsun}
        </p>
        {!data.emphasis && (
          <p className="mt-1 text-xs text-amber-700">⚠️ 요청서에 강조 문구가 비어 제안값입니다 — 검수 필요</p>
        )}
      </div>

      <Section title="플친 와이드 — 캐러셀 3컷" spec={data.deliverables.wide}>
        {deck.wide.map((c, i) => (
          <CardBlock key={i} card={c} />
        ))}
      </Section>

      <Section title="플친 리스트 — 그룹별 컷" spec={data.deliverables.list}>
        {deck.list.map((c, i) => (
          <CardBlock key={i} card={c} />
        ))}
      </Section>

      <Section title="인스타 게시물 2개" spec={data.deliverables.instagram}>
        {deck.instagram.map((p, i) => (
          <InstaCard key={i} post={p} footer={deck.footer} />
        ))}
      </Section>

      {/* 공통 푸터/해시태그 */}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-taupe/15 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="font-semibold text-charcoal">공통 푸터</h4>
            <CopyButton text={deck.footer} />
          </div>
          <pre className="whitespace-pre-wrap text-xs text-charcoal/80">{deck.footer}</pre>
        </div>
        <div className="rounded-lg border border-taupe/15 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="font-semibold text-charcoal">공통 해시태그</h4>
            <CopyButton text={deck.hashtags} />
          </div>
          <p className="text-xs text-taupe">{deck.hashtags}</p>
        </div>
      </div>

      {/* 컴플라이언스 */}
      <div className="rounded-xl border border-amber-300/60 bg-amber-50/60 p-5">
        <h3 className="mb-3 font-serif text-xl text-taupe-deep">발행 전 컴플라이언스 체크</h3>
        <ul className="space-y-2 text-sm">
          {COMPLIANCE.map((c, i) => (
            <li key={i} className="flex items-start gap-2">
              <input type="checkbox" className="mt-1 accent-taupe" />
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
