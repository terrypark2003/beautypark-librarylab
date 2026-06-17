import type { EventGroup, EventItem } from "./types";

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
