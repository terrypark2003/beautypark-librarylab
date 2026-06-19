import type { EventGroup } from "./types";

export interface ThemeTokens {
  bg: string;
  blob: string;
  ink: string;
  accent: string;
  accentDeep: string;
  script: string;
  panel: string;
  divider: string;
  was: string;
}

export interface Headline {
  script?: string;
  sup?: string;
  badge?: string;
  l1: string;
  l2?: string;
}

export interface ThemeDef {
  key: string;
  label: string;
  tokens: ThemeTokens;
  headline: (g: EventGroup) => Headline;
}

const splitName = (g: EventGroup) => {
  const parts = g.group
    .replace(/\[[^\]]*\]/g, "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length >= 2 ? { l1: parts[0], l2: parts.slice(1).join(" ") } : { l1: parts[0] || g.group };
};

export const THEMES: Record<string, ThemeDef> = {
  summer: {
    key: "summer",
    label: "월초 매거진 (여름)",
    tokens: {
      bg: "linear-gradient(157deg,#FAF6EF 0%,#F3EADB 52%,#EADCC6 100%)",
      blob: "radial-gradient(60% 45% at 80% 8%, rgba(150,192,228,.5), transparent 70%)",
      ink: "#3A352F", accent: "#8C7E6E", accentDeep: "#6E6253",
      script: "#C0895F", panel: "rgba(255,255,255,.97)", divider: "#EFE7DA", was: "#BBB1A2",
    },
    headline: (g) => ({ script: "Early Summer", ...splitName(g) }),
  },
  cool: {
    key: "cool",
    label: "카톡 친구전용 (버블)",
    tokens: {
      bg: "linear-gradient(160deg,#EFF6FC 0%,#DEEDF8 55%,#CFE6F6 100%)",
      blob: "radial-gradient(55% 40% at 82% 6%, rgba(255,255,255,.7), transparent 65%)",
      ink: "#27384F", accent: "#4470AE", accentDeep: "#2B5390",
      script: "#5E86C8", panel: "rgba(255,255,255,.98)", divider: "#E5EEF6", was: "#A9B6C4",
    },
    headline: () => ({ script: "Friends Only", sup: "뷰티파크의원 범어점 카톡 플러스", badge: "1인 1회", l1: "친구 전용 이벤트" }),
  },
  green: {
    key: "green",
    label: "화·수·목 (그린)",
    tokens: {
      bg: "linear-gradient(160deg,#F4F8EE 0%,#E8F2DC 55%,#DCEAC9 100%)",
      blob: "radial-gradient(55% 40% at 80% 8%, rgba(255,255,255,.6), transparent 65%)",
      ink: "#2E3A28", accent: "#6E9A52", accentDeep: "#4E7838",
      script: "#86A765", panel: "rgba(255,255,255,.97)", divider: "#E6EDDA", was: "#B2BBA4",
    },
    headline: () => ({ script: "Weekday Special", badge: "화·수·목 한정", l1: "예뻐지는", l2: "화·수·목 이벤트" }),
  },
  sky: {
    key: "sky",
    label: "READY TO GO (하늘)",
    tokens: {
      bg: "linear-gradient(165deg,#2E86DE 0%,#5BA8E8 40%,#BcdCEF 100%)".replace("Bc", "BC"),
      blob: "radial-gradient(60% 45% at 78% 10%, rgba(255,255,255,.55), transparent 65%)",
      ink: "#15324F", accent: "#1E6FC4", accentDeep: "#10518F",
      script: "#7FB2E6", panel: "rgba(255,255,255,.97)", divider: "#E4EEF6", was: "#A9B6C4",
    },
    headline: () => ({ script: "Ready to Go", l1: "READY", l2: "TO GO" }),
  },
  luxe: {
    key: "luxe",
    label: "그랜드/프리미엄 (레드·골드)",
    tokens: {
      bg: "linear-gradient(160deg,#3a1115 0%,#5e1a20 55%,#7a232b 100%)",
      blob: "radial-gradient(55% 40% at 80% 8%, rgba(214,178,110,.35), transparent 65%)",
      ink: "#f5e9d6", accent: "#D9B36A", accentDeep: "#E7C988",
      script: "#D9B36A", panel: "rgba(255,255,255,.97)", divider: "#ECE6DA", was: "#b9b1a2",
    },
    headline: (g) => ({ script: "Premium Event", ...splitName(g) }),
  },
  board: {
    key: "board",
    label: "상반기 결산 (보드)",
    tokens: {
      bg: "linear-gradient(160deg,#F3F2F0 0%,#E9E7E3 100%)",
      blob: "radial-gradient(50% 38% at 82% 8%, rgba(150,170,220,.28), transparent 65%)",
      ink: "#2C2C33", accent: "#5566B5", accentDeep: "#37468C",
      script: "#8A93C8", panel: "rgba(255,255,255,.98)", divider: "#ECEAE6", was: "#B6B3AE",
    },
    headline: (g) => ({ script: "Half-year Best", ...splitName(g) }),
  },
  noir: {
    key: "noir", label: "럭셔리 블랙 (느와르)",
    tokens: { bg: "linear-gradient(160deg,#15161A 0%,#1E2026 55%,#26282F 100%)", blob: "radial-gradient(55% 40% at 80% 8%, rgba(212,184,124,.28), transparent 65%)", ink: "#EDE7DA", accent: "#C9A86A", accentDeep: "#E0C485", script: "#C9A86A", panel: "rgba(255,255,255,.96)", divider: "#ECE6DA", was: "#9A948A" },
    headline: (g) => ({ script: "Signature", ...splitName(g) }),
  },
  ivoryclean: {
    key: "ivoryclean", label: "클린 화이트 (미니멀)",
    tokens: { bg: "linear-gradient(160deg,#FFFFFF 0%,#F6F6F4 100%)", blob: "radial-gradient(50% 38% at 82% 8%, rgba(170,170,170,.16), transparent 65%)", ink: "#2B2B2E", accent: "#8A8A8F", accentDeep: "#55555A", script: "#A99B8C", panel: "rgba(255,255,255,.98)", divider: "#EEEEEC", was: "#BDBDBD" },
    headline: (g) => ({ script: "Clean", ...splitName(g) }),
  },
  pastel: {
    key: "pastel", label: "파스텔 (로즈·라벤더)",
    tokens: { bg: "linear-gradient(160deg,#FBEFF4 0%,#F1E8F7 55%,#E7EAF8 100%)", blob: "radial-gradient(55% 40% at 80% 8%, rgba(255,255,255,.7), transparent 65%)", ink: "#4A3A48", accent: "#C58AB0", accentDeep: "#A85F96", script: "#CFA0C4", panel: "rgba(255,255,255,.97)", divider: "#F1E8EE", was: "#C4B6BF" },
    headline: (g) => ({ script: "Soft Glow", ...splitName(g) }),
  },
  medical: {
    key: "medical", label: "메디컬 블루 (클리닉)",
    tokens: { bg: "linear-gradient(160deg,#F2F8FB 0%,#E3F0F7 100%)", blob: "radial-gradient(55% 40% at 82% 6%, rgba(255,255,255,.7), transparent 65%)", ink: "#1E3A47", accent: "#2E8FB0", accentDeep: "#1C6E8C", script: "#5FB4CE", panel: "rgba(255,255,255,.98)", divider: "#E4EFF4", was: "#A6B8C0" },
    headline: (g) => ({ script: "Clinic Care", ...splitName(g) }),
  },
  mono: {
    key: "mono", label: "모노톤 (차콜)",
    tokens: { bg: "linear-gradient(160deg,#ECECEC 0%,#DCDCDC 100%)", blob: "radial-gradient(50% 38% at 82% 8%, rgba(0,0,0,.06), transparent 65%)", ink: "#222226", accent: "#5A5A5F", accentDeep: "#2E2E33", script: "#8A8A8F", panel: "rgba(255,255,255,.98)", divider: "#E2E2E2", was: "#ABABAB" },
    headline: (g) => ({ script: "Editorial", ...splitName(g) }),
  },
  nature: {
    key: "nature", label: "네이처 (베이지·올리브)",
    tokens: { bg: "linear-gradient(160deg,#F6F3EA 0%,#ECE6D6 55%,#E0DCC4 100%)", blob: "radial-gradient(55% 40% at 80% 8%, rgba(150,160,110,.22), transparent 65%)", ink: "#3B3A2E", accent: "#8E8A5E", accentDeep: "#6B6A42", script: "#A99B6E", panel: "rgba(255,255,255,.96)", divider: "#ECE7D8", was: "#B7B19A" },
    headline: (g) => ({ script: "Natural", ...splitName(g) }),
  },
  rose: {
    key: "rose", label: "로즈 골드 (웜)",
    tokens: { bg: "linear-gradient(160deg,#FBF0EC 0%,#F6E2DA 55%,#EFD0C6 100%)", blob: "radial-gradient(55% 40% at 80% 8%, rgba(255,255,255,.6), transparent 65%)", ink: "#4B362F", accent: "#C08A6E", accentDeep: "#A56A4E", script: "#CDA07F", panel: "rgba(255,255,255,.97)", divider: "#F1E4DD", was: "#C6B3A9" },
    headline: (g) => ({ script: "Rosé", ...splitName(g) }),
  },
  sunset: {
    key: "sunset", label: "선셋 (코랄·피치)",
    tokens: { bg: "linear-gradient(160deg,#FFF1E6 0%,#FFE0D0 50%,#FBC9C0 100%)", blob: "radial-gradient(55% 40% at 80% 8%, rgba(255,255,255,.6), transparent 65%)", ink: "#4E2F2A", accent: "#E0795C", accentDeep: "#C85A3E", script: "#F0A088", panel: "rgba(255,255,255,.97)", divider: "#F7E2D8", was: "#D2B3A8" },
    headline: (g) => ({ script: "Sunset", ...splitName(g) }),
  },
};

// AI/런타임 생성 테마용 — 색 토큰 + 영문 태그로 ThemeDef 구성
export function makeTheme(key: string, label: string, tokens: ThemeTokens, scriptTag = ""): ThemeDef {
  return { key, label, tokens, headline: (g) => ({ script: scriptTag || undefined, ...splitName(g) }) };
}

export function themeKeyForGroup(name: string): string {
  const n = name.replace(/\s/g, "");
  if (n.includes("카톡") || n.includes("친구")) return "cool";
  if (n.includes("화수목")) return "green";
  if (/readytogo/i.test(n) || n.includes("READYTOGO")) return "sky";
  if (n.includes("결산")) return "board";
  if (n.includes("리오프닝") || n.includes("그랜드") || n.includes("프리미엄") || /launching/i.test(n)) return "luxe";
  return "summer";
}

export const THEME_LIST = Object.values(THEMES).map((t) => ({ key: t.key, label: t.label }));
