// dashboard/src/assets 의 실제 로고 세트에서 용도별로 선택.
const mods = import.meta.glob("../assets/*.{png,svg,webp,jpg,jpeg}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const byName: Record<string, string> = {};
for (const [path, url] of Object.entries(mods)) {
  byName[path.split("/").pop()!.toLowerCase()] = url;
}
const pick = (...subs: string[]): string | undefined => {
  for (const s of subs) {
    const hit = Object.keys(byName).find((n) => n.includes(s.toLowerCase()));
    if (hit) return byName[hit];
  }
  return undefined;
};

// 포스터 좌상단(밝은 배경): 가로 락업 토프 버전(범어점)
export const logoUrl = pick(
  "horizontal@300x (beautypark beomeo)",
  "horizontal (just beauty park clinic)",
  "bplogo"
);
// 사진/어두운 배경용 흰색 버전
export const logoWhiteUrl = pick(
  "horizontal@300x transparent (beautypark beomeo)",
  "white",
  "화이트"
);
// 심볼(필요 시)
export const symbolUrl = pick("symbol@300x", "symbol");
