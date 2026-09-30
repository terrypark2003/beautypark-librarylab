# beautypark-tv — 디스플레이 영상 만들기

이벤트 포스터 이미지를 올리면 대기실 TV·토스 단말기에서 재생할 **1920×1080 슬라이드 영상(mp4)** 으로 만들어 내려받게 하는 웹 도구.
배포 주소: **https://beautypark-tv.vercel.app**

## 동작 방식

- **전부 브라우저 안에서 처리**한다. 이미지가 서버로 올라가지 않는다(업로드 API 없음 · 정적 사이트).
- 캔버스(1920×1080)에 포스터를 비율 유지·레터박스로 그리고, 크로스페이드로 넘기면서 `MediaRecorder`로 녹화한다.
- 출력 포맷은 브라우저가 지원하는 것 중 **mp4(H.264)를 우선** 고른다. TV·USB 플레이어가 대개 mp4만 읽기 때문.
  Chrome·Edge·Safari 최신판은 mp4, Firefox 등은 webm이 나오며 이때 화면에 경고를 띄운다.
- 실시간 녹화라 **영상 길이만큼 시간이 걸린다**(8장 × 6초 ≈ 45초). 그동안 탭을 앞에 둬야 한다 —
  백그라운드 탭은 브라우저가 그리기를 멈춰 영상이 끊긴다.

## 파일

| 파일 | 역할 |
| --- | --- |
| `index.html` | 화면 (이미지 올리기 → 설정 → 만들기) |
| `app.js` | 정렬·순서 변경·렌더링·녹화·다운로드 |
| `style.css` | 브랜드 팔레트(웜 토프 #8C7E6E · 아이보리 #F7F4EF) |
| `vercel.json` | 정적 호스팅 헤더 |

빌드 단계가 없다. Vercel 프로젝트의 **Root Directory = `tv`**, Framework = Other로 두면 그대로 배포된다.

## 배포 절차 (최초 1회 · Vercel 대시보드에서 직접)

Claude의 Vercel 연결 계정에는 팀 프로젝트 **생성 권한이 없다**(2026-09-30 `create project` 403). 사람이 한 번 만들어야 한다.

1. vercel.com → 팀 `bpconsultation2025-6801s-projects` → **Add New → Project**
2. `terrypark2003/beautypark-librarylab` **Import**
3. Project Name **`beautypark-tv`** → 주소가 `beautypark-tv.vercel.app`이 된다
4. Root Directory **Edit → `tv`** 선택
5. Framework Preset **Other** · Build/Output 설정은 비워 둔다
6. **Deploy**
7. ⚠️ **Settings → Deployment Protection → Vercel Authentication을 "Only Preview Deployments"(또는 끔)로.**
   기본값이 전체 보호면 직원이 Vercel 로그인 벽에 막힌다(대시보드 `beautypark-librarylab`이 지금 그 상태).
   이 페이지에는 병원 데이터가 전혀 없어서(가격·이벤트·고객 정보 없음, 이미지도 서버로 안 감) 공개해도 된다.

이후 main에 `tv/`가 바뀌면 자동 재배포된다.

## 로컬에서 확인

```bash
python3 -m http.server 8899 --directory tv   # → http://127.0.0.1:8899
```

## 파이썬 도구와의 관계

같은 결과를 서버/터미널에서 뽑으려면 `tools/build_display_video.py`(ffmpeg)를 쓴다 — 3gp가 필요하거나 여러 달치를 한꺼번에 만들 때.
웹 도구는 직원이 설치 없이 쓰는 용도다. 두 도구의 타임라인 계산(총 길이 = 장당 × n − 페이드 × (n−1))은 같다.

## 알아둘 것

- `.btn`의 `display:inline-block`이 `[hidden]`을 덮어써서 숨긴 버튼이 계속 보이던 버그가 있었다 → `[hidden]{display:none!important}`로 해결.
- `canvas.captureStream()`은 캔버스를 **다시 그릴 때만** 프레임을 내보낸다. 끝부분 0.4초 유지도 매 프레임 다시 그려야 실제 길이가 늘어난다.
