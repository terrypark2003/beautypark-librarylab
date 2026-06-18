export interface TitleResult { titles: string[]; note?: string }

const SEASON: Record<number, string> = {
  1: "새해 뷰티 리셋", 2: "봄 준비", 3: "봄 새단장", 4: "봄 글로우", 5: "가정의 달", 6: "초여름 싱그러움",
  7: "한여름 바캉스", 8: "늦여름 회복", 9: "환절기 케어", 10: "가을 광채", 11: "연말 준비", 12: "연말 결산",
};

function keyword(treatments: string[]): string {
  const text = treatments.join(" ");
  const map: [RegExp, string][] = [
    [/제모/, "제모"], [/보톡스/, "보톡스"], [/필러|벨로테로|쥬베룩|리쥬란|콜라겐/, "볼륨"],
    [/리프팅|슈링크|울쎄라|올타이트|소프웨이브|인모드/, "리프팅"], [/미백|토닝|비타민/, "미백"],
    [/모공|흉터|프락셀|아쿠아필/, "모공"], [/바디|리포|윤곽/, "바디"], [/물광|스킨부스터|주사/, "물광"],
  ];
  for (const [re, w] of map) if (re.test(text)) return w;
  return "스페셜";
}

function fallback(input: { month: string; treatments: string[] }): string[] {
  const m = Number(input.month.split(".")[1] || "0");
  const s = SEASON[m] || "이달의";
  const kw = keyword(input.treatments);
  return [`${s} ${kw} 페스타`, `${s} 스페셜 이벤트`, `${kw} 집중 ${m}월 이벤트`, `${s} 뷰티 위크`];
}

export async function suggestTitles(input: { month: string; treatments: string[]; description?: string }): Promise<TitleResult> {
  try {
    const r = await fetch("/api/title", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    if (r.ok) {
      const d = await r.json();
      if (Array.isArray(d.titles) && d.titles.length) return { titles: d.titles };
      return { titles: fallback(input), note: d.note || "오프라인 추천" };
    }
  } catch {
    /* 네트워크/서버 없음 → 폴백 */
  }
  return { titles: fallback(input), note: "오프라인 추천 (AI 서버 미연결)" };
}
