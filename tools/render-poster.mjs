// 디자인 작업 요청서(파싱 JSON) → 고급 이벤트 포스터 PNG 렌더러
// 사용: node tools/render-poster.mjs <june.json> <groupIndex> <theme> <out.png>
import { chromium } from "playwright";
import { readFileSync } from "fs";
import { fontCss } from "./lib/fonts.mjs";

const [, , jsonPath, groupIdxStr, theme = "summer", out = "/tmp/poster.png"] = process.argv;
const data = JSON.parse(readFileSync(jsonPath, "utf8"));
const group = data.event_groups[Number(groupIdxStr)];
const items = group.items.filter((it) => it["이벤트가"] != null && it.name && it.name !== "`");

const manwon = (v) => {
  const n = v / 10000;
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, "");
};
const esc = (s) => s.replace(/</g, "&lt;").replace(/\n/g, " ");

const THEMES = {
  summer: {
    bg: "linear-gradient(157deg,#FAF6EF 0%,#F3EADB 52%,# EADCC6 100%)".replace("# E", "#E"),
    blob: "radial-gradient(60% 45% at 80% 8%, rgba(150,192,228,.5), transparent 70%)",
    ink: "#3A352F", accent: "#8C7E6E", accentDeep: "#6E6253",
    script: "#C0895F", scriptText: "Early Summer",
    panel: "rgba(255,255,255,.97)", divider: "#EFE7DA", was: "#BBB1A2",
    head: { l1: "초여름의 온도, 싱그러운", l2: "6월의 뷰티파크" },
  },
  cool: {
    bg: "linear-gradient(160deg,#EFF6FC 0%,#DEEDF8 55%,#CFE6F6 100%)",
    blob: "radial-gradient(55% 40% at 82% 6%, rgba(255,255,255,.7), transparent 65%)",
    ink: "#27384F", accent: "#4470AE", accentDeep: "#2B5390",
    script: "#5E86C8", scriptText: "Friends Only",
    panel: "rgba(255,255,255,.98)", divider: "#E5EEF6", was: "#A9B6C4",
    badge: "1인 1회",
    head: { sup: "뷰티파크의원 범어점 카톡 플러스", l1: "친구 전용 이벤트" },
  },
};
const t = THEMES[theme] || THEMES.summer;
const h = t.head;

const SPK = (cls) =>
  `<svg class="${cls}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 0c.9 7 4 10.1 12 12-8 1.9-11.1 5-12 12-.9-7-4-10.1-12-12 8-1.9 11.1-5 12-12Z"/></svg>`;

const rows = items
  .map(
    (it) => `<div class="row">
      <div class="name">${esc(it.name)}</div>
      <div class="price">
        <span class="was">${manwon(it["정상가"])}만원</span>
        <span class="now">${manwon(it["이벤트가"])}<span class="unit">만원</span></span>
      </div>
    </div>`
  )
  .join("");

const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>
${fontCss()}
*{box-sizing:border-box;margin:0;padding:0}
.poster{position:relative;width:1080px;height:1527px;overflow:hidden;background:${t.bg};
  font-family:'Pretendard',sans-serif;color:${t.ink};padding:72px 66px}
