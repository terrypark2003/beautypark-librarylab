import { forwardRef } from "react";
import type { EventGroup } from "../lib/types";
import { THEMES } from "../lib/themes";
import { manwon, eventPrice, normalPrice, validItems, type Sticker } from "../lib/poster";
import { STICKER_SVGS } from "../lib/stickerAssets";
import { logoUrl, logoWhiteUrl } from "../lib/logo";

const Spark = ({ cls }: { cls: string }) => (
  <svg className={`spk ${cls}`} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 0c.9 7 4 10.1 12 12-8 1.9-11.1 5-12 12-.9-7-4-10.1-12-12 8-1.9 11.1-5 12-12Z" />
  </svg>
);

interface Props {
  group: EventGroup;
  themeKey: string;
  sheet: string;
  bgUrl?: string | null; // 업로드 배경
  photoBg?: string | null; // 테마 배경
  hideTitle?: boolean; // 배경에 타이틀이 이미 포함된 경우 앱 타이틀/로고 숨김
  width?: number;
  height?: number;
  logoScale?: number; // 로고 크기 배율
  panelTop?: number; // 패널 상단 여백(em)
  panelBottom?: number; // 패널 하단 여백(em)
  panelWidth?: number; // 패널 좌우 너비(%)
  panelAlign?: "left" | "center" | "right"; // 패널 가로 정렬
  scriptOverride?: string; // 영문 태그(스크립트) 직접 지정. undefined면 테마 기본값
  variant?: string; // 레이아웃 변형: classic|center|band|editorial|minimal
  showHeader?: boolean; // 패널 상단 기간/대상 바
  headerPeriod?: string;
  headerTarget?: string;
  showDiscount?: boolean; // 할인율 % 배지
  panelDx?: number; // 패널 가로 이동(px, 마우스 드래그)
  panelDy?: number; // 패널 세로 이동(px)
  stickers?: Sticker[]; // 장식 스티커
}

const ALIGN: Record<string, string> = { left: "flex-start", center: "center", right: "flex-end" };

// 긴 시술명은 글자를 줄여 어색한 줄바꿈 방지
function nameScale(name: string): number {
  const L = name.length;
  if (L <= 22) return 1;
  if (L <= 30) return 0.9;
  if (L <= 40) return 0.82;
  if (L <= 52) return 0.74;
  return 0.66;
}

export const Poster = forwardRef<HTMLDivElement, Props>(
  ({ group, themeKey, sheet, bgUrl, photoBg, hideTitle = false, width = 1080, height = 1527, logoScale = 1, panelTop = 0, panelBottom = 0, panelWidth = 100, panelAlign = "center", scriptOverride, variant = "classic", showHeader = false, headerPeriod = "", headerTarget = "", showDiscount = false, panelDx = 0, panelDy = 0, stickers = [] }, ref) => {
    const theme = THEMES[themeKey] || THEMES.summer;
    const t = theme.tokens;
    const h = theme.headline(group);
    const items = validItems(group);

    const photo = bgUrl || photoBg || null;
    const showTitle = !hideTitle;
    const land = width > height;

    const styleVars = {
      ["--w" as any]: width,
      ["--h" as any]: height,
      ["--logo-scale" as any]: logoScale,
      ["--panel-top" as any]: panelTop,
      ["--panel-bottom" as any]: panelBottom,
      ["--panel-width" as any]: panelWidth,
      ["--panel-align" as any]: ALIGN[panelAlign] || "center",
      ["--bg" as any]: t.bg,
      ["--blob" as any]: t.blob,
      ["--ink" as any]: t.ink,
      ["--accent" as any]: t.accent,
      ["--accent-deep" as any]: t.accentDeep,
      ["--script" as any]: t.script,
      ["--panel" as any]: t.panel,
      ["--divider" as any]: t.divider,
      ["--was" as any]: t.was,
    };

    return (
      <div ref={ref} className={`poster v-${variant}${photo ? " has-photo" : ""}${land ? " land" : ""}`} style={styleVars}>
        {photo ? (
          <div className="photo" style={{ backgroundImage: `url(${photo})` }} />
        ) : (
          <>
            <div className="blob" />
            <div className="dots" />
          </>
        )}
        {photo && showTitle && <div className="scrim" />}

        {showTitle && (
          <>
            <Spark cls="s1" />
            <Spark cls="s2" />
            <Spark cls="s3" />
            <div className="top">
              {logoUrl ? (
                <img className="logo-img" src={photo && logoWhiteUrl ? logoWhiteUrl : logoUrl} alt="BEAUTY PARK 뷰티파크의원 범어점" />
              ) : (
                <div className="logo">
                  <div>
                    <div className="wm">BEAUTY PARK</div>
                    <div className="sub">뷰티파크의원 범어점</div>
                  </div>
                </div>
              )}
              <div className="branch">
                EVENT · {sheet}
                <b>BEOMEO</b>
              </div>
            </div>
          </>
        )}

        <div className="body">
          {showTitle && (
            <div className="head">
              {(scriptOverride !== undefined ? scriptOverride : h.script) && (
                <div className="script en">{scriptOverride !== undefined ? scriptOverride : h.script}</div>
              )}
              {h.sup && <div className="sup">{h.sup}</div>}
              {h.badge && <div className="badge">{h.badge}</div>}
              <div className="title">
                {h.l1}
                {h.l2 && <span className="l2">{h.l2}</span>}
              </div>
            </div>
          )}
          <div className="panel" data-drag="panel" style={panelDx || panelDy ? { transform: `translate(${panelDx}px, ${panelDy}px)` } : undefined}>
            {showHeader && (headerPeriod || headerTarget) && (
              <div className="phead">
                {[headerPeriod && `이벤트 기간 : ${headerPeriod}`, headerTarget && `이벤트 대상 : ${headerTarget}`].filter(Boolean).join("   |   ")}
              </div>
            )}
            {items.map((it, i) => {
              const n = normalPrice(it), e = eventPrice(it);
              const disc = n && e ? Math.round((1 - e / n) * 100) : 0;
              return (
                <div className="row" key={i}>
                  <div className="name" style={{ fontSize: `${nameScale(it.name)}em` }}>{it.name}</div>
                  <div className="price">
                    {showDiscount && disc > 0 && <span className="disc">{disc}%</span>}
                    {n != null && <span className="was">{manwon(n)}만원</span>}
                    <span className="now">
                      {manwon(e)}
                      <span className="unit">만원</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="foot">부가세 10% 별도 &nbsp;·&nbsp; 현금 / 카드 동일</div>
        <div className="vat">VAT 별도</div>

        {stickers.map((s) => {
          const svg = s.char.startsWith("svg:") ? STICKER_SVGS[s.char.slice(4)] : null;
          return (
            <div key={s.id} className={`sticker${s.badge ? " badge" : ""}`} data-drag={`s:${s.id}`}
              style={{ left: `${s.x}%`, top: `${s.y}%`, fontSize: `${s.size}em`, transform: `translate(-50%,-50%) rotate(${s.rot}deg)` }}>
              {svg ? <span style={{ display: "block", width: "1em", height: "1em" }} dangerouslySetInnerHTML={{ __html: svg }} /> : s.char}
            </div>
          );
        })}
      </div>
    );
  }
);
Poster.displayName = "Poster";
