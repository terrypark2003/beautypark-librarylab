// woff2 파일을 base64 @font-face CSS로 임베드 (CDN/구글폰트 의존 제거 → 렌더 환경에서 100% 동작)
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const NM = join(dirname(fileURLToPath(import.meta.url)), "..", "node_modules");
const b64 = (p) => readFileSync(p).toString("base64");
const face = (family, weight, file, style = "normal") =>
  `@font-face{font-family:'${family}';font-style:${style};font-weight:${weight};font-display:block;src:url(data:font/woff2;base64,${b64(file)}) format('woff2');}`;

export function fontCss() {
  const pf = join(NM, "@fontsource/playfair-display/files");
  const cg = join(NM, "@fontsource/cormorant-garamond/files");
  const pin = join(NM, "@fontsource/pinyon-script/files");
  const preV = join(NM, "pretendard/dist/web/variable/woff2/PretendardVariable.woff2");
  return [
    face("Pretendard", "45 920", preV),
    face("Playfair Display", 700, join(pf, "playfair-display-latin-700-normal.woff2")),
    face("Playfair Display", 900, join(pf, "playfair-display-latin-900-normal.woff2")),
    face("Cormorant Garamond", 600, join(cg, "cormorant-garamond-latin-600-normal.woff2")),
    face("Pinyon Script", 400, join(pin, "pinyon-script-latin-400-normal.woff2")),
  ].join("\n");
}
