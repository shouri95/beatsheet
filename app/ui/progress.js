// Progress: are you getting there, and is it fat or muscle that is moving.
import { useState, useMemo } from 'preact/hooks';
import { html, useStore, Icon, fmt, fmtW, kgTo, unitW, signed, shortDate, openSheet, Empty, toast } from './kit.js';
import { TimeChart, DayBars } from './charts.js';
import * as E from '../engine.js';
import { currentWeight, computePlan, targetsFrom } from '../coach.js';
import { EX } from '../data/exercises.js';
import { bestE1rm } from '../program.js';
import { setProfile } from '../store.js';
import { ScanReader } from './scan.js';

export function Progress() {
  const s = useStore();
  const p = s.profile;
  const u = unitW(p);
  const today = E.dateKey();
  const g = p.goal;
  const cw = currentWeight(p, s.days);
  const [range, setRange] = useState(90);
  const endDate = E.addDays(g.startDate, Math.round(g.weeks * 7));
  const weeksLeft = Math.max(0, E.diffDays(today, endDate) / 7);
  const totalChange = g.targetKg - g.startKg;
  const done = cw.kg - g.startKg;
  const pct = Math.abs(totalChange) > 0.3 ? E.clamp(done / totalChange, 0, 1) : null;
  const fit = E.weightSlope(E.weightSeries(s.days), E.addDays(today, -21), today, 5, 10);
  const slopeWk = fit ? fit.slope * 7 : null;
  const etaWeeks = slopeWk && Math.sign(slopeWk) === Math.sign(totalChange) && Math.abs(slopeWk) > 0.02 ? (g.targetKg - cw.kg) / slopeWk : null;
  const comp = E.bodyComp(p, cw.kg);

  const from = range ? (E.addDays(today, -range) > g.startDate ? E.addDays(today, -range) : g.startDate) : (cw.series[0]?.date || g.startDate);
  const pts = cw.series.filter((x) => x.date >= from);
  const to = today > from ? today : E.addDays(from, 7);

  return html`
    <header class="page-head"><div class="col tight"><span class="eyebrow">Week ${Math.floor(E.diffDays(g.startDate, today) / 7) + 1} of ${g.weeks}</span><h1 class="h1">Progress</h1></div></header>

    <section class="card raised">
      <div class="row between top">
        <div class="stat"><span class="v">${fmt(kgTo(cw.kg, u), 1)}<small>${u}</small></span><span class="l">Trend weight</span></div>
        <div class="stat" style="text-align:right"><span class="v">${fmt(kgTo(g.targetKg, u), 1)}<small>${u}</small></span><span class="l">Goal</span></div>
      </div>
      ${pct != null && html`<div class="bar thick"><i style=${`width:${pct * 100}%;background:var(--ink)`}></i></div>`}
      <div class="row between small">
        <span class="muted">${signed(kgTo(done, u))} ${u} since ${shortDate(g.startDate)}</span>
        <span class="muted">${pct != null ? `${Math.round(pct * 100)}% there` : ''}</span>
      </div>
      <div class="grid3">
        <div class="stat"><span class="v">${slopeWk != null ? signed(kgTo(slopeWk, u), 2) : '–'}<small>${u}/wk</small></span><span class="l">Last 3 weeks</span></div>
        <div class="stat"><span class="v">${Math.ceil(weeksLeft)}<small>wk</small></span><span class="l">Left in plan</span></div>
        <div class="stat"><span class="v">${etaWeeks != null ? shortDate(E.addDays(today, Math.round(etaWeeks * 7))) : '–'}</span><span class="l">At this pace</span></div>
      </div>
    </section>

    <section class="card">
      <div class="row between"><b>Weight</b>
        <div class="chips">${[[30, '30d'], [90, '90d'], [0, 'All']].map(([r, l]) => html`<button class="chip" style="height:28px;padding:0 10px;font-size:13px" aria-pressed=${String(range === r)} onClick=${() => setRange(r)}>${l}</button>`)}</div></div>
      ${pts.length >= 2 ? html`
        <${TimeChart} from=${from} to=${to} yFmt=${(v) => fmt(kgTo(v, u), 0)}
          refLines=${[{ y: g.targetKg, label: `Goal ${fmt(kgTo(g.targetKg, u), 1)}` }]}
          series=${[
            { id: 'raw', points: pts.map((x) => ({ d: x.date, y: x.w })), color: 'var(--ink3)', line: false, dots: true, r: 2.5, opacity: 0.7 },
            { id: 'trend', points: pts.map((x) => ({ d: x.date, y: x.t })), color: 'var(--ink)', end: true },
          ]}
          tipFor=${(d) => { const x = pts.find((q) => q.date === d); return x ? `${shortDate(d)} · ${fmt(kgTo(x.w, u), 1)} (trend ${fmt(kgTo(x.t, u), 1)})` : shortDate(d); }} />
        <div class="legend"><span><i class="dot" style="background:var(--ink3)"></i>Weigh-ins</span><span><i style="background:var(--ink)"></i>Trend</span><span><i style="background:var(--ink2);height:1px"></i>Goal</span></div>
        <span class="hint">Daily weight swings with water, salt and food in your gut. The trend line is what fat loss looks like.</span>`
      : html`<${Empty} title="Your chart starts after two weigh-ins" icon="scale">Weigh in each morning from the Today tab.<//>`}
    </section>

    <${Consistency} />
    <${Calories} />
    <${Body} comp=${comp} cw=${cw} />
    <${Strength} />
  `;
}

function Consistency() {
  const s = useStore();
  const t = s.profile.targets;
  const today = E.dateKey();
  const days = Array.from({ length: 28 }, (_, i) => E.addDays(today, i - 27));
  let on = 0, logged = 0, trained = 0;
  const cells = days.map((k) => {
    const tot = E.dayTotals(s.days[k]); const sc = E.dayScore(tot, t);
    if (tot.n) logged++; if (sc?.onTarget) on++; if (s.days[k]?.workout?.done) trained++;
    return { k, on: sc?.onTarget, logged: tot.n > 0, trained: s.days[k]?.workout?.done };
  });
  return html`<section class="card">
    <div class="row between"><b>Last 4 weeks</b><span class="small faint">${on} on target · ${trained} workouts</span></div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px">${cells.map((c) => html`<div title=${`${shortDate(c.k)}${c.on ? ': on target' : c.logged ? ': logged' : ''}${c.trained ? ', trained' : ''}`}
      style=${`aspect-ratio:1;border-radius:8px;display:grid;place-items:center;${c.on ? 'background:var(--ink)' : c.logged ? 'box-shadow:inset 0 0 0 1.5px var(--ink2)' : 'background:var(--sunk)'}`}>
      ${c.trained && html`<span style=${`width:6px;height:6px;border-radius:9px;background:${c.on ? 'var(--inv)' : 'var(--ink)'}`}></span>`}</div>`)}</div>
    <div class="legend"><span><i class="dot" style="background:var(--ink)"></i>Calories and protein on target</span><span><i class="dot" style="box-shadow:inset 0 0 0 1.5px var(--ink2)"></i>Logged</span><span><i class="dot" style="background:var(--ink);width:6px;height:6px"></i>Trained</span></div>
  </section>`;
}

