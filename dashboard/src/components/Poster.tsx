import { forwardRef } from "react";
import type { EventGroup } from "../lib/types";
import { THEMES } from "../lib/themes";
import { manwon, eventPrice, normalPrice, validItems } from "../lib/poster";

const Spark = ({ cls }: { cls: string }) => (
  <svg className={`spk ${cls}`} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 0c.9 7 4 10.1 12 12-8 1.9-11.1 5-12 12-.9-7-4-10.1-12-12 8-1.9 11.1-5 12-12Z" />
  </svg>
);

interface Props {
  group: EventGroup;
  themeKey: string;
  sheet: string;
  bgUrl?: string | null; // 배경 플레이트(아트). 있으면 플레이트 모드.
  panelTop?: number; // 플레이트 모드에서 데이터 패널 상단 위치(px)
}

/** 1080x1527 포스터. ref로 html-to-image 캡처. bgUrl이 있으면 '플레이트 모드'(아트 위에 데이터 패널만 합성). */
export const Poster = forwardRef<HTMLDivElement, Props>(({ group, themeKey, sheet, bgUrl, panelTop = 560 }, ref) => {
  const theme = THEMES[themeKey] || THEMES.summer;
  const t = theme.tokens;
  const h = theme.headline(group);
  const items = validItems(group);
  const plate = !!bgUrl;

  const styleVars = {
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
    <div ref={ref} className={`poster${plate ? " plate has-photo" : ""}`} style={styleVars}>
      {plate ? (
        <div className="photo" style={{ backgroundImage: `url(${bgUrl})` }} />
      ) : (
        <>
          <div className="blob" />
          <div className="dots" />
        </>
      )}

      {!plate && (
        <>
          <Spark cls="s1" />
          <Spark cls="s2" />
          <Spark cls="s3" />
          <div className="top">
            <div className="logo">
              <div className="mark">B</div>
              <div>
                <div className="wm">BEAUTY PARK</div>
                <div className="sub">뷰티파크의원 범어점</div>
              </div>
            </div>
            <div className="branch">
              EVENT · {sheet}
              <b>BEOMEO</b>
            </div>
          </div>
          <div className="head">
            {h.script && <div className="script en">{h.script}</div>}
            {h.sup && <div className="sup">{h.sup}</div>}
            {h.badge && <div className="badge">{h.badge}</div>}
            <div className="title">
              {h.l1}
              {h.l2 && <span className="l2">{h.l2}</span>}
            </div>
          </div>
        </>
      )}

      <div className="panel" style={plate ? { top: panelTop } : undefined}>
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

      <div className="foot">부가세 10% 별도 &nbsp;·&nbsp; 현금 / 카드 동일</div>
      <div className="vat">VAT 별도</div>
    </div>
  );
});
Poster.displayName = "Poster";
