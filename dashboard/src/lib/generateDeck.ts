import type { RequestData, EventGroup, EventItem } from "./types";
import { FOOTER, HASHTAGS } from "./brand";

export interface PriceRow {
  name: string;
  was: number | null; // 정상가 VAT 환산
  now: number | null; // 이벤트가 VAT 포함(최종가)
  featured: boolean;
}
export interface DeckCard {
  heading: string;
  note?: string;
  rows: PriceRow[];
}
export interface InstaPost {
  title: string;
  cover: string;
  slides: string[];
  hashtags: string;
}
export interface Deck {
  theme: { wolcho: string; wooljungsun: string };
  wide: DeckCard[];
  list: DeckCard[];
  instagram: InstaPost[];
  footer: string;
  hashtags: string;
}

export function formatWon(n: number | null): string {
  return n == null ? "—" : `${n.toLocaleString("ko-KR")}원`;
}

const vatNormal = (it: EventItem): number | null =>
  it.normal != null ? Math.round(it.normal * 1.1) : null;
const priceNow = (it: EventItem): number | null =>
  it.eventVat ?? (it.event != null ? Math.round(it.event * 1.1) : null);

const toRow = (it: EventItem): PriceRow => ({
  name: it.name,
  was: vatNormal(it),
  now: priceNow(it),
  featured: it.featured,
});

function parseEmphasis(emphasis: string | null): { wolcho: string; wooljungsun: string } {
  const def = {
    wolcho: "한여름의 시작, 바캉스 전 정비는 뷰티파크",
    wooljungsun: "휴가 직전 막판 케어 · 이달의 혜택 마감 임박",
  };
  if (!emphasis) return def;
  const lines = emphasis.split(/\n/).map((l) => l.trim());
  const pick = (kw: string) => {
    const l = lines.find((x) => x.includes(kw));
    if (!l) return "";
    const after = l.split(":").slice(1).join(":").trim();
    return after;
  };
  const wolcho = pick("월초") || pick("월 초");
  const wooljungsun = pick("월 중순") || pick("월중순");
  return {
    wolcho: wolcho || def.wolcho,
    wooljungsun: wooljungsun || def.wooljungsun,
  };
}

function highlights(groups: EventGroup[]): PriceRow[] {
  const all = groups.flatMap((g) => g.items);
  const featured = all.filter((it) => it.featured);
  if (featured.length >= 3) return featured.slice(0, 3).map(toRow);
  // 강조 미표시 → 그룹별 최저 이벤트가 1개를 대표로, 가격 낮은 순 3개
  const reps = groups
    .map((g) =>
      [...g.items].sort((a, b) => (priceNow(a) ?? 9e9) - (priceNow(b) ?? 9e9))[0]
    )
    .filter(Boolean) as EventItem[];
  const merged = [...featured, ...reps.filter((r) => !featured.includes(r))];
  return merged
    .sort((a, b) => (priceNow(a) ?? 9e9) - (priceNow(b) ?? 9e9))
    .slice(0, 3)
    .map(toRow);
}

export function buildDeck(data: RequestData): Deck {
  const theme = parseEmphasis(data.emphasis);

  const wide: DeckCard[] = [
    { heading: data.groups[0]?.group ?? data.title, note: "표지", rows: [] },
    { heading: "대표 혜택", rows: highlights(data.groups) },
    { heading: "마감 · 문의 (CTA)", note: "카카오톡 채널 추가하고 플친 전용가 받기", rows: [] },
  ];

  const list: DeckCard[] = data.groups.map((g) => ({
    heading: g.group,
    rows: g.items.map(toRow),
  }));

  const instagram: InstaPost[] = data.groups.slice(0, 2).map((g, i) => ({
    title: g.group,
    cover: i === 0 ? `${g.group}` : `${g.group}`,
    slides: g.items.map(
      (it) => `${it.name} — ${formatWon(priceNow(it))}`
    ),
    hashtags: HASHTAGS,
  }));

  return { theme, wide, list, instagram, footer: FOOTER, hashtags: HASHTAGS };
}

// ---- 복사용 텍스트 직렬화 ----
export function cardToText(card: DeckCard): string {
  const lines = [`[${card.heading}]`];
  if (card.note) lines.push(card.note);
  for (const r of card.rows) {
    const price = r.was != null ? `${formatWon(r.was)} → ${formatWon(r.now)}` : formatWon(r.now);
    lines.push(`${r.featured ? "★ " : ""}${r.name} : ${price}`);
  }
  return lines.join("\n");
}

export function postToText(post: InstaPost, footer: string): string {
  return [post.title, "", ...post.slides, "", footer, "", post.hashtags].join("\n");
}
