# 배포 가이드 (Vercel)

대시보드(`dashboard/`, Vite 정적 SPA)를 `beautypark-librarylab.vercel.app` 으로 배포한다.
루트 `vercel.json` 이 빌드(`cd dashboard && npm run build` → `dashboard/dist`)를 처리한다.

## ⚠️ 네트워크 전제 (CLI 배포 시)
이 실행 환경은 egress 허용목록 기반이다. CLI 배포는 아래 호스트가 **세션 시작 시점에** 열려 있어야 한다:
```
api.vercel.com
vercel.com
*.vercel.com
```
> egress 설정을 바꿨다면 **새 세션을 시작**해야 반영된다(실행 중 세션에는 적용 안 됨).
> 차단 시 증상: `Host not in allowlist: api.vercel.com` 또는 CLI가 "token is not valid"로 오인 표시.

## 방법 A — CLI 배포 (egress 열린 새 세션에서)
```bash
export VERCEL_TOKEN=<Account 토큰>            # vercel.com/account/settings/tokens
cd /home/user/beautypark-librarylab

npx vercel whoami --token="$VERCEL_TOKEN"      # 1) 토큰/연결 확인 (계정 이메일 출력되면 OK)
npx vercel deploy --yes --token="$VERCEL_TOKEN"        # 2) 프리뷰 배포 → URL 확인
npx vercel deploy --prod --yes --token="$VERCEL_TOKEN" # 3) 프로덕션 승격 → beautypark-librarylab.vercel.app
```
- 첫 배포 시 디렉터리명(`beautypark-librarylab`)으로 프로젝트가 생성되어 도메인이 자동 매칭된다.
- 팀 계정이면 `--scope <팀슬러그>` 추가.

## 방법 B — Git 연동 (egress/토큰 불필요, 가장 안정적)
Vercel 대시보드에서:
1. **Add New → Project → Import** `terrypark2003/beautypark-librarylab`
2. **Project Name**: `beautypark-librarylab` (도메인 자동 매칭)
3. **Root Directory**: 저장소 루트(그대로) — 루트 `vercel.json`이 빌드 처리
4. **Framework Preset**: Other (vercel.json이 오버라이드)
5. **Production Branch**(Settings → Git): 현재 작업 브랜치 `claude/loving-gauss-vg5wca`
   — 또는 PR을 기본 브랜치에 머지 후 그 브랜치로 배포
6. Deploy → 이후 push마다 자동 배포

## 산출물 설정 요약
- Build: `cd dashboard && npm run build`
- Output: `dashboard/dist`
- Install: `cd dashboard && npm install`
