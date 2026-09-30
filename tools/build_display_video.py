#!/usr/bin/env python3
"""원내 디스플레이(대기실 TV) 재생용 영상 생성기.

에이전시에서 받은 **1920×1080 이벤트 이미지 여러 장**을 한 장씩 넘어가는 슬라이드 영상으로 만든다.
원내 디스플레이·토스 단말기에서 USB로 바로 재생할 수 있게 mp4(H.264)와 3gp(MPEG-4 Part 2)를 함께 뽑는다.

사용법:
    python3 tools/build_display_video.py <이미지폴더> <출력이름> [--sec 6] [--fade 0.8] [--only mp4|3gp]

예:
    python3 tools/build_display_video.py ~/uploads/10월포스터 "10 bp 디스플레이 영상"
    → "10 bp 디스플레이 영상.mp4" + "10 bp 디스플레이 영상.3gp"

이미지는 **파일명 순서**대로 재생된다. 순서를 정하려면 `01_`, `02_` 처럼 번호를 붙여 둘 것.
1920×1080이 아닌 이미지는 비율을 유지한 채 letterbox(검은 여백)로 맞춘다 — 잘리지 않는다.

주의:
- 3gp는 구형 디스플레이 호환용이다. 기기가 mp4를 읽으면 mp4를 쓰는 편이 화질·용량 모두 유리하다.
- 무음 영상이다(원내 디스플레이는 보통 음소거). 음악이 필요하면 별도 요청.
"""
import argparse
import os
import shutil
import subprocess
import sys

EXTS = (".jpg", ".jpeg", ".png", ".webp", ".bmp")
W, H, FPS = 1920, 1080, 30
GP_W, GP_H = 640, 360  # 3gp 출력 해상도 (구형 디스플레이 호환용)


def ffmpeg_bin() -> str:
    for c in (shutil.which("ffmpeg"), os.path.expanduser("~/bin/ffmpeg")):
        if c and os.path.exists(c):
            return c
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        sys.exit("ffmpeg을 찾을 수 없다. `pip install imageio-ffmpeg` 후 다시 실행할 것.")


def collect(src: str) -> list[str]:
    if not os.path.isdir(src):
        sys.exit(f"폴더가 아니다: {src}")
    files = sorted(f for f in os.listdir(src) if f.lower().endswith(EXTS))
    if not files:
        sys.exit(f"이미지가 없다: {src} (지원 확장자 {', '.join(EXTS)})")
    return [os.path.join(src, f) for f in files]


def build_filter(n: int, sec: float, fade: float) -> str:
    """각 이미지를 1920x1080 레터박스로 맞추고 크로스페이드로 이어 붙인다."""
    # 입력에서 이미 `-loop 1 -framerate FPS -t sec`으로 길이를 줬으므로 여기서는 크기만 맞춘다.
    # xfade는 입력이 고정 프레임레이트여야 한다. `fps`를 반드시 체인 **마지막**에 둘 것 —
    # `fps` 뒤에 `setpts`를 붙이면 프레임레이트 정보가 사라져 "current rate of 1/0" 오류가 난다.
    parts = [
        f"[{i}:v]scale={W}:{H}:force_original_aspect_ratio=decrease,"
        f"pad={W}:{H}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,format=yuv420p,"
        f"setpts=PTS-STARTPTS,fps={FPS}[v{i}]"
        for i in range(n)
    ]
    if n == 1:
        return ";".join(parts) + ";[v0]null[out]"
    cur, off = "v0", sec - fade
    for i in range(1, n):
        nxt = "out" if i == n - 1 else f"x{i}"
        parts.append(f"[{cur}][v{i}]xfade=transition=fade:duration={fade:.3f}:offset={off:.3f}[{nxt}]")
        cur, off = nxt, off + sec - fade
    return ";".join(parts)


def encode(ff: str, imgs: list[str], out: str, fmt: str, sec: float, fade: float) -> str:
    cmd = [ff, "-y", "-hide_banner", "-loglevel", "error"]
    for p in imgs:
        cmd += ["-loop", "1", "-framerate", str(FPS), "-t", f"{sec:.3f}", "-i", p]
    graph = build_filter(len(imgs), sec, fade)
    if fmt == "mp4":
        # 복합 필터그래프를 쓸 때는 -vf(단순 필터)를 함께 못 쓴다. 크기 조정도 그래프 안에서 한다.
        cmd += ["-filter_complex", graph, "-map", "[out]", "-an", "-r", str(FPS),
                "-c:v", "libx264", "-preset", "medium", "-crf", "20",
                "-pix_fmt", "yuv420p", "-profile:v", "high", "-level", "4.0",
                "-movflags", "+faststart", f"{out}.mp4"]
        path = f"{out}.mp4"
    else:  # 3gp — 구형 디스플레이 호환. MPEG-4 Part 2, 해상도를 낮춰 재생 부담을 줄인다.
        cmd += ["-filter_complex", f"{graph};[out]scale={GP_W}:{GP_H}[outs]",
                "-map", "[outs]", "-an", "-r", str(FPS),
                "-c:v", "mpeg4", "-b:v", "1500k", "-pix_fmt", "yuv420p",
                "-f", "3gp", f"{out}.3gp"]
        path = f"{out}.3gp"
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit(f"{fmt} 인코딩 실패:\n{r.stderr[-1500:]}")
    return path


def main() -> None:
    ap = argparse.ArgumentParser(description="원내 디스플레이용 슬라이드 영상 생성")
    ap.add_argument("src", help="이미지 폴더 (파일명 순서대로 재생)")
    ap.add_argument("out", help="출력 파일 이름 (확장자 제외)")
    ap.add_argument("--sec", type=float, default=6.0, help="장당 노출 시간(초), 기본 6")
    ap.add_argument("--fade", type=float, default=0.8, help="전환 페이드(초), 기본 0.8")
    ap.add_argument("--only", choices=["mp4", "3gp"], help="한 포맷만 생성")
    a = ap.parse_args()
    if a.fade >= a.sec:
        sys.exit("--fade는 --sec보다 작아야 한다.")

    ff, imgs = ffmpeg_bin(), collect(a.src)
    total = a.sec * len(imgs) - a.fade * (len(imgs) - 1)
    print(f"이미지 {len(imgs)}장 · 장당 {a.sec}초 · 페이드 {a.fade}초 → 총 {total:.1f}초")
    for i, p in enumerate(imgs, 1):
        print(f"  {i:2}. {os.path.basename(p)}")
    for fmt in (["mp4", "3gp"] if not a.only else [a.only]):
        path = encode(ff, imgs, a.out, fmt, a.sec, a.fade)
        print(f"saved: {path}  ({os.path.getsize(path)/1048576:.1f} MB)")


if __name__ == "__main__":
    main()
