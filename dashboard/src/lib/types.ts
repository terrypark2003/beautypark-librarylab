export interface EventItem {
  name: string;
  normal: number | null; // 정상가 (부가세 전, C열)
  event: number | null; // 이벤트가 (부가세 전, D열)
  eventVat: number | null; // 이벤트가 부가세 포함 (E열) = 소비자 최종가
  featured: boolean; // 요청서 볼드 = 강조 상품
}

export interface EventGroup {
  group: string;
  items: EventItem[];
}

export interface RequestData {
  title: string;
  sheet: string;
  emphasis: string | null;
  deliverables: { wide: string; list: string; instagram: string };
  groups: EventGroup[];
}
