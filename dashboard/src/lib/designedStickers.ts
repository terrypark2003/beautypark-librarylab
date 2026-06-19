// 디자인 스티커 — 그라데이션·텍스트·레이어가 들어간 '캔바 느낌' 장식 요소.
// 스티커 char = "svg:<key>" (STICKER_SVGS와 동일 네임스페이스에서 합쳐 사용).
// 모두 0 0 100 100 정사각 viewBox, width/height 100%로 1em 박스를 채움.

export const DESIGNED_SVGS: Record<string, string> = {
  // 골드 12각 선버스트 + SALE
  saleburst: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%"><defs><linearGradient id="d-sb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F2D58E"/><stop offset="1" stop-color="#C79A52"/></linearGradient></defs><path d="M50 4 57.8 21 73 10.2 71.2 28.8 89.8 27 79 42.2 96 50 79 57.8 89.8 73 71.2 71.2 73 89.8 57.8 79 50 96 42.2 79 27 89.8 28.8 71.2 10.2 73 21 57.8 4 50 21 42.2 10.2 27 28.8 28.8 27 10.2 42.2 21Z" fill="url(#d-sb)"/><circle cx="50" cy="50" r="27" fill="#FBF4E4"/><circle cx="50" cy="50" r="27" fill="none" stroke="#C79A52" stroke-width="1.4" stroke-dasharray="2 3"/><text x="50" y="57" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="20" font-weight="700" letter-spacing="1" fill="#9A6B2F">SALE</text></svg>`,

  // 스왈로테일 리본 배너 + EVENT
  eventribbon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%"><defs><linearGradient id="d-er" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B89A68"/><stop offset="1" stop-color="#8A6E44"/></linearGradient></defs><path d="M6 42 16 36 16 64 6 70Z" fill="#5E4A2C"/><path d="M94 42 84 36 84 64 94 70Z" fill="#5E4A2C"/><path d="M14 38 86 38 78 51 86 64 14 64 22 51Z" fill="url(#d-er)"/><path d="M14 38 86 38 86 42 14 42Z" fill="#ffffff" opacity=".22"/><text x="50" y="56" text-anchor="middle" font-family="'Helvetica Neue', Arial, sans-serif" font-size="15" font-weight="800" letter-spacing="2" fill="#fff">EVENT</text></svg>`,

  // 원형 스탬프 + BEST + 별
  beststamp: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%"><circle cx="50" cy="50" r="42" fill="#5E5246"/><circle cx="50" cy="50" r="34" fill="#FBF4E4"/><circle cx="50" cy="50" r="38" fill="none" stroke="#FBF4E4" stroke-width="1.2" stroke-dasharray="2 3"/><path d="M30 30 32 35 37 35 33 38 35 43 30 40 25 43 27 38 23 35 28 35Z" fill="#C79A52" transform="translate(20,-18) scale(.55)"/><path d="M50 38 53 47 62 47 55 52 58 61 50 56 42 61 45 52 38 47 47 47Z" fill="#C79A52" transform="translate(0,-22) scale(.5)"/><text x="50" y="60" text-anchor="middle" font-family="Georgia, serif" font-size="19" font-weight="700" letter-spacing="1" fill="#5E5246">BEST</text></svg>`,

  // 로즈 그라데이션 알약 배지 + NEW
  newpill: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%"><defs><linearGradient id="d-np" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E9A9B2"/><stop offset="1" stop-color="#CE7E8C"/></linearGradient></defs><rect x="12" y="36" width="76" height="28" rx="14" fill="url(#d-np)"/><rect x="12" y="36" width="76" height="13" rx="6.5" fill="#fff" opacity=".22"/><path d="M50 4C53 16 55 18 67 21 55 24 53 26 50 38 47 26 45 24 33 21 45 18 47 16 50 4Z" fill="#E9A9B2" transform="translate(28,-2) scale(.28)"/><text x="50" y="55" text-anchor="middle" font-family="'Helvetica Neue', Arial, sans-serif" font-size="15" font-weight="800" letter-spacing="2" fill="#fff">NEW</text></svg>`,

  // 가격 태그 + % OFF
  pricetag: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%"><defs><linearGradient id="d-pt" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E8C079"/><stop offset="1" stop-color="#C79A52"/></linearGradient></defs><path d="M30 20 84 20 84 80 30 80 12 50Z" fill="url(#d-pt)"/><circle cx="30" cy="50" r="7" fill="#FBF4E4"/><circle cx="30" cy="50" r="2.4" fill="#C79A52"/><text x="58" y="56" text-anchor="middle" font-family="'Helvetica Neue', Arial, sans-serif" font-size="15" font-weight="800" letter-spacing="1" fill="#fff">% OFF</text></svg>`,

  // 반짝임 클러스터
  sparkles: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%"><defs><linearGradient id="d-sp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F4D897"/><stop offset="1" stop-color="#D9B061"/></linearGradient></defs><g fill="url(#d-sp)"><path d="M50 4C56 40 60 44 96 50 60 56 56 60 50 96 44 60 40 56 4 50 40 44 44 40 50 4Z" transform="translate(8,2) scale(.5)"/><path d="M50 4C56 40 60 44 96 50 60 56 56 60 50 96 44 60 40 56 4 50 40 44 44 40 50 4Z" transform="translate(50,38) scale(.36)"/><path d="M50 4C56 40 60 44 96 50 60 56 56 60 50 96 44 60 40 56 4 50 40 44 44 40 50 4Z" transform="translate(20,52) scale(.26)"/></g><circle cx="80" cy="20" r="2.4" fill="#E7C988"/><circle cx="26" cy="34" r="2" fill="#E7C988"/></svg>`,

  // 보태니컬 잔가지
  sprig: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%"><path d="M50 94 Q49 55 50 12" fill="none" stroke="#6E8C52" stroke-width="2.4" stroke-linecap="round"/><g fill="#8DB07A"><ellipse cx="38" cy="70" rx="13" ry="7" transform="rotate(28 38 70)"/><ellipse cx="62" cy="58" rx="13" ry="7" transform="rotate(-28 62 58)"/><ellipse cx="40" cy="46" rx="12" ry="6.5" transform="rotate(34 40 46)"/><ellipse cx="60" cy="34" rx="12" ry="6.5" transform="rotate(-34 60 34)"/><ellipse cx="50" cy="20" rx="7" ry="11"/></g><circle cx="44" cy="26" r="3.4" fill="#E2A0A8"/><circle cx="57" cy="22" r="3" fill="#E7C988"/></svg>`,

  // 브러시 하이라이트(텍스트 뒤 강조용)
  brush: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%"><path d="M7 52 C9 41 26 37 50 36 C76 35 93 39 94 49 C95 60 74 65 49 65 C27 65 6 63 7 52Z" fill="#8C7E6E" opacity=".9"/><path d="M14 45 C30 41 70 41 88 46" fill="none" stroke="#fff" stroke-width="1.4" opacity=".25" stroke-linecap="round"/></svg>`,

  // 리본 보우
  bow: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%"><defs><linearGradient id="d-bw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E9A9B2"/><stop offset="1" stop-color="#CE7E8C"/></linearGradient></defs><path d="M50 50 24 32 C12 26 8 44 16 50 8 56 12 74 24 68Z" fill="url(#d-bw)"/><path d="M50 50 76 32 C88 26 92 44 84 50 92 56 88 74 76 68Z" fill="url(#d-bw)"/><path d="M46 52 38 86 50 76 62 86 54 52Z" fill="#CE7E8C"/><circle cx="50" cy="50" r="8" fill="#B96B7A"/></svg>`,

  // 말풍선(카톡 느낌)
  bubble: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%"><path d="M18 22 H82 A12 12 0 0 1 94 34 V58 A12 12 0 0 1 82 70 H40 L24 84 26 70 H18 A12 12 0 0 1 6 58 V34 A12 12 0 0 1 18 22Z" fill="#FBF4E4" stroke="#D8C7AE" stroke-width="2"/><circle cx="36" cy="46" r="4" fill="#C9A36E"/><circle cx="50" cy="46" r="4" fill="#C9A36E"/><circle cx="64" cy="46" r="4" fill="#C9A36E"/></svg>`,

  // 컨페티
  confetti: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%"><circle cx="20" cy="24" r="4" fill="#E2A0A8"/><circle cx="78" cy="30" r="3.4" fill="#8DB07A"/><circle cx="50" cy="16" r="3" fill="#E7C988"/><rect x="64" y="62" width="9" height="9" rx="2" fill="#C9A36E" transform="rotate(24 68 66)"/><rect x="24" y="64" width="8" height="8" rx="2" fill="#E2A0A8" transform="rotate(-18 28 68)"/><path d="M82 70 C86 66 86 76 90 72" fill="none" stroke="#8DB07A" stroke-width="2.4" stroke-linecap="round"/><path d="M14 48 C18 44 18 54 22 50" fill="none" stroke="#E7C988" stroke-width="2.4" stroke-linecap="round"/><path d="M48 80 53 90 43 90Z" fill="#C9A36E"/></svg>`,

  // 클래식 플러리시(타이틀 구분선)
  flourish: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%"><g fill="none" stroke="#C9A36E" stroke-width="2.2" stroke-linecap="round"><path d="M50 50 C40 42 24 42 10 50 C20 52 26 50 30 47"/><path d="M50 50 C60 42 76 42 90 50 C80 52 74 50 70 47"/></g><path d="M50 42 56 50 50 58 44 50Z" fill="#C9A36E"/><circle cx="50" cy="50" r="2.4" fill="#FBF4E4"/></svg>`,
};

export const DESIGNED_KEYS = Object.keys(DESIGNED_SVGS);

// 팔레트 툴팁 라벨
export const DESIGNED_LABELS: Record<string, string> = {
  saleburst: "세일 뱃지", eventribbon: "이벤트 리본", beststamp: "베스트 스탬프", newpill: "NEW 배지",
  pricetag: "가격 태그", sparkles: "반짝임", sprig: "보태니컬", brush: "강조 브러시",
  bow: "리본", bubble: "말풍선", confetti: "컨페티", flourish: "플러리시",
};
