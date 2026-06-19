import { forwardRef } from "react";
import type { EventGroup } from "../lib/types";
import { THEMES } from "../lib/themes";
import { manwon, eventPrice, normalPrice, validItems, type Sticker } from "../lib/poster";
import { STICKER_SVGS } from "../lib/stickerAssets";
import { DESIGNED_SVGS } from "../lib/designedStickers";
import { logoUrl, logoWhiteUrl } from "../lib/logo";

const SVGS: Record<string, string> = { ...DESIGNED_SVGS, ...STICKER_SVGS };

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
  showPrice?: boolean; // 가격 표시 여부(끄면 시술명만)
  nameSize?: number; // 상품명 크기 배율
  nameWeight?: number; // 상품명 굵기
  priceSize?: number; // 금액 크기 배율
  priceFont?: "serif" | "cormorant" | "sans"; // 금액 폰트
  brandTop?: string; // 우상단 윗줄(기본: EVENT · {sheet})
  brandSub?: string; // 우상단 아랫줄(기본: BEOMEO)
  brandFont?: "sans" | "serif"; // 우상단 폰트
  brandStyle?: "stack" | "line" | "hidden"; // 우상단 형식: 2줄 / 한줄 / 숨김
  titleFx?: string; // 타이틀 글자 효과: none|shadow|lift|3d|outline|glow
  l1Override?: string; // 제목 1줄 직접 수정(더블클릭 편집)
  l2Override?: string; // 제목 2줄 직접 수정
  titleFont?: "sans" | "serif"; // 제목 폰트
  titleScale?: number; // 제목 크기 배율
  panelDx?: number; // 패널 가로 이동(px, 마우스 드래그)
  panelDy?: number; // 패널 세로 이동(px)
  panelScale?: number; // 패널 크기 배율(가장자리 드래그)
  logoDx?: number; logoDy?: number; // 로고 이동(드래그)
  headDx?: number; headDy?: number; // 타이틀(헤드라인) 이동(드래그)
  stickers?: Sticker[]; // 장식 스티커
}

