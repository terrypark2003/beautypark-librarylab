// 모델별 단가 (USD / 1M tokens) = [input, output]. 추정치 — 공식 가격은 변동 가능.
// Claude: claude-api 스킬 기준(2026-06). Gemini: 공개 가격 근사(무료 한도 적용 시 실제는 더 낮음).
const PRICE: Record<string, [number, number]> = {
  "gemini-2.0-flash": [0.1, 0.4],
  "gemini-2.5-flash": [0.3, 2.5],
  "gemini-2.5-pro": [1.25, 10.0],
  "gemini-1.5-flash": [0.075, 0.3],
  "gemini-flash-latest": [0.1, 0.4],
  "claude-haiku-4-5": [1.0, 5.0],
  "claude-haiku-4-5-20251001": [1.0, 5.0],
  "claude-sonnet-4-6": [3.0, 15.0],
  "claude-opus-4-8": [5.0, 25.0],
};

export function costUsd(model: string, inTok: number, outTok: number): number {
  const p = PRICE[model] || [1.0, 5.0];
  return (inTok * p[0] + outTok * p[1]) / 1_000_000;
}
