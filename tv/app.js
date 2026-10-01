/* 뷰티파크 디스플레이 영상 만들기
 * 이미지 → 1920x1080 크로스페이드 슬라이드 영상. 전부 브라우저 안에서 처리한다(업로드 없음).
 * 캔버스에 실시간으로 그리면서 MediaRecorder로 녹화하므로 영상 길이만큼 시간이 걸린다.
 * 출력 포맷은 브라우저가 지원하는 것 중 mp4(H.264)를 우선 고른다 — TV·USB 재생 호환 때문.
 */
'use strict';

const $ = (id) => document.getElementById(id);
const slides = [];               // {file, name, img, url}
let busy = false, lastURL = null;

/* ---- 출력 포맷: mp4 우선, 없으면 webm ---- */
const MIMES = [
  'video/mp4;codecs=avc1.640028',
  'video/mp4;codecs=avc1.42E01E',
  'video/mp4',
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
];
function pickMime() {
  if (typeof MediaRecorder === 'undefined') return null;
  return MIMES.find((m) => { try { return MediaRecorder.isTypeSupported(m); } catch { return false; } }) || null;
}
const MIME = pickMime();
const EXT = MIME && MIME.startsWith('video/mp4') ? 'mp4' : 'webm';

/* ---- 파일명 자연 정렬 (01_, 02_ … 10_ 순서가 맞게) ---- */
const collator = new Intl.Collator('ko', { numeric: true, sensitivity: 'base' });

/* ---- 이미지 추가 ---- */
async function addFiles(fileList) {
  const files = [...fileList].filter((f) => f.type.startsWith('image/'));
  if (!files.length) return;
  files.sort((a, b) => collator.compare(a.name, b.name));
  for (const file of files) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((res, rej) => {
        const im = new Image();
        im.onload = () => res(im);
        im.onerror = () => rej(new Error(file.name));
        im.src = url;
      });
      slides.push({ file, name: file.name, img, url });
    } catch {
      URL.revokeObjectURL(url);
      alert(`이 파일은 이미지로 열리지 않습니다: ${file.name}`);
    }
  }
  render();
}

/* ---- 목록 그리기 ---- */
function render() {
  const list = $('list');
  list.innerHTML = '';
  slides.forEach((s, i) => {
    const li = document.createElement('li');

    const im = document.createElement('img');
    im.src = s.url; im.alt = '';
    li.appendChild(im);

    const meta = document.createElement('div');
    meta.className = 'meta';
    const b = document.createElement('b');
    b.textContent = `${i + 1}. ${s.name}`;
    const sp = document.createElement('span');
    sp.textContent = `${s.img.naturalWidth} × ${s.img.naturalHeight}`
      + (s.img.naturalWidth / s.img.naturalHeight < 1.7 ? ' · 좌우에 여백이 생깁니다' : '');
    meta.append(b, sp);
    li.appendChild(meta);

    const ops = document.createElement('div');
    ops.className = 'ops';
    ops.appendChild(mkBtn('↑', '위로', i === 0, () => move(i, -1)));
    ops.appendChild(mkBtn('↓', '아래로', i === slides.length - 1, () => move(i, 1)));
    ops.appendChild(mkBtn('×', '빼기', false, () => remove(i)));
    li.appendChild(ops);

    list.appendChild(li);
  });
  $('empty').hidden = slides.length > 0;
  $('go').disabled = slides.length === 0 || busy || !MIME;
  updateSpec();
}
function mkBtn(text, title, disabled, fn) {
  const b = document.createElement('button');
  b.type = 'button'; b.textContent = text; b.title = title;
  b.disabled = disabled || busy;
  b.addEventListener('click', fn);
  return b;
}
function move(i, d) {
  const j = i + d;
  if (j < 0 || j >= slides.length) return;
  [slides[i], slides[j]] = [slides[j], slides[i]];
  render();
}
function remove(i) {
  URL.revokeObjectURL(slides[i].url);
  slides.splice(i, 1);
  render();
}

/* ---- 설정 ---- */
const settings = () => {
  const [w, h] = $('size').value.split('x').map(Number);
  const sec = parseFloat($('sec').value);
  // 전환은 장당 노출의 40%까지만. 그래야 앞뒤 전환 사이에 포스터가 또렷하게 멈춰 있는 시간이 남는다.
  const fade = Math.min(parseFloat($('fade').value), fadeMax(sec));
  return { w, h, sec, fade, fps: 30 };
};
const totalSec = (n, sec, fade) => (n ? sec * n - fade * (n - 1) : 0);
const fadeMax = (sec) => Math.min(2, Math.round(sec * 0.4 * 10) / 10);

/* 장당 노출을 바꾸면 전환 슬라이더의 최대값도 따라 바뀐다 (범위 밖 값은 브라우저가 자동으로 끌어내림) */
function syncFadeMax() {
  $('fade').max = String(fadeMax(parseFloat($('sec').value)));
}