const ALIGN: Record<string, string> = { left: "flex-start", center: "center", right: "flex-end" };
const PRICE_FONTS: Record<string, { family: string; weight: number }> = {
  serif: { family: '"Playfair Display", serif', weight: 900 },
  cormorant: { family: '"Cormorant Garamond", serif', weight: 600 },
  sans: { family: '"Pretendard Variable", Pretendard, sans-serif', weight: 800 },
};

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
  ({ group, themeKey, sheet, bgUrl, photoBg, hideTitle = false, width = 1080, height = 1527, logoScale = 1, panelTop = 0, panelBottom = 0, panelWidth = 100, panelAlign = "center", scriptOverride, variant = "classic", showHeader = false, headerPeriod = "", headerTarget = "", showDiscount = false, showPrice = true, nameSize = 1, nameWeight = 600, priceSize = 1, priceFont = "serif", brandTop, brandSub, brandFont = "sans", brandStyle = "stack", titleFx = "none", l1Override, l2Override, titleFont = "sans", titleScale = 1, panelDx = 0, panelDy = 0, panelScale = 1, logoDx = 0, logoDy = 0, headDx = 0, headDy = 0, stickers = [] }, ref) => {
    const theme = THEMES[themeKey] || THEMES.summer;
    const pf = PRICE_FONTS[priceFont] || PRICE_FONTS.serif;
    const t = theme.tokens;
    const h = theme.headline(group);
    const items = validItems(group);

    const photo = bgUrl || photoBg || null;
    const showTitle = !hideTitle;
    const land = width > height;
    const brandTopText = brandTop && brandTop.trim() ? brandTop : `EVENT · ${sheet}`;
    const brandSubText = brandSub !== undefined ? brandSub : "BEOMEO";
    const scriptText = scriptOverride !== undefined ? scriptOverride : h.script;
    const L1 = l1Override !== undefined ? l1Override : h.l1;
    const L2 = l2Override !== undefined ? l2Override : h.l2;
    const titleFamily = titleFont === "serif" ? '"Playfair Display", serif' : '"Pretendard Variable", Pretendard, sans-serif';
    const isStudio = variant === "studio";

    const styleVars = {
      ["--w" as any]: width,
      ["--h" as any]: height,
      ["--logo-scale" as any]: logoScale,
      ["--panel-top" as any]: panelTop,
      ["--panel-bottom" as any]: panelBottom,
      ["--panel-width" as any]: panelWidth,
      ["--panel-align" as any]: ALIGN[panelAlign] || "center",
      ["--name-weight" as any]: nameWeight,
      ["--price-size" as any]: priceSize,
      ["--price-font" as any]: pf.family,
      ["--price-weight" as any]: pf.weight,
      ["--title-scale" as any]: titleScale,
      ["--title-font" as any]: titleFamily,
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
      <div ref={ref} className={`poster v-${variant}${photo ? " has-photo" : ""}${land ? " land" : ""}${titleFx && titleFx !== "none" ? ` fx-${titleFx}` : ""}`} style={styleVars}>
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
                <img className="logo-img" data-drag="logo" style={logoDx || logoDy ? { transform: `translate(${logoDx}px, ${logoDy}px)` } : undefined} src={photo && logoWhiteUrl ? logoWhiteUrl : logoUrl} alt="BEAUTY PARK 뷰티파크의원 범어점" />
              ) : (
                <div className="logo" data-drag="logo" style={logoDx || logoDy ? { transform: `translate(${logoDx}px, ${logoDy}px)` } : undefined}>
                  <div>
                    <div className="wm">BEAUTY PARK</div>
                    <div className="sub">뷰티파크의원 범어점</div>
                  </div>
                </div>
              )}
              {brandStyle !== "hidden" && (
                <div className={`branch${brandFont === "serif" ? " en" : ""}${brandStyle === "line" ? " line" : ""}`}>
                  {brandStyle === "line"
                    ? [brandTopText, brandSubText].filter(Boolean).join(" · ")
                    : <>{brandTopText}{brandSubText && <b>{brandSubText}</b>}</>}
                </div>
              )}
            </div>
          </>
        )}

        <div className="body">
          {showTitle && (
            <div className={`head${isStudio ? " studio-head" : ""}`} data-drag="head" style={headDx || headDy ? { transform: `translate(${headDx}px, ${headDy}px)` } : undefined}>
              {isStudio ? (
                <>
                  <div className="hl-row">
                    <span className="hl-l">{L1}</span>
                    <span className="hl-rule" />
                    {L2 && <span className="hl-r">{L2}</span>}
                  </div>
                  {scriptText && <div className="script en">{scriptText}</div>}
                </>
              ) : (
                <>
                  {scriptText && <div className="script en">{scriptText}</div>}
                  {h.sup && <div className="sup">{h.sup}</div>}
                  {h.badge && <div className="badge">{h.badge}</div>}
                  <div className="title">
                    {L1}
                    {L2 && <span className="l2">{L2}</span>}
                  </div>
                </>
              )}
            </div>
          )}
          <div className="panel" data-drag="panel" style={{ transform: `translate(${panelDx}px, ${panelDy}px) scale(${panelScale})`, transformOrigin: "center top" }}>
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
                  <div className="name" style={{ fontSize: `${nameScale(it.name) * nameSize}em` }}>{it.name}</div>
                  {showPrice && (
                    <div className="price">
                      {showDiscount && disc > 0 && <span className="disc">{disc}%</span>}
                      {n != null && <span className="was">{manwon(n)}만원</span>}
                      <span className="now">
                        {manwon(e)}
                        <span className="unit">만원</span>
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
            <div className="panel-resize" data-drag="panel-size" title="가장자리를 위/아래로 드래그해 패널 크기 조절" />
          </div>
        </div>

        <div className="foot">부가세 10% 별도 &nbsp;·&nbsp; 현금 / 카드 동일</div>
        <div className="vat">VAT 별도</div>

        {showTitle && isStudio && (
          <div className="studio-brand">
            {logoUrl ? (
              <img className="studio-logo" src={photo && logoWhiteUrl ? logoWhiteUrl : logoUrl} alt="BEAUTY PARK 뷰티파크의원 범어점" />
            ) : (
              <div className="studio-wm">
                <div className="wm">BEAUTY PARK</div>
                <div className="sub">뷰티파크의원 범어점</div>
              </div>
            )}
          </div>
        )}

        {stickers.map((s) => {
          const svg = s.char.startsWith("svg:") ? SVGS[s.char.slice(4)] : null;
          const img = s.char.startsWith("img:") ? s.char.slice(4) : null;
          return (
            <div key={s.id} className={`sticker${s.badge ? " badge" : ""}${img ? " img" : ""}`} data-drag={`s:${s.id}`}
              style={{ left: `${s.x}%`, top: `${s.y}%`, fontSize: `${s.size}em`, transform: `translate(-50%,-50%) rotate(${s.rot}deg)` }}>
              {svg ? (
                <span style={{ display: "block", width: "1em", height: "1em" }} dangerouslySetInnerHTML={{ __html: svg }} />
              ) : img ? (
                <img src={img} alt="" style={{ display: "block", width: "1em", height: "auto" }} />
              ) : (
                s.char
              )}
            </div>
          );
        })}
      </div>
    );
  }
);
Poster.displayName = "Poster";
