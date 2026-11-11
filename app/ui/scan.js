// Enter a body-composition scan by hand, or let Claude read the printout.
import { useState, useEffect } from 'preact/hooks';
import { html, NumInput, Icon, kgTo, toKg, fmt } from './kit.js';
import { dateKey } from '../engine.js';
import { aiCaps, readScan, aiErrorText } from '../ai.js';

export function ScanReader({ units, onAdd, defaultWeight }) {
  const u = units?.w || 'kg';
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ date: dateKey(), bf: null, leanKg: null, weightKg: defaultWeight || null, smmKg: null, visceral: null, device: '' });
  const [ai, setAi] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { aiCaps().then((c) => setAi(c.images)); }, []);
  const set = (p) => setF((x) => ({ ...x, ...p }));

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true); setErr(''); setOpen(true);
    try {
      const r = await readScan(file);
      set({ date: r.date || f.date, bf: r.bf, leanKg: r.leanKg, weightKg: r.weightKg || f.weightKg, smmKg: r.smmKg, visceral: r.visceral, device: r.device });
      if (!r.bf && !r.leanKg) setErr('No body-fat or lean-mass number found. Check the photo shows the results table, or type them in.');
    } catch (x) { setErr(aiErrorText(x)); }
    setBusy(false);
  };

  const valid = (f.bf > 2 && f.bf < 70) || f.leanKg > 20;
  const save = () => {
    const src = /dexa|dxa/i.test(f.device) ? 'dexa' : f.device ? 'bia' : 'manual';
    onAdd({ date: f.date, bf: f.bf || null, leanKg: f.leanKg || null, weightKg: f.weightKg || null, smmKg: f.smmKg || null, visceral: f.visceral || null, device: f.device || '', src });
    setOpen(false);
    setF({ date: dateKey(), bf: null, leanKg: null, weightKg: defaultWeight || null, smmKg: null, visceral: null, device: '' });
  };

  return html`<div class="col">
    <div class="row wrap">
      ${ai && html`<label class="btn sm"><${Icon} n="camera" cls="sm" />${busy ? 'Reading…' : 'Read a photo of it'}<input type="file" accept="image/*" hidden onChange=${onFile} /></label>`}
      <button class=${`btn sm ${ai ? 'ghost' : ''}`} onClick=${() => setOpen(!open)}>${open ? 'Hide' : 'Type it in'}</button>
    </div>
    ${err && html`<span class="err">${err}</span>`}
    ${open && html`<div class="col">
      <div class="grid2">
        <div class="field"><label for="sc-date">Scan date</label><input id="sc-date" class="input" type="date" value=${f.date} max=${dateKey()} onInput=${(e) => set({ date: e.target.value })} /></div>
        <div class="field"><label for="sc-w">Weight on scan</label><${NumInput} id="sc-w" value=${f.weightKg ? +kgTo(f.weightKg, u).toFixed(1) : null} unit=${u} onValue=${(v) => set({ weightKg: v ? toKg(v, u) : null })} /></div>
        <div class="field"><label for="sc-bf">Body fat</label><${NumInput} id="sc-bf" value=${f.bf} unit="%" onValue=${(v) => set({ bf: v })} /></div>
        <div class="field"><label for="sc-lean">Lean mass</label><${NumInput} id="sc-lean" value=${f.leanKg ? +kgTo(f.leanKg, u).toFixed(1) : null} unit=${u} onValue=${(v) => set({ leanKg: v ? toKg(v, u) : null })} /></div>
        <div class="field"><label for="sc-smm">Skeletal muscle (optional)</label><${NumInput} id="sc-smm" value=${f.smmKg ? +kgTo(f.smmKg, u).toFixed(1) : null} unit=${u} onValue=${(v) => set({ smmKg: v ? toKg(v, u) : null })} /></div>
        <div class="field"><label for="sc-vis">Visceral fat (optional)</label><${NumInput} id="sc-vis" value=${f.visceral} onValue=${(v) => set({ visceral: v })} /></div>
      </div>
      <span class="hint">Lean mass is fat-free mass (weight minus fat). If your report shows only body fat %, that is enough.${f.bf && f.weightKg && !f.leanKg ? ` That works out to ${fmt(kgTo(f.weightKg * (1 - f.bf / 100), u), 1)} ${u} lean.` : ''}</span>
      <button class="btn block" disabled=${!valid} onClick=${save}>Save scan</button>
    </div>`}
  </div>`;
}