function updateSpec() {
  const { w, h, sec, fade } = settings();
  $('secOut').textContent = sec.toFixed(1) + '초';
  $('fadeOut').textContent = fade.toFixed(1) + '초';
  const t = totalSec(slides.length, sec, fade);
  $('spec').textContent = slides.length
    ? `이미지 ${slides.length}장 · ${w}×${h} · 30fps · 총 ${fmt(t)} · 만드는 데 약 ${fmt(t + 3)} 걸립니다 · ${EXT.toUpperCase()} 파일`
    : `이미지를 올리면 길이가 계산됩니다. 출력 형식: ${EXT.toUpperCase()}`;
}
function fmt(s) {
  const m = Math.floor(s / 60), r = Math.round(s % 60);
  return m ? `${m}분 ${r}초` : `${r}초`;
}

/* ---- 캔버스에 한 장 그리기 (비율 유지 · 레터박스) ---- */
function drawFit(ctx, img, W, H) {
  const s = Math.min(W / img.naturalWidth, H / img.naturalHeight);
  const w = img.naturalWidth * s, h = img.naturalHeight * s;
  ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
}

/* ---- 장마다 '검은 여백까지 포함한 완성 화면'을 미리 그려 두고, 그 두 장을 섞는다 ----
 * 이미지만 겹쳐 그리면 가로형 → 세로형으로 넘어갈 때 앞 장의 양옆이 페이드되지 않고 남았다가
 * 전환이 끝나는 순간 툭 꺼진다. 완성 화면끼리 섞으면 여백까지 함께 부드럽게 바뀐다.
 * 장은 앞으로만 넘어가므로 캔버스 2장만 돌려 쓴다(4K에서도 메모리 부담 없음). */
function makeFrames(W, H) {
  const cache = new Map();
  return (k) => {
    if (cache.has(k)) return cache.get(k);
    let c;
    if (cache.size >= 2) {
      const old = Math.min(...cache.keys());
      c = cache.get(old); cache.delete(old);
    } else {
      c = document.createElement('canvas'); c.width = W; c.height = H;
    }
    const x = c.getContext('2d', { alpha: false });
    x.imageSmoothingQuality = 'high';
    x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
    drawFit(x, slides[k].img, W, H);
    cache.set(k, c);
    return c;
  };
}

/* 천천히 시작해 천천히 끝나는 곡선. 직선으로 섞으면 시작·끝이 덜컥거려 보인다. */
const ease = (a) => (1 - Math.cos(Math.PI * a)) / 2;

