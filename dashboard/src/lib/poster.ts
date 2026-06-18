import type { EventGroup, EventItem } from "./types";

export interface Sticker {
  id: string;
  char: string; // 글리프/이모지 또는 텍스트 배지
  x: number; // 가로 위치 % (0~100)
  y: number; // 세로 위치 %
  size: number; // em 단위 크기
  rot: number; // 회전(도)
  badge?: boolean; // 텍스트 배지(둥근 알약) 스타일
}

export const manwon = (v: number | null): string => {
  if (v == null) return "";
  const n = v / 10000;
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, "");
};

// 소비자 노출가 = 이벤트가(부가세 전, D열). 정상가 = C열.
export const eventPrice = (it: EventItem) => it.event ?? it.eventVat;
export const normalPrice = (it: EventItem) => it.normal;

export const validItems = (g: EventGroup): EventItem[] =>
  g.items.filter((it) => eventPrice(it) != null && it.name && it.name !== "`");
