// Add a body-composition scan: upload the PDF your scanner's app gives you
// (Evolt Active, InBody, DEXA), a photo of the printout, or type it in.
// Whatever is read is shown for you to check before it's saved.
import { useState, useEffect } from 'preact/hooks';
import { html, NumInput, Icon, kgTo, toKg, fmt } from './kit.js';
import { dateKey } from '../engine.js';
import { aiCaps, readScan, readScanDoc, aiErrorText } from '../ai.js';
import { isWeb } from '../env.js';

/* global __WEB__ */
const loadPdf = () => (__WEB__ ? import('../scanpdf.js') : Promise.reject(new Error('unavailable')));

const EMPTY = (w) => ({ date: dateKey(), weightKg: w || null, bf: null, leanKg: null, fatKg: null, smmKg: null, visceral: null, bmr: null, device: '' });

export function ScanReader({ units, onAdd, defaultWeight }) {
  const u = units?.w || 'kg';
  const [mode, setMode] = useState('idle'); // idle | reading | review
  const [f, setF] = useState(EMPTY(defaultWeight));
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const [ai, setAi] = useState({ images: false, provider: null });
  useEffect(() => { aiCaps().then(setAi); }, []);
  const set = (p) => setF((x) => ({ ...x, ...p }));
  const take = (r, msg) => {
    set({ date: r.date || dateKey(), weightKg: r.weightKg || defaultWeight || null, bf: r.bf ?? null, leanKg: r.leanKg ?? null, fatKg: r.fatKg ?? null, smmKg: r.smmKg ?? null, visceral: r.visceral ?? null, bmr: r.bmr ?? null, device: r.device || '' });
    setNote(msg); setMode('review');
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setErr(''); setNote(''); setMode('reading');
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '');
    try {
      if (isPdf) {
        let r = null;
        try { r = await (await loadPdf()).readScanPdf(file); } catch { r = null; }
        if (r && (r.confidence === 'high' || r.confidence === 'medium')) {
          return take(r, `Read from your ${r.device || 'scan'} report on this phone. Check each number against the report, then save.`);
        }
        if (ai.provider === 'api') {
          const c = await readScanDoc(file);
          return take(c, `Read by Claude from your ${c.device || 'scan'} report. Check each number, then save.`);
        }
        if (r && r.confidence === 'low') return take(r, "Some numbers didn't add up, so check them carefully against the report.");
        setErr(r?.hasText === false
          ? "This PDF is an image without text, so the numbers can't be read on the phone. Type them in from page 1 below, or add an Anthropic API key in settings to have Claude read it."
          : "Couldn't find body-fat numbers in this PDF. Type them in below.");
        return take(EMPTY(defaultWeight), '');
      }
      if (ai.images) {
        const r = await readScan(file);
        if (!r.bf && !r.leanKg) setErr('No body-fat or lean-mass number found in the photo. Check it shows the results, or type them in.');
        return take(r, 'Read from your photo. Check each number against the report, then save.');
      }
      setErr("Photos can be read once AI is on. For now, type the numbers in below, or upload the report's PDF.");
      take(EMPTY(defaultWeight), '');
    } catch (x) { setErr(aiErrorText(x)); take(EMPTY(defaultWeight), ''); }
  };

  const derivedLean = !f.leanKg && f.weightKg && (f.bf || f.fatKg) ? (f.fatKg ? f.weightKg - f.fatKg : f.weightKg * (1 - f.bf / 100)) : null;
  const derivedBf = !f.bf && f.weightKg && (f.leanKg || f.fatKg) ? (f.fatKg ? (f.fatKg / f.weightKg) * 100 : (1 - f.leanKg / f.weightKg) * 100) : null;
  const bf = f.bf || derivedBf, lean = f.leanKg || derivedLean;
  const valid = (bf > 2 && bf < 70) || lean > 20;
  const save = () => {
    const src = /dexa|dxa/i.test(f.device) ? 'dexa' : f.device ? 'bia' : 'manual';
    onAdd({ date: f.date, bf: bf ? +(+bf).toFixed(1) : null, leanKg: lean ? +(+lean).toFixed(1) : null, weightKg: f.weightKg || null, fatKg: f.fatKg || null,
      smmKg: f.smmKg || null, visceral: f.visceral || null, bmr: f.bmr || null, device: f.device || '', src });
    setMode('idle'); setNote(''); setErr(''); setF(EMPTY(defaultWeight));
  };
  const mass = (id, label, key) => html`<div class="field"><label for=${id}>${label}</label><${NumInput} id=${id} value=${f[key] ? +kgTo(f[key], u).toFixed(1) : null} unit=${u} onValue=${(v) => set({ [key]: v ? toKg(v, u) : null })} /></div>`;

  return html`<div class="col">
    <div class="row wrap">
      <label class="btn sm"><${Icon} n="upload" cls="sm" />${mode === 'reading' ? 'Reading…' : isWeb ? 'Upload scan (PDF or photo)' : 'Upload a photo of it'}
        <input type="file" accept=${isWeb ? 'application/pdf,image/*' : 'image/*'} hidden onChange=${onFile} /></label>
      ${mode !== 'review' && html`<button class="btn sm ghost" onClick=${() => { setF(EMPTY(defaultWeight)); setNote(''); setMode('review'); }}>Type it in</button>`}
    </div>
    ${isWeb && mode === 'idle' && html`<span class="hint">From Evolt Active (or your gym's scan email), save the report PDF to Files, then upload it here. It's read on your phone; nothing is sent anywhere.</span>`}
    ${err && html`<span class="err">${err}</span>`}
    ${note && html`<span class="small" style="color:var(--good)">${note}</span>`}
    ${mode === 'review' && html`<div class="col">
      <div class="grid2">
        <div class="field"><label for="sc-date">Scan date</label><input id="sc-date" class="input" type="date" value=${f.date} max=${dateKey()} onInput=${(e) => set({ date: e.target.value })} /></div>
        ${mass('sc-w', 'Weight', 'weightKg')}
        <div class="field"><label for="sc-bf">Body fat</label><${NumInput} id="sc-bf" value=${f.bf} unit="%" placeholder=${derivedBf ? fmt(derivedBf, 1) : ''} onValue=${(v) => set({ bf: v })} /></div>
        ${mass('sc-fat', 'Fat mass', 'fatKg')}
        ${mass('sc-lean', 'Lean body mass', 'leanKg')}
        ${mass('sc-smm', 'Skeletal muscle', 'smmKg')}
        <div class="field"><label for="sc-vis">Visceral fat</label><${NumInput} id="sc-vis" value=${f.visceral} onValue=${(v) => set({ visceral: v })} /></div>
        <div class="field"><label for="sc-bmr">BMR</label><${NumInput} id="sc-bmr" value=${f.bmr} unit="kcal" onValue=${(v) => set({ bmr: v })} /></div>
      </div>
      <span class="hint">Body fat % or lean body mass is enough; the rest is tracked over time.${derivedLean ? ` Lean mass works out to ${fmt(kgTo(derivedLean, u), 1)} ${u}.` : ''}</span>
      <div class="row"><button class="btn grow" disabled=${!valid} onClick=${save}>Save scan</button><button class="btn ghost" onClick=${() => { setMode('idle'); setNote(''); setErr(''); }}>Cancel</button></div>
    </div>`}
  </div>`;
}