.blob{position:absolute;inset:0;background:${t.blob};pointer-events:none}
.dots{position:absolute;inset:0;background-image:radial-gradient(${t.accent}22 1.2px,transparent 1.2px);
  background-size:26px 26px;opacity:.5;pointer-events:none;mask-image:linear-gradient(180deg,#000,transparent 40%)}
.spk{position:absolute;width:74px;height:74px;fill:${t.accent};opacity:.5}
.spk.s1{top:300px;right:120px;width:54px;height:54px;opacity:.45}
.spk.s2{top:420px;right:300px;width:30px;height:30px;opacity:.35}
.spk.s3{top:250px;right:430px;width:20px;height:20px;opacity:.3}
.en{font-family:'Playfair Display',serif}
.top{position:relative;display:flex;justify-content:space-between;align-items:flex-start}
.logo{display:flex;align-items:center;gap:14px}
.logo .mark{width:54px;height:64px;border:2px solid ${t.accent};border-radius:50%;
  display:flex;align-items:center;justify-content:center;font-family:'Playfair Display',serif;
  font-weight:700;font-size:34px;color:${t.accentDeep}}
.logo .wm{font-family:'Playfair Display',serif;font-weight:700;font-size:30px;letter-spacing:5px;
  color:${t.accentDeep};line-height:1}
.logo .sub{font-size:15px;letter-spacing:7px;color:${t.accent};margin-top:5px}
.branch{text-align:right;font-size:19px;letter-spacing:2px;color:${t.accent};font-weight:600;padding-top:8px}
.branch b{display:block;font-size:15px;letter-spacing:4px;color:${t.ink};opacity:.5;font-weight:500;margin-top:4px}
.head{position:relative;margin-top:70px}
.script{font-family:'Pinyon Script',cursive;font-size:78px;color:${t.script};line-height:.8;margin-bottom:14px}
.sup{font-size:26px;font-weight:600;color:${t.accent};letter-spacing:1px;margin-bottom:12px}
.badge{display:inline-block;background:${t.accentDeep};color:#fff;font-weight:800;font-size:25px;
  letter-spacing:2px;padding:9px 26px;border-radius:30px;margin-bottom:16px}
.title{font-weight:800;font-size:74px;line-height:1.14;letter-spacing:-1px}
.title .l2{display:block;color:${t.accentDeep}}
.panel{position:absolute;left:66px;right:66px;top:600px;bottom:168px;background:${t.panel};
  border-radius:34px;box-shadow:0 24px 60px rgba(80,66,48,.13);display:flex;flex-direction:column;
  padding:14px 0;backdrop-filter:saturate(1.05)}
.row{flex:1;display:flex;align-items:center;justify-content:space-between;padding:0 50px;
  border-bottom:1px solid ${t.divider}}
.row:last-child{border-bottom:0}
.name{font-size:32px;font-weight:600;line-height:1.32;max-width:60%;letter-spacing:-.4px}
.price{display:flex;align-items:baseline;gap:22px;white-space:nowrap}
.was{font-size:25px;color:${t.was};text-decoration:line-through;font-weight:500}
.now{font-family:'Playfair Display',serif;font-weight:900;font-size:72px;color:${t.accentDeep};line-height:1}
.unit{font-family:'Pretendard';font-size:30px;font-weight:800;margin-left:3px}
.foot{position:absolute;left:0;right:0;bottom:74px;text-align:center;font-size:27px;font-weight:600;color:${t.accent}}
.vat{position:absolute;right:70px;bottom:64px;border:1.5px solid ${t.accent}66;color:${t.accent};
  font-size:20px;font-weight:700;padding:6px 16px;border-radius:10px}
</style></head><body>
<div class="poster">
  <div class="blob"></div><div class="dots"></div>
  ${SPK("spk s1")}${SPK("spk s2")}${SPK("spk s3")}
  <div class="top">
    <div class="logo"><div class="mark">B</div><div><div class="wm">BEAUTY PARK</div><div class="sub">뷰티파크의원 범어점</div></div></div>
    <div class="branch">EVENT · ${data.sheet}<b>BEOMEO</b></div>
  </div>
  <div class="head">
    ${t.scriptText ? `<div class="script en">${t.scriptText}</div>` : ""}
    ${h.sup ? `<div class="sup">${h.sup}</div>` : ""}
    ${t.badge ? `<div class="badge">${t.badge}</div>` : ""}
    <div class="title">${h.l1}${h.l2 ? `<span class="l2">${h.l2}</span>` : ""}</div>
  </div>
  <div class="panel">${rows}</div>
  <div class="foot">부가세 10% 별도 &nbsp;·&nbsp; 현금 / 카드 동일</div>
  <div class="vat">VAT 별도</div>
</div></body></html>`;

const browser = await chromium.launch({
  executablePath: process.env.PW_CHROME || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--disable-gpu"],
});
const page = await browser.newPage({ viewport: { width: 1080, height: 1527 }, deviceScaleFactor: 2 });
await page.setContent(html, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.locator(".poster").screenshot({ path: out });
await browser.close();
console.log("rendered", out, "| items:", items.length, "| theme:", theme);