function Calories() {
  const s = useStore();
  const t = s.profile.targets;
  const today = E.dateKey();
  const days = Array.from({ length: 14 }, (_, i) => E.addDays(today, i - 13));
  const tots = days.map((k) => E.dayTotals(s.days[k]));
  const logged = tots.filter((x) => x.n);
  if (logged.length < 2) return null;
  const avg = logged.reduce((a, x) => a + x.k, 0) / logged.length;
  const avgP = logged.reduce((a, x) => a + x.p, 0) / logged.length;
  return html`<section class="card">
    <div class="row between"><b>Calories, 14 days</b><span class="small faint">Avg ${fmt(avg)} kcal · ${fmt(avgP)} g protein</span></div>
    <${DayBars} days=${days} values=${tots.map((x) => x.k)} target=${t.kcal} tipFor=${(i) => `${shortDate(days[i])} · ${fmt(tots[i].k)} kcal · ${fmt(tots[i].p)} g protein`} />
    <div class="legend"><span><i class="dot" style="background:var(--ink);border-radius:3px"></i>Eaten</span><span><i style="background:var(--ink2)"></i>Target ${fmt(t.kcal)} kcal</span></div>
  </section>`;
}

function Body({ comp, cw }) {
  const s = useStore();
  const p = s.profile;
  const u = unitW(p);
  const imperial = p.units?.h === 'in';
  const waist = Object.keys(s.days).filter((k) => s.days[k]?.waist > 0).sort().map((k) => ({ d: k, y: s.days[k].waist }));
  const [add, setAdd] = useState(false);
  const scans = (p.scans || []).slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  const fatKg = comp ? cw.kg - comp.leanKg : null;
  return html`<section class="card">
    <b>Body composition</b>
    ${comp ? html`<div class="grid3">
        <div class="stat"><span class="v">${fmt(comp.bf, 1)}<small>%</small></span><span class="l">Body fat (est.)</span></div>
        <div class="stat"><span class="v">${fmt(kgTo(comp.leanKg, u), 1)}<small>${u}</small></span><span class="l">Lean mass</span></div>
        <div class="stat"><span class="v">${fmt(kgTo(fatKg, u), 1)}<small>${u}</small></span><span class="l">Fat mass</span></div>
      </div>
      <span class="hint">From your ${comp.scan.src === 'navy' || comp.scan.src === 'rfm' ? 'tape measurement' : comp.scan.device || 'scan'} on ${shortDate(comp.scan.date)}, assuming lean mass holds while you lift and eat your protein. A new scan every 8–12 weeks keeps this honest.</span>`
      : html`<span class="small muted">Add a body-fat scan or tape measurement to see how much of your change is fat.</span>`}
    ${waist.length >= 2 && html`<div class="col tight"><div class="row between small"><span class="muted">Waist</span><b>${signed(imperial ? (waist[waist.length - 1].y - waist[0].y) / 2.54 : waist[waist.length - 1].y - waist[0].y)} ${imperial ? 'in' : 'cm'} since ${shortDate(waist[0].d)}</b></div>
      <${TimeChart} height=${130} from=${waist[0].d} to=${waist[waist.length - 1].d > waist[0].d ? waist[waist.length - 1].d : E.addDays(waist[0].d, 7)} yFmt=${(v) => fmt(imperial ? v / 2.54 : v, 0)}
        series=${[{ id: 'waist', points: waist, color: 'var(--ink)', dots: true, r: 3.5, end: true }]} tipFor=${(d) => { const x = waist.find((q) => q.d === d); return x ? `${shortDate(d)} · ${fmt(imperial ? x.y / 2.54 : x.y, 1)} ${imperial ? 'in' : 'cm'}` : ''; }} /></div>`}
    ${scans.length > 0 && html`<div class="list">${scans.map((x) => html`<div class="item" style="padding-inline:0">
      <div class="grow"><div class="t">${shortDate(x.date)} · ${x.src === 'navy' || x.src === 'rfm' ? 'Tape measure' : x.device || (x.src === 'dexa' ? 'DEXA' : 'Scan')}</div>
      <div class="s">${x.bf ? `${fmt(x.bf, 1)}% fat` : ''}${x.leanKg ? ` · ${fmtW(x.leanKg, u)} lean` : ''}${x.smmKg ? ` · ${fmtW(x.smmKg, u)} muscle` : ''}${x.visceral ? ` · visceral ${x.visceral}` : ''}${x.bmr ? ` · BMR ${fmt(x.bmr)}` : ''}</div></div>
      <button class="icon-btn" aria-label="Delete scan" onClick=${() => setProfile({ scans: (p.scans || []).filter((y) => y !== x && !(y.date === x.date && y.src === x.src && y.bf === x.bf)) })}><${Icon} n="trash" cls="sm" /></button></div>`)}</div>`}
    ${add ? html`<${ScanReader} units=${p.units} defaultWeight=${cw.kg} onAdd=${(x) => {
        // A new scan changes lean mass, so recompute the targets right away.
        const prof = { ...p, scans: [...(p.scans || []), x] };
        const t = targetsFrom(computePlan(prof, s.days));
        setProfile({ scans: prof.scans, targets: { ...t, set: p.targets.set } });
        setAdd(false);
        toast(`Scan saved. Targets now ${fmt(t.kcal)} kcal · ${t.p} g protein`);
      }} />`
      : html`<button class="btn soft sm" style="align-self:flex-start" onClick=${() => setAdd(true)}><${Icon} n="plus" cls="sm" />Add a scan</button>`}
    <span class="hint">Adding a scan updates your calorie and protein targets straight away.</span>
  </section>`;
}

