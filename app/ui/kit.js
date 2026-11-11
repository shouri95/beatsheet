// Shared UI pieces: hooks, icons, formatting, sheets, toasts, the plate ring.
import { h } from 'preact';
import { useEffect, useState, useRef } from 'preact/hooks';
import htm from 'htm';
import { state, subscribe, getVersion } from '../store.js';
import { KG_PER_LB } from '../engine.js';

export const html = htm.bind(h);

export function useStore() {
  const [, set] = useState(0);
  const seen = useRef(getVersion());
  seen.current = getVersion();
  useEffect(() => {
    const off = subscribe(() => set((n) => n + 1));
    // Catch a change that landed between this render and subscribing.
    if (getVersion() !== seen.current) set((n) => n + 1);
    return off;
  }, []);
  return state;
}

/* ───────────── transient UI state (sheets, toasts) ───────────── */
const ui = { sheet: null, toast: null };
const uiSubs = new Set();
const uiEmit = () => uiSubs.forEach((f) => f());
export function useUI() {
  const [, set] = useState(0);
  useEffect(() => { const f = () => set((n) => n + 1); uiSubs.add(f); return () => uiSubs.delete(f); }, []);
  return ui;
}
export function openSheet(name, props = {}) { ui.sheet = { name, props, key: Date.now() }; uiEmit(); }
export function closeSheet() { ui.sheet = null; uiEmit(); }
let toastTimer = 0;
export function toast(text, action) {
  clearTimeout(toastTimer);
  ui.toast = { text, action, key: Date.now() };
  uiEmit();
  toastTimer = setTimeout(() => { ui.toast = null; uiEmit(); }, action ? 5000 : 2600);
}

/* ───────────── units & numbers ───────────── */
export const unitW = (p) => p?.units?.w || 'kg';
export const kgTo = (kg, u) => (u === 'lb' ? kg / KG_PER_LB : kg);
export const toKg = (v, u) => (u === 'lb' ? v * KG_PER_LB : v);
export const fmt = (x, d = 0) => (x == null || !Number.isFinite(+x) ? '–' : (+x).toLocaleString(undefined, { maximumFractionDigits: d, minimumFractionDigits: d }));
export const fmtW = (kg, u, d = 1) => `${fmt(kgTo(kg, u), d)} ${u}`;
export const signed = (x, d = 1) => (x > 0 ? '+' : x < 0 ? '−' : '') + fmt(Math.abs(x), d);
export function fmtHeight(cm, units) {
  if (units?.h === 'in') { const t = cm / 2.54; let ft = Math.floor(t / 12); let inch = Math.round(t - ft * 12); if (inch === 12) { ft++; inch = 0; } return `${ft}′${inch}″`; }
  return `${Math.round(cm)} cm`;
}
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const dayName = (k) => DAYS[new Date(k + 'T12:00:00').getDay()];
export const shortDate = (k) => { const d = new Date(k + 'T12:00:00'); return `${d.getDate()} ${MONTHS[d.getMonth()]}`; };
export const fullDate = (k) => { const d = new Date(k + 'T12:00:00'); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
export const longDate = (k) => { const d = new Date(k + 'T12:00:00'); return `${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`; };
export const parseNum = (s) => { const v = parseFloat(String(s).replace(',', '.')); return Number.isFinite(v) ? v : null; };

/* ───────────── icons ───────────── */
const P = {
  plus: 'M12 5v14M5 12h14', check: 'M5 12.5l4.5 4.5L19 7.5', x: 'M6 6l12 12M18 6L6 18', back: 'M15 5l-7 7 7 7', next: 'M9 5l7 7-7 7',
  today: 'M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z',
  train: 'M3 10v4M6.5 7v10M17.5 7v10M21 10v4M6.5 12h11',
  progress: 'M4 19V5M4 19h16M8 15l3.5-4 3 2.5L20 7',
  coach: 'M12 3l1.9 4.6L18.5 9l-3.6 3.1 1.1 4.9L12 14.5 8 17l1.1-4.9L5.5 9l4.6-1.4z',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-3.5-3.5', camera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6', text: 'M5 6h14M5 11h14M5 16h9',
  label: 'M5 4h14v16H5zM8 8h8M8 12h8M8 16h5', bolt: 'M13 3L5 14h6l-1 7 8-11h-6z', flame: 'M12 21c4 0 7-2.7 7-6.6 0-3.5-2.6-5.6-4-8.4-.6 2-1.7 3-3 3.6.3-2.6-.7-5.3-3-6.6.2 3.3-4 6.1-4 11.2C5 18.4 8 21 12 21z',
  play: 'M8 5v14l11-7z', swap: 'M7 7h11l-3-3M17 17H6l3 3', timer: 'M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 9v4l2.5 1.5M10 2h4',
  trash: 'M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3', edit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4', info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 7.5v.5',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  scale: 'M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM8.5 9.5a5 5 0 0 1 7 0M12 9.5l1.5-2', steps: 'M8 16c-2 0-3-1.6-3-4s1-5 3-5 2.5 2.4 2 5-1 4-2 4zM16 20c-1 0-1.5-1.6-2-4s0-5 2-5 3 2.6 3 5-1 4-3 4zM6 19h4M14 8h4',
  ruler: 'M3 17L17 3l4 4L7 21zM7 13l2 2M10 10l2 2M13 7l2 2', book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19V5', link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H4a3 3 0 0 0 4 4M16 6h4a3 3 0 0 1-4 4M12 13v4M8 20h8M10 17h4', cal: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4', download: 'M12 4v11M7 10l5 5 5-5M5 20h14', upload: 'M12 20V9M7 14l5-5 5 5M5 4h14',
  copy: 'M8 8h11v11H8zM5 16V5h11', heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z', more: 'M5 12h.01M12 12h.01M19 12h.01',
};
export const Icon = ({ n, cls = '' }) => html`<svg class=${`i ${cls}`} viewBox="0 0 24 24" aria-hidden="true"><path d=${P[n] || ''} /></svg>`;

/* ───────────── sheet ───────────── */
export function Sheet({ title, onClose, children, foot, full, left }) {
  const close = onClose || closeSheet;
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [close]);
  return html`
    <div class="backdrop" onClick=${close}></div>
    <section class=${`sheet${full ? ' full' : ''}`} role="dialog" aria-modal="true" aria-label=${title}>
      <div class="grabber"></div>
      <div class="sheet-head">
        ${left}
        <div class="grow ellipsis">${title}</div>
        <button class="icon-btn solid" onClick=${close} aria-label="Close"><${Icon} n="x" /></button>
      </div>
      <div class="sheet-body">${children}</div>
      ${foot && html`<div class="sheet-foot">${foot}</div>`}
    </section>`;
}

