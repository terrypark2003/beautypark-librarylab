# 뷰티파크 · 운영 대시보드 (beautypark-librarylab)

이벤트 콘텐츠 자동화 허브. 업체가 매월 보내는 **디자인 작업 요청서(.xlsx)** 를 업로드하면
시술명·가격을 그대로 추출해 **플친 와이드 / 플친 리스트 / 인스타** 카피 덱을 자동 생성하고,
복사·검수·컴플라이언스 체크까지 한 화면에서 처리한다. (손기재 전사 오류 = 과거 최대 마찰요인 해소)

## 기능
- **이벤트 콘텐츠 허브** — 엑셀 업로드(클라이언트 파싱, ExcelJS) → 이벤트 그룹/3종 가격/강조/월테마 추출 → 카피 덱 생성 + 블록별 복사 + 컴플라이언스 체크리스트. 기본값으로 2026.7 샘플 로드.
- **브랜드 가이드** — 컬러 팔레트, 로고 5종, 공통 푸터.
- **채널·계정** — 인스타/카카오/블로그/홈페이지/메타 바로가기 + 상태.
- **운영 캘린더** — 월·주 발행 주기.
- **인수인계** — 라랩 계약 종료 대비 체크리스트.

## 개발
```bash
cd dashboard
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/ 정적 산출물
npm run preview  # 빌드 미리보기
```

## 배포 (Vercel)
- Framework: **Vite**, Root Directory: **`dashboard`**, Build: `npm run build`, Output: `dist`.
- 목표 도메인: `beautypark-librarylab.vercel.app`
- 정적 SPA이며 서버/DB 없음 — 엑셀 파싱·생성 전부 브라우저에서 수행(데이터 외부 전송 없음).

## 가격·VAT 규칙
- 최종가 = 이벤트가 VAT 포함(E열). 정상가는 C열×1.1(VAT 환산) 참고가.
- 표기 방식(포함/별도)은 원내 확정 사항.

> 데이터 출처/스키마: `../docs/11-design-request-form.md` · 파서 원본: `../tools/parse_request.py`