/* ---- 영상 만들기 ---- */
async function build() {
  if (busy || !slides.length || !MIME) return;
  busy = true; render();
  hideError();
  $('go').hidden = true; $('done').hidden = true; $('prog').hidden = false;
  $('barFill').style.width = '0%';
  $('progText').textContent = '준비 중…';

  let stream = null, rec = null;
  try {
    const { w: W, h: H, sec, fade, fps } = settings();
    const n = slides.length, total = totalSec(n, sec, fade), step = sec - fade;

    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d', { alpha: false });
    const frame = makeFrames(W, H);

    /* 시각 t의 화면. 장 j는 j·step에 등장하기 시작해 fade초 동안 앞 장 위로 서서히 올라온다. */
    function paint(t) {
      let j = step > 0 ? Math.floor(t / step) : 0;
      j = Math.max(0, Math.min(j, n - 1));          // 범위 밖 장 번호는 절대 그리지 않는다
      if (fade > 0 && j >= 1 && t < j * step + fade) {
        ctx.globalAlpha = 1; ctx.drawImage(frame(j - 1), 0, 0);
        ctx.globalAlpha = ease((t - j * step) / fade); ctx.drawImage(frame(j), 0, 0);
        ctx.globalAlpha = 1;
      } else {
        ctx.drawImage(frame(j), 0, 0);
      }
    }

    stream = canvas.captureStream(fps);
    const bitrate = Math.round(W * H * fps * 0.11);   // 1080p30 ≈ 6.8Mbps
    try {
      rec = new MediaRecorder(stream, { mimeType: MIME, videoBitsPerSecond: bitrate });
    } catch {
      rec = new MediaRecorder(stream, { mimeType: MIME });
    }
    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    const stopped = new Promise((res) => { rec.onstop = res; });
    const recError = new Promise((_, rej) => { rec.onerror = (e) => rej(e.error || new Error('녹화기 오류')); });

    paint(0);   // 첫 장을 미리 그려 두고 시작 (검은 프레임 방지)
    rec.start(1000);

    /* 시작 시각은 '첫 프레임이 실제로 그려지는 순간'으로 잡는다.
     * requestAnimationFrame이 넘겨주는 시각은 호출 직전의 performance.now()보다 이를 수 있어서,
     * 미리 잡아 두면 경과 시간이 음수가 되고 −1번째 장을 그리려다 멈춘다(2026-10-01 실제 발생). */
    await Promise.race([recError, new Promise((done, fail) => {
      let t0 = null;
      function tick(now) {
        try {
          if (t0 === null) t0 = now;
          const t = (now - t0) / 1000;
          if (t >= total) { done(); return; }
          paint(t);
          const p = Math.min(t / total, 1);
          $('barFill').style.width = (p * 100).toFixed(1) + '%';
          $('progText').textContent = `만드는 중… ${Math.round(p * 100)}%  (남은 시간 약 ${fmt(Math.max(total - t, 0))})`;
          requestAnimationFrame(tick);
        } catch (err) { fail(err); }
      }
      requestAnimationFrame(tick);
    })]);

    // 마지막 장을 0.4초 더 유지해 TV 반복 재생 시 끝이 뚝 끊기지 않게 한다.
    // captureStream은 캔버스를 다시 그릴 때만 프레임을 내보내므로, 기다리는 동안에도 계속 그려야 길이가 늘어난다.
    await new Promise((done) => {
      const tEnd = performance.now() + 400;
      (function hold(now) {
        ctx.drawImage(frame(n - 1), 0, 0);
        if (now < tEnd) requestAnimationFrame(hold); else done();
      })(performance.now());
    });

    rec.stop();
    stream.getTracks().forEach((tr) => tr.stop());
    await stopped;

    const blob = new Blob(chunks, { type: MIME.split(';')[0] });
    if (!blob.size) throw new Error('녹화된 영상이 비어 있습니다');
    if (lastURL) URL.revokeObjectURL(lastURL);
    lastURL = URL.createObjectURL(blob);

    const base = ($('name').value || 'bp 디스플레이 영상').trim().replace(/[\\/:*?"<>|]/g, '');
    $('preview').src = lastURL;
    $('dl').href = lastURL;
    $('dl').download = `${base}.${EXT}`;
    $('doneInfo').textContent =
      `${base}.${EXT} · ${W}×${H} · ${fmt(total)} · ${(blob.size / 1048576).toFixed(1)} MB`;

    $('prog').hidden = true; $('done').hidden = false;
  } catch (err) {
    // 어떤 오류든 화면에 알리고 처음 상태로 되돌린다 — 다시는 진행 막대에서 조용히 멈추지 않게.
    console.error(err);
    try { if (rec && rec.state !== 'inactive') rec.stop(); } catch { /* 무시 */ }
    if (stream) stream.getTracks().forEach((tr) => tr.stop());
    $('prog').hidden = true; $('go').hidden = false;
    showError('영상을 만들다 멈췄습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요. '
      + '같은 일이 반복되면 이 문구를 캡처해 알려 주세요.<br><code>' + escapeHTML(String(err && err.message || err)) + '</code>');
  } finally {
    busy = false; render();
  }
}

function showError(html) { const el = $('err'); el.innerHTML = html; el.hidden = false; }
function hideError() { $('err').hidden = true; }
function escapeHTML(s) { return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

/* ---- 이벤트 연결 ---- */
$('pick').addEventListener('click', () => $('file').click());
$('file').addEventListener('change', (e) => { addFiles(e.target.files); e.target.value = ''; });

const drop = $('drop');
['dragenter', 'dragover'].forEach((ev) =>
  drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach((ev) =>
  drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', (e) => { if (e.dataTransfer?.files) addFiles(e.dataTransfer.files); });

$('sec').addEventListener('input', syncFadeMax);
['sec', 'fade', 'size'].forEach((id) => $(id).addEventListener('input', updateSpec));
$('go').addEventListener('click', build);
$('again').addEventListener('click', () => {
  $('done').hidden = true; $('go').hidden = false;
});

/* ---- 브라우저 지원 경고 ---- */
(function warn() {
  const el = $('warn');
  if (!MIME) {
    el.innerHTML = '이 브라우저는 영상 녹화(MediaRecorder)를 지원하지 않습니다. <b>Chrome</b>이나 <b>Edge</b> 최신 버전으로 열어 주세요.';
    el.hidden = false;
  } else if (MIME === 'video/mp4') {
    el.innerHTML = '이 브라우저는 MP4 안의 영상 방식을 H.264로 정하지 못합니다. TV에서 재생되지 않으면 '
      + '<b>Chrome 최신 버전</b>으로 다시 만들어 주세요.';
    el.hidden = false;
  } else if (EXT === 'webm') {
    el.innerHTML = '이 브라우저에서는 <b>WEBM</b>으로 저장됩니다. TV·USB 플레이어는 보통 MP4만 읽으므로, '
      + 'MP4가 필요하면 <b>Chrome 최신 버전</b>으로 열어 주세요.';
    el.hidden = false;
  }
})();

syncFadeMax();
updateSpec();