function Strength() {
  const s = useStore();
  const u = unitW(s.profile);
  const lifts = useMemo(() => {
    const m = new Map();
    for (const k of Object.keys(s.days).sort()) {
      const w = s.days[k]?.workout;
      if (!w?.done) continue;
      for (const it of w.ex || []) {
        const v = bestE1rm(it.sets);
        if (v <= 0) continue;
        if (!m.has(it.id)) m.set(it.id, []);
        m.get(it.id).push({ d: k, y: v });
      }
    }
    return [...m.entries()].filter(([, pts]) => pts.length >= 1).sort((a, b) => b[1].length - a[1].length);
  }, [s.days]);
  const [sel, setSel] = useState(null);
  if (!lifts.length) return html`<section class="card"><b>Strength</b><span class="small muted">Finish a workout with weights and your estimated one-rep maxes show up here.</span></section>`;
  const cur = lifts.find(([id]) => id === sel) || lifts[0];
  const pts = cur[1];
  const first = pts[0].y, last = pts[pts.length - 1].y;
  return html`<section class="card">
    <div class="row between"><b>Strength</b><span class="small faint">Estimated 1-rep max</span></div>
    <div class="chips">${lifts.slice(0, 8).map(([id]) => html`<button class="chip" style="height:30px;font-size:13px" aria-pressed=${String(cur[0] === id)} onClick=${() => setSel(id)}>${EX[id].name}</button>`)}</div>
    <div class="row between"><span class="display" style="font-size:36px">${fmt(kgTo(last, u), 1)} <small class="faint" style="font-family:var(--text);font-size:14px">${u}</small></span>
      ${pts.length > 1 && html`<span class=${`pill ${last >= first ? 'good' : ''}`}>${signed(((last - first) / first) * 100, 0)}% since ${shortDate(pts[0].d)}</span>`}</div>
    ${pts.length > 1 && html`<${TimeChart} height=${150} from=${pts[0].d} to=${pts[pts.length - 1].d} yFmt=${(v) => fmt(kgTo(v, u), 0)}
      series=${[{ id: 'e1rm', points: pts, color: 'var(--ink)', dots: true, r: 3, end: true }]} tipFor=${(d) => { const x = pts.find((q) => q.d === d); return x ? `${shortDate(d)} · ${fmt(kgTo(x.y, u), 1)} ${u}` : ''; }} />`}
    <span class="hint">Getting stronger in a calorie deficit is the clearest sign you are keeping muscle.</span>
  </section>`;
}
