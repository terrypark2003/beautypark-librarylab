# 캔바(Canva) 연동 설정 가이드

이 앱은 캔바 **Connect API**(OAuth 2.0 + PKCE)로 사용자의 캔바 계정에 연결합니다.
연결되면 포스터마다 **「↗ 캔바에서 편집」** 버튼이 생겨, 만든 포스터를 캔바 디자인으로
바로 만들어 새 탭에서 이어 편집할 수 있습니다.

> 보안: Client Secret과 토큰은 **서버(Vercel 서버리스 함수)** 에서만 다루며,
> 토큰은 암호화된 httpOnly 쿠키에 보관됩니다. 브라우저 코드에는 노출되지 않습니다.
> 환경변수가 설정되기 전에는 화면에 캔바 버튼이 **아예 보이지 않습니다**(현재 UX 영향 0).

---

## 1단계 — 캔바 개발자 앱(Integration) 만들기

1. https://www.canva.com/developers/integrations/connect-api 접속 → **Create an integration**
2. **Integration type**: *Public* 또는 *Private*(내부 사용이면 Private 권장) 선택, 이름 입력 (예: `뷰티파크 라이브러리랩`)
3. **Scopes(권한)** — 아래 4개를 켭니다:
   - `profile:read`
   - `asset:write`
   - `design:content:write`
   - `design:meta:read`
4. **Redirect URLs(리다이렉트 URL)** 에 아래를 **정확히** 추가:
   ```
   https://beautypark-librarylab.vercel.app/api/canva/callback
   ```
   > 자체 도메인을 쓰면 그 도메인으로 바꿔 추가하세요. (프리뷰 배포 URL은 매번 바뀌므로,
   > 테스트는 위 프로덕션 도메인에서 하는 걸 권장합니다.)
5. **Client ID** 복사, **Generate secret** 으로 **Client Secret** 생성 후 복사
   (Secret은 한 번만 표시되니 안전한 곳에 보관).

---

## 2단계 — Vercel 환경변수 등록

Vercel → 프로젝트 `beautypark-librarylab` → **Settings → Environment Variables** 에서
아래를 **Production(및 Preview)** 환경에 추가합니다.

| 이름 | 값 |
| --- | --- |
| `CANVA_CLIENT_ID` | 1단계에서 복사한 Client ID |
| `CANVA_CLIENT_SECRET` | 1단계에서 생성한 Client Secret |
| `CANVA_REDIRECT_URI` | `https://beautypark-librarylab.vercel.app/api/canva/callback` |
| `CANVA_SESSION_SECRET` | 아무 긴 랜덤 문자열 (쿠키 암호화 키, 예: 40자 이상) |

> `CANVA_SESSION_SECRET`을 비워두면 자동으로 `CANVA_CLIENT_SECRET`을 키로 사용하지만,
> 별도 값을 넣는 것을 권장합니다. 터미널에서 `openssl rand -hex 32` 로 만들 수 있어요.

저장 후 **Redeploy**(재배포) 합니다.

---

## 3단계 — 사용

1. https://beautypark-librarylab.vercel.app 접속 → 디자인 탭 상단의 **「캔바 연결」** 클릭
2. 캔바 로그인/권한 동의 → 앱으로 돌아오면 상단에 **「캔바 · {이름} ✓」** 표시
3. 각 포스터 카드의 **「↗ 캔바에서 편집 (디자인 생성)」** 클릭 →
   포스터가 캔바 디자인으로 생성되고 **새 탭에서 편집** 화면이 열립니다.

---

## 문제 해결

- **연결 직후 "state 불일치"**: 1단계의 Redirect URL과 `CANVA_REDIRECT_URI`가 글자 하나까지
  동일한지 확인(끝 슬래시 포함 주의).
- **authorize 화면에서 권한 오류**: 1단계 Scopes 4개가 모두 켜져 있는지 확인.
- **"에셋 업로드 4xx"**: 토큰 만료/스코프 누락 → 「해제」 후 다시 「캔바 연결」.
- **버튼이 안 보임**: 환경변수 4개가 Production에 등록되고 재배포됐는지 확인
  (`/api/canva/status` 가 `{"configured":true}` 를 반환해야 함).

---

## 2단계 확장(선택) — 브랜드 템플릿 자동완성(Autofill)

엑셀 데이터를 **캔바 브랜드 템플릿에 자동으로 채워** 포스터를 대량 생성하는 기능입니다.
다음이 필요합니다:

- **캔바 유료 플랜**(Pro/Teams) — 브랜드 템플릿 기능은 유료 전용
- 추가 Scope: `brandtemplate:meta:read`, `brandtemplate:content:read`
- 캔바에서 데이터 필드가 정의된 **브랜드 템플릿** 제작

이 단계는 위 기본 연동이 동작하는 것을 확인한 뒤 별도로 진행합니다
(`/api/canva/autofill` 엔드포인트 추가 예정).
