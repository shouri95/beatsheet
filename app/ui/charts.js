// Small hand-built SVG charts: one y-axis, hairline grid, 2px lines, a
// crosshair tooltip on hover or touch. Sized to their container in real
// pixels so text stays 11px at every width.
import { useState, useRef, useEffect } from 'preact/hooks';
import { html, shortDate, fmt } from './kit.js';
import { diffDays, addDays } from '../engine.js';

function useWidth() {
  const ref = useRef();
  const [w, setW] = useState(340);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(240, Math.round(e.contentRect.width))));
    ro.observe(el); return () => ro.disconnect();
  }, []);
  return [ref, w];
}

function niceTicks(lo, hi, n = 4) {
  const span = hi - lo || 1;
  const raw = span / n;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) || raw;
  const out = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(6));
  return out;
}

// series: [{ id, points: [{d, y}], color, line: bool, dots: bool, dash, label }]
export function TimeChart({ series, from, to, height = 190, yFmt = (v) => fmt(v, 1), refLines = [], tipFor }) {
  const [ref, W] = useWidth();
  const [hover, setHover] = useState(null);
  const pad = { l: 40, r: 14, t: 12, b: 24 };
  const ys = series.flatMap((s) => s.points.map((p) => p.y)).concat(refLines.map((r) => r.y));
  if (!ys.length) return html`<div ref=${ref}></div>`;
  let lo = Math.min(...ys), hi = Math.max(...ys);
  const m = (hi - lo) * 0.12 || 1; lo -= m; hi += m;
  const ticks = niceTicks(lo, hi);
  lo = Math.min(lo, ticks[0]); hi = Math.max(hi, ticks[ticks.length - 1]);
  const days = Math.max(1, diffDays(from, to));
  const x = (d) => pad.l + (diffDays(from, d) / days) * (W - pad.l - pad.r);
  const y = (v) => pad.t + (1 - (v - lo) / (hi - lo)) * (height - pad.t - pad.b);
  const xt = [from, addDays(from, Math.round(days / 2)), to];

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.touches ? e.touches[0].clientX : e.clientX) - r.left) * (W / r.width);
    const d = addDays(from, Math.round(((px - pad.l) / (W - pad.l - pad.r)) * days));
    let best = null;
    for (const s of series) for (const p of s.points) { const dd = Math.abs(diffDays(p.d, d)); if (!best || dd < best.dd) best = { dd, d: p.d }; }
    setHover(best && best.dd <= Math.max(3, days / 30) ? best.d : null);
  };
  const path = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.d).toFixed(1)},${y(p.y).toFixed(1)}`).join('');

  return html`<div ref=${ref} style="position:relative">
    <svg class="chart" viewBox=${`0 0 ${W} ${height}`} width=${W} height=${height} onMouseMove=${onMove} onTouchStart=${onMove} onTouchMove=${onMove} onMouseLeave=${() => setHover(null)} role="img" aria-label="Chart">
      ${ticks.map((t) => html`<line class="grid" x1=${pad.l} x2=${W - pad.r} y1=${y(t)} y2=${y(t)} /><text x=${pad.l - 6} y=${y(t) + 4} text-anchor="end">${yFmt(t)}</text>`)}
      ${xt.map((d, i) => html`<text x=${x(d)} y=${height - 6} text-anchor=${i === 0 ? 'start' : i === 2 ? 'end' : 'middle'}>${shortDate(d)}</text>`)}
      ${refLines.map((r) => html`<line x1=${pad.l} x2=${W - pad.r} y1=${y(r.y)} y2=${y(r.y)} stroke=${r.color || 'var(--ink2)'} stroke-width="1" stroke-dasharray="4 4" />
        <text x=${W - pad.r} y=${y(r.y) - 5} text-anchor="end" style="fill:var(--ink2);font-weight:600">${r.label}</text>`)}
      ${series.map((s) => html`<g>
        ${s.line !== false && s.points.length > 1 && html`<path d=${path(s.points)} fill="none" stroke=${s.color} stroke-width=${s.width || 2} stroke-linejoin="round" stroke-linecap="round" stroke-dasharray=${s.dash || ''} />`}
        ${s.dots && s.points.map((p) => html`<circle cx=${x(p.d)} cy=${y(p.y)} r=${s.r || 2.5} fill=${s.color} opacity=${s.opacity ?? 1} />`)}
        ${s.end && s.points.length > 0 && (() => { const p = s.points[s.points.length - 1]; return html`<circle cx=${x(p.d)} cy=${y(p.y)} r="4.5" fill=${s.color} stroke="var(--card)" stroke-width="2" />`; })()}
      </g>`)}
      ${hover && html`<line x1=${x(hover)} x2=${x(hover)} y1=${pad.t} y2=${height - pad.b} stroke="var(--line2)" stroke-width="1" />`}
      ${hover && series.map((s) => { const p = s.points.find((q) => q.d === hover); return p && s.line !== false ? html`<circle cx=${x(p.d)} cy=${y(p.y)} r="5" fill=${s.color} stroke="var(--card)" stroke-width="2" />` : null; })}
    </svg>
    ${hover && html`<div class="tip" style=${`left:${(x(hover) / W) * 100}%;top:${pad.t}px`}>${tipFor ? tipFor(hover) : shortDate(hover)}</div>`}
  </div>`;
}

// Daily bars against a target line (calories).
export function DayBars({ days, values, target, height = 150, color = 'var(--ink)', tipFor, yFmt = (v) => fmt(v) }) {
  const [ref, W] = useWidth();
  const [hover, setHover] = useState(null);
  const pad = { l: 40, r: 8, t: 10, b: 22 };
  const max = Math.max(target * 1.25, ...values.map((v) => v || 0), 1);
  const ticks = niceTicks(0, max, 3);
  const top = Math.max(max, ticks[ticks.length - 1]);
  const bw = (W - pad.l - pad.r) / days.length;
  const thick = Math.min(18, bw - 3);
  const y = (v) => pad.t + (1 - v / top) * (height - pad.t - pad.b);
  return html`<div ref=${ref} style="position:relative">
    <svg class="chart" viewBox=${`0 0 ${W} ${height}`} width=${W} height=${height} onMouseLeave=${() => setHover(null)} role="img" aria-label="Daily calories">
      ${ticks.map((t) => html`<line class="grid" x1=${pad.l} x2=${W - pad.r} y1=${y(t)} y2=${y(t)} /><text x=${pad.l - 6} y=${y(t) + 4} text-anchor="end">${yFmt(t)}</text>`)}
      ${days.map((d, i) => {
        const v = values[i] || 0; const cx = pad.l + bw * i + bw / 2;
        const h0 = y(0) - y(v);
        return html`<g onMouseEnter=${() => setHover(i)} onTouchStart=${() => setHover(i)}>
          <rect x=${pad.l + bw * i} y=${pad.t} width=${bw} height=${height - pad.t - pad.b} fill="transparent" />
          ${v > 0 && html`<path d=${`M${cx - thick / 2},${y(0)} V${y(v) + Math.min(4, h0)} q0,-${Math.min(4, h0)} ${Math.min(4, thick / 2)},-${Math.min(4, h0)} H${cx + thick / 2 - Math.min(4, thick / 2)} q${Math.min(4, thick / 2)},0 ${Math.min(4, thick / 2)},${Math.min(4, h0)} V${y(0)} Z`} fill=${color} opacity=${hover == null || hover === i ? 1 : 0.45} />`}
          ${(i === 0 || i === days.length - 1 || i === Math.floor(days.length / 2)) && html`<text x=${cx} y=${height - 6} text-anchor="middle">${shortDate(d)}</text>`}
        </g>`;
      })}
      <line x1=${pad.l} x2=${W - pad.r} y1=${y(target)} y2=${y(target)} stroke="var(--ink2)" stroke-width="1.5" stroke-dasharray="4 4" />
    </svg>
    ${hover != null && html`<div class="tip" style=${`left:${((pad.l + bw * hover + bw / 2) / W) * 100}%;top:${pad.t}px`}>${tipFor ? tipFor(hover) : yFmt(values[hover] || 0)}</div>`}
  </div>`;
}
