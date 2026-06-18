// dashboard/src/assets/logo.* (메인), logo-white.* (사진/어두운 배경용) 를 자동 사용.
// 파일이 없으면 워드마크(텍스트)로 폴백.
const mods = import.meta.glob("../assets/logo*.{png,svg,webp,jpg,jpeg}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

let main: string | undefined;
let white: string | undefined;
for (const [path, url] of Object.entries(mods)) {
  const base = path.split("/").pop()!.toLowerCase();
  if (base.includes("white") || base.includes("화이트")) white = url;
  else main = url;
}

export const logoUrl = main;
export const logoWhiteUrl = white;