export function Toast() {
  const u = useUI();
  if (!u.toast) return null;
  const t = u.toast;
  return html`<div class="toast" role="status" key=${t.key}>${t.text}${t.action && html`<button onClick=${() => { t.action.fn(); ui.toast = null; uiEmit(); }}>${t.action.label}</button>`}</div>`;
}

/* ───────────── inputs ───────────── */
export function Seg({ value, options, onChange, label }) {
  return html`<div class="seg" role="group" aria-label=${label}>
    ${options.map(([v, l]) => html`<button type="button" aria-pressed=${String(value === v)} onClick=${() => onChange(v)}>${l}</button>`)}
  </div>`;
}

export function Choice({ value, options, onChange }) {
  return html`<div class="choice">${options.map((o) => html`
    <button type="button" aria-pressed=${String(value === o.id)} onClick=${() => onChange(o.id)}><b>${o.label}</b>${o.hint && html`<span>${o.hint}</span>`}</button>`)}</div>`;
}

// A numeric input that keeps the text the person typed until it parses.
export function NumInput({ id, value, onValue, unit, big, step = 'any', placeholder, min, autofocus }) {
  const [text, setText] = useState(value == null ? '' : String(value));
  const last = useRef(value);
  useEffect(() => { if (value !== last.current) { last.current = value; setText(value == null ? '' : String(value)); } }, [value]);
  const ref = useRef();
  useEffect(() => { if (autofocus) setTimeout(() => ref.current?.focus(), 60); }, []);
  return html`<div class="unit-input">
    <input ref=${ref} id=${id} class=${`input${big ? ' big' : ''}`} inputmode="decimal" type="text" step=${step} min=${min} placeholder=${placeholder}
      value=${text} onInput=${(e) => { setText(e.target.value); const v = parseNum(e.target.value); last.current = v; onValue(v); }}
      onFocus=${(e) => e.target.select()} />
    ${unit && html`<span class="u">${unit}</span>`}
  </div>`;
}

