// dashboard/src/backgrounds/<themeKey>.{jpg,png,...} 를 테마별 배경으로 자동 매핑.
// 파일이 없으면 해당 테마는 CSS 그라데이션으로 폴백.
const mods = import.meta.glob("../backgrounds/*.{jpg,jpeg,png,webp}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const map: Record<string, string> = {};
for (const [path, url] of Object.entries(mods)) {
  const base = path.split("/").pop()!.replace(/\.[^.]+$/, "").toLowerCase();
  map[base] = url;
}

export const themeBg = (key: string): string | undefined => map[key];
export const hasAnyBg = Object.keys(map).length > 0;
