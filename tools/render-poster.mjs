// 디자인 작업 요청서(파싱 JSON) → 이벤트 포스터 PNG 렌더러 (PoC)
// 사용: node tools/render-poster.mjs <june.json> <groupIndex> <theme> <out.png>
import { chromium } from "playwright";
import { readFileSync } from "fs";

const [, , jsonPath, groupIdxStr, theme = "summer", out = "/tmp/poster.png"] = process.argv;
const data = JSON.parse(readFileSync(jsonPath, "utf8"));
const group = data.event_groups[Number(groupIdxStr)];
const items = group.items.filter((it) => it["이벤트가"] != null && it.name && it.name !== "`");

const manwon = (v) => {
  const n = v / 10000;
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, "");
};

const THEMES = {
  // 월초 매거진 (수국/하늘 → 크림)
  summer: {
    bg: "linear-gradient(180deg,#1E7FD6 0%,#4FA3E3 28%,#A9D0E6 44%,#F2DEBC 52%,#ECD5B0 100%)",
    title1Color: "#ffffff",
    title2Color: "#FFE23D",
    nameColor: "#2A2A2A",
    nowColor: "#1B6FE0",
    footColor: "#3a352f",
    titleShadow: "0 3px 14px rgba(0,60,120,.25)",
  },
  // 카톡 친구 전용 (버블/물방울)
  cool: {
    bg: "linear-gradient(180deg,#BFE6F7 0%,#CFEAF8 35%,#Dff2fb 60%,#EAF7FC 100%)",
    title1Color: "#5566B5",
    title2Color: "#6E86E0",
    nameColor: "#2A2A2A",
    nowColor: "#E23B3B",
    footColor: "#3a352f",
    titleShadow: "0 3px 12px rgba(90,120,200,.25)",
  },
};

function headlineFor(group, theme) {
  if (theme === "cool")
    return { sup: "뷰티파크의원 범어점 카톡 플러스", l1: "친구 전용", l2: "이벤트", badge: "1인 1회" };
  if (theme === "summer")
    return { sup: "", l1: "초여름의 온도, 싱그러운", l2: "6월의 뷰티파크", badge: "" };
  return { sup: "", l1: group.group, l2: "", badge: "" };
}

const t = THEMES[theme];
const h = headlineFor(group, theme);

const rowsHtml = items
  .map(
    (it) => `
  <div class="row">
    <div class="name">${it.name.replace(/</g, "&lt;")}</div>
    <div class="price">
      <span class="was">${manwon(it["정상가"])}만원</span>
      <span class="now">${manwon(it["이벤트가"])}<span class="unit">만원</span></span>
    </div>
  </div>`
  )
  .join("");

const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Pretendard','Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic',sans-serif}
.poster{width:1080px;height:1527px;position:relative;overflow:hidden;background:${t.bg};padding:64px 60px}
.logo{display:flex;align-items:center;gap:12px;color:${theme === "summer" ? "#ffffff" : "#6E6253"};opacity:.95}
.logo .mark{font-family:Georgia,serif;font-weight:700;font-size:34px;border:2px solid currentColor;border-radius:50%;width:54px;height:64px;display:flex;align-items:center;justify-content:center}
.logo .wm{font-family:Georgia,serif;letter-spacing:3px;font-size:30px;font-weight:600;line-height:1}
.logo .sub{font-size:15px;letter-spacing:6px;margin-top:4px}
.head{margin-top:40px;text-align:left}
.sup{font-size:30px;font-weight:700;color:${t.title1Color};opacity:.92;margin-bottom:10px}
.badge{display:inline-block;background:rgba(255,255,255,.55);color:#444;font-weight:800;font-size:30px;padding:8px 22px;border-radius:30px;margin-bottom:14px}
.title{font-weight:900;line-height:1.08;text-shadow:${t.titleShadow}}
.title .l1{font-size:58px;color:${t.title1Color}}
.title .l2{font-size:82px;color:${t.title2Color};display:block;margin-top:6px}
.rows{position:absolute;left:60px;right:60px;top:440px;bottom:150px;display:flex;flex-direction:column;justify-content:space-between}
.row{background:rgba(255,255,255,.96);border-radius:24px;padding:34px 40px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 8px 24px rgba(0,0,0,.06)}
.name{font-size:34px;font-weight:700;color:${t.nameColor};max-width:62%;line-height:1.3}
.price{display:flex;align-items:baseline;gap:20px;white-space:nowrap}
.was{font-size:28px;color:#aaa;text-decoration:line-through}
.now{font-size:74px;font-weight:900;color:${t.nowColor}}
.unit{font-size:34px;font-weight:800;margin-left:2px}
.foot{position:absolute;left:0;right:0;bottom:64px;text-align:center;font-size:28px;font-weight:700;color:${t.footColor}}
</style></head><body>
<div class="poster">
  <div class="logo"><div class="mark">B</div><div><div class="wm">BEAUTY PARK</div><div class="sub">뷰티파크의원 범어점</div></div></div>
  <div class="head">
    ${h.sup ? `<div class="sup">${h.sup}</div>` : ""}
    ${h.badge ? `<div class="badge">${h.badge}</div>` : ""}
    <div class="title"><span class="l1">${h.l1}</span>${h.l2 ? `<span class="l2">${h.l2}</span>` : ""}</div>
  </div>
  <div class="rows">${rowsHtml}</div>
  <div class="foot">부가세 10% 별도 &nbsp;·&nbsp; 현금 / 카드 동일</div>
</div></body></html>`;

const browser = await chromium.launch({
  executablePath:
    process.env.PW_CHROME || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox", "--disable-gpu"],
});
const page = await browser.newPage({ viewport: { width: 1080, height: 1527 }, deviceScaleFactor: 2 });
await page.setContent(html, { waitUntil: "networkidle" });
await page.locator(".poster").screenshot({ path: out });
await browser.close();
console.log("rendered", out, "| items:", items.length, "| group:", group.group.replace(/\n/g, " "));