/* ───────────── the plate ───────────── */
// Calories as a ring: ink fills as you eat, the over-budget part shows as a
// second lap in the critical colour.
export function Plate({ eaten, target, children }) {
  const r = 104, c = 2 * Math.PI * r;
  const frac = target > 0 ? eaten / target : 0;
  const main = Math.min(frac, 1);
  const over = Math.max(0, Math.min(frac - 1, 1));
  return html`<div class="plate-wrap">
    <svg viewBox="0 0 240 240" role="img" aria-label=${`${Math.round(eaten)} of ${Math.round(target)} kcal`}>
      <circle cx="120" cy="120" r="116" fill="var(--card)" stroke="var(--line)" stroke-width="1" />
      <circle cx="120" cy="120" r="92" fill="none" stroke="var(--line)" stroke-width="1" />
      <circle cx="120" cy="120" r=${r} fill="none" stroke="var(--sunk)" stroke-width="12" />
      <circle cx="120" cy="120" r=${r} fill="none" stroke="var(--ink)" stroke-width="12" stroke-linecap="round"
        stroke-dasharray=${`${c * main} ${c}`} transform="rotate(-90 120 120)" style="transition: stroke-dasharray .6s cubic-bezier(.2,.8,.2,1)" />
      ${over > 0 && html`<circle cx="120" cy="120" r=${r} fill="none" stroke="var(--bad)" stroke-width="12" stroke-linecap="round"
        stroke-dasharray=${`${c * over} ${c}`} transform="rotate(-90 120 120)" />`}
    </svg>
    <div class="plate-center">${children}</div>
  </div>`;
}

export const MACROS = [
  { k: 'p', name: 'Protein', color: 'var(--pro)' },
  { k: 'c', name: 'Carbs', color: 'var(--carb)' },
  { k: 'f', name: 'Fat', color: 'var(--fat)' },
];

export function MacroBars({ totals, targets }) {
  return html`<div class="macros">${MACROS.map((m) => {
    const v = totals[m.k] || 0, t = targets?.[m.k] || 0;
    const pct = t ? Math.min(100, (v / t) * 100) : 0;
    return html`<div class="macro">
      <div class="name"><i style=${`background:${m.color}`}></i>${m.name}</div>
      <div class="top"><span class="v num">${fmt(v)}</span><span class="of num">/ ${fmt(t)} g</span></div>
      <div class="bar"><i style=${`width:${pct}%;background:${m.color}`}></i></div>
    </div>`;
  })}</div>`;
}

export function Empty({ title, children, icon = 'info' }) {
  return html`<div class="col" style="align-items:center;text-align:center;padding:18px 8px;gap:8px">
    <span class="faint"><${Icon} n=${icon} /></span><b>${title}</b><div class="small muted prose">${children}</div></div>`;
}

export function Confetti() {
  const ref = useRef();
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const cv = ref.current; const ctx = cv.getContext('2d');
    const W = (cv.width = innerWidth * devicePixelRatio), H = (cv.height = innerHeight * devicePixelRatio);
    const cs = getComputedStyle(document.documentElement);
    const cols = ['--pro', '--carb', '--fat', '--fib', '--ink'].map((v) => cs.getPropertyValue(v).trim());
    const ps = Array.from({ length: 120 }, () => ({ x: W / 2 + (Math.random() - 0.5) * W * 0.3, y: H * 0.35, vx: (Math.random() - 0.5) * 18, vy: -Math.random() * 22 - 6, s: 6 + Math.random() * 8, c: cols[Math.floor(Math.random() * cols.length)], r: Math.random() * 6 }));
    let f = 0, id;
    const tick = () => {
      ctx.clearRect(0, 0, W, H);
      for (const p of ps) { p.vy += 0.7; p.x += p.vx; p.y += p.vy; p.r += 0.15; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore(); }
      if (++f < 110) id = requestAnimationFrame(tick); else ctx.clearRect(0, 0, W, H);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);
  return html`<canvas class="confetti" ref=${ref} style="width:100%;height:100%"></canvas>`;
}
