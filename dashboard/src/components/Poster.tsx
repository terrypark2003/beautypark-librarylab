import { forwardRef } from "react";
import type { EventGroup } from "../lib/types";
import { THEMES } from "../lib/themes";
import { manwon, eventPrice, normalPrice, validItems } from "../lib/poster";
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
  panelScale?: number; // 가격 패널 크기 배율
}

export const Poster = forwardRef<HTMLDivElement, Props>(
  ({ group, themeKey, sheet, bgUrl, photoBg, hideTitle = false, width = 1080, height = 1527, logoScale = 1, panelScale = 1 }, ref) => {
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
      ["--panel-scale" as any]: panelScale,
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
      <div ref={ref} className={`poster${photo ? " has-photo" : ""}${land ? " land" : ""}`} style={styleVars}>
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
              {h.script && <div className="script en">{h.script}</div>}
              {h.sup && <div className="sup">{h.sup}</div>}
              {h.badge && <div className="badge">{h.badge}</div>}
              <div className="title">
                {h.l1}
                {h.l2 && <span className="l2">{h.l2}</span>}
              </div>
            </div>
          )}
          <div className="panel">
            {items.map((it, i) => (
              <div className="row" key={i}>
                <div className="name">{it.name}</div>
                <div className="price">
                  {normalPrice(it) != null && <span className="was">{manwon(normalPrice(it))}만원</span>}
                  <span className="now">
                    {manwon(eventPrice(it))}
                    <span className="unit">만원</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="foot">부가세 10% 별도 &nbsp;·&nbsp; 현금 / 카드 동일</div>
        <div className="vat">VAT 별도</div>
      </div>
    );
  }
);
Poster.displayName = "Poster";
