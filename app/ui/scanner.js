// Full-screen barcode scanner. Live camera where allowed, a still photo or
// typed digits otherwise. Calls onCode(code) once with a validated barcode.
import { useEffect, useRef, useState } from 'preact/hooks';
import { html, Icon } from './kit.js';

let decoderPromise = null;
/* global __WEB__ */
const loadDecoder = () => {
  if (!__WEB__) return Promise.reject(new Error('unavailable'));
  decoderPromise ||= import('../barcode.js').then(async (m) => ({ decoder: await m.createDecoder(), valid: m.validBarcode }));
  return decoderPromise;
};

export function Scanner({ onCode, onClose }) {
  const video = useRef(); const canvas = useRef();
  const [status, setStatus] = useState('starting'); // starting | live | denied | unsupported
  const [typed, setTyped] = useState('');
  const [msg, setMsg] = useState('');
  const done = useRef(false);

  const finish = (code) => {
    if (done.current) return;
    done.current = true;
    navigator.vibrate?.(60);
    onCode(code);
  };

  useEffect(() => {
    let stream, timer, cancelled = false;
    (async () => {
      let dec;
      try { dec = await loadDecoder(); } catch { setStatus('unsupported'); return; }
      if (!navigator.mediaDevices?.getUserMedia) { setStatus('unsupported'); return; }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      } catch { setStatus('denied'); return; }
      if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
      const v = video.current;
      v.srcObject = stream; v.setAttribute('playsinline', ''); v.muted = true;
      await v.play().catch(() => {});
      setStatus('live');
      const cv = canvas.current;
      const tick = async () => {
        if (cancelled || done.current) return;
        if (v.videoWidth) {
          // Decode the middle band, where people aim; it is faster and avoids stray codes.
          const w = Math.min(v.videoWidth, 960); const s = w / v.videoWidth;
          const h = Math.round(v.videoHeight * s * 0.5);
          cv.width = w; cv.height = h;
          cv.getContext('2d', { willReadFrequently: true }).drawImage(v, 0, v.videoHeight * 0.25, v.videoWidth, v.videoHeight * 0.5, 0, 0, w, h);
          const code = await dec.decoder.decode(cv).catch(() => null);
          if (code && dec.valid(code)) return finish(code);
        }
        timer = setTimeout(tick, dec.decoder.native ? 120 : 160);
      };
      tick();
    })();
    return () => { cancelled = true; clearTimeout(timer); stream?.getTracks().forEach((t) => t.stop()); };
  }, []);

  const fromPhoto = async (e) => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    setMsg('Reading the photo…');
    try {
      const dec = await loadDecoder();
      const bmp = await createImageBitmap(file);
      const cv = canvas.current; const s = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
      cv.width = Math.round(bmp.width * s); cv.height = Math.round(bmp.height * s);
      cv.getContext('2d', { willReadFrequently: true }).drawImage(bmp, 0, 0, cv.width, cv.height);
      const code = await dec.decoder.decode(cv);
      if (code && dec.valid(code)) finish(code);
      else setMsg('No barcode found. Get closer so the stripes fill the frame, or type the numbers.');
    } catch { setMsg('That photo could not be read. Type the numbers under the barcode instead.'); }
  };

  const digits = typed.replace(/\D/g, '');
  return html`<div class="scanner" role="dialog" aria-modal="true" aria-label="Scan a barcode">
    <video ref=${video} class="scanner-video" playsinline muted></video>
    <canvas ref=${canvas} hidden></canvas>
    <div class="scanner-top"><span>Scan a barcode</span><button class="icon-btn solid" onClick=${onClose} aria-label="Close"><${Icon} n="x" /></button></div>
    ${status === 'live' && html`<div class="scanner-frame" aria-hidden="true"><i></i></div>`}
    <div class="scanner-bottom">
      ${status === 'starting' && html`<span>Starting the camera…</span>`}
      ${status === 'live' && html`<span>Line the barcode up inside the frame.</span>`}
      ${status === 'denied' && html`<span>Camera access is off. Allow it in Settings → Safari → Camera, or use a photo or the numbers below.</span>`}
      ${status === 'unsupported' && html`<span>Live scanning isn't available here. Use a photo or type the numbers.</span>`}
      ${msg && html`<span>${msg}</span>`}
      <form class="row" onSubmit=${(e) => { e.preventDefault(); if (digits.length >= 8) finish(digits); }}>
        <input id="bc-typed" class="input grow" inputmode="numeric" placeholder="Or type the numbers" value=${typed} onInput=${(e) => setTyped(e.target.value)} />
        <button class="btn" disabled=${digits.length < 8}>Look up</button>
      </form>
      <label class="btn ghost block" style="color:#fff;border-color:rgba(255,255,255,.4)"><${Icon} n="camera" cls="sm" />Use a photo<input type="file" accept="image/*" capture="environment" hidden onChange=${fromPhoto} /></label>
    </div>
  </div>`;
}
