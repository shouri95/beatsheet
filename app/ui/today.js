// Today: what is left to eat, what you ate, your weigh-in, and today's session.
import { useState, useMemo, useEffect } from 'preact/hooks';
import { html, useStore, Plate, MacroBars, Icon, fmt, fmtW, kgTo, toKg, unitW, signed, openSheet, NumInput, longDate, dayName, toast } from './kit.js';
import * as E from '../engine.js';
import { updateDay } from '../store.js';
import { MEALS, mealNow } from './food.js';
import { currentWeight, todayTips, checkinDue } from '../coach.js';
import { buildWorkout, nextWorkoutIndex, sessionsThisWeek } from '../program.js';
import { proteinIdeas, loadFoods } from '../foods.js';
import { isWeb, isIOS, isStandalone } from '../env.js';
import { healthStatus, syncHealth } from '../health.js';

// Calories earned back today for walking more than usual (see engine.stepCredit).
export function creditFor(p, days, date) {
  if (p.prefs?.stepCredit === false) return { kcal: 0, extra: 0 };
  const steps = days[date]?.steps;
  if (!(steps > 0)) return { kcal: 0, extra: 0 };
  const base = E.stepBaseline(days, date, p.targets.steps || 8000);
  return { ...E.stepCredit({ steps, baseline: base.steps, weightKg: currentWeight(p, days).kg, heightCm: p.heightCm }), baseline: base.steps };
}
const hm = (min) => `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')}`;

export function Today({ go }) {
  const s = useStore();
  const p = s.profile;
  const today = E.dateKey();
  const [date, setDate] = useState(today);
  const day = s.days[date] || {};
  const credit = creditFor(p, s.days, date);
  const t = { ...p.targets, kcal: p.targets.kcal + credit.kcal };
  const totals = E.dayTotals(day);
  const left = t.kcal - totals.k;
  const u = unitW(p);
  const streak = E.streak(s.days, today);
  const sessionsWeek = sessionsThisWeek(s.days, today);
  const tips = date === today ? todayTips({ profile: p, totals, targets: t, trainedToday: !!s.days[today]?.workout?.done, sessionsWeek }) : [];
  const [foodsReady, setFR] = useState(false);
  useEffect(() => { loadFoods().then(() => setFR(true)).catch(() => {}); }, []);
  const ideas = foodsReady && date === today && totals.n > 0 && new Date().getHours() >= 13 ? proteinIdeas(t.p - totals.p, left) : [];
  const verifiedPct = totals.k > 0 ? Math.round((totals.verifiedK / totals.k) * 100) : null;

  // Monday-first week strip around the selected date.
  const d0 = new Date(date + 'T12:00:00');
  const monday = E.addDays(date, -((d0.getDay() + 6) % 7));
  const week = Array.from({ length: 7 }, (_, i) => E.addDays(monday, i));

  return html`
    <header class="page-head">
      <div class="col tight">
        <span class="eyebrow">${date === today ? longDate(today) : 'Looking back'}</span>
        <h1 class="h1">${date === today ? 'Today' : longDate(date)}</h1>
      </div>
      <div class="row">
        ${streak > 0 && html`<span class="pill ink" title="Days in a row with food logged"><${Icon} n="flame" cls="sm" />${streak}</span>`}
        <button class="icon-btn solid" onClick=${() => go('settings')} aria-label="Settings"><${Icon} n="gear" /></button>
      </div>
    </header>

    <nav class="week" aria-label="This week">${week.map((k) => {
      const tot = E.dayTotals(s.days[k]);
      const sc = E.dayScore(tot, t);
      return html`<button class=${`day${k > today ? ' future' : ''}`} aria-current=${k === date ? 'date' : undefined} disabled=${k > today} onClick=${() => setDate(k)}>
        ${dayName(k).slice(0, 1)}<b>${+k.slice(8)}</b><i class=${`dot${sc?.onTarget ? ' on' : tot.n ? ' part' : ''}`}></i></button>`;
    })}</nav>
    ${date !== today && html`<button class="btn soft sm" style="align-self:flex-start" onClick=${() => setDate(today)}><${Icon} n="back" cls="sm" />Back to today</button>`}

    ${date === today && checkinDue(p, today) && html`<button class="card ink" style="text-align:left;cursor:pointer" onClick=${() => go('coach')}>
      <div class="row between"><span class="eyebrow">Weekly check-in is ready</span><${Icon} n="next" /></div>
      <b style="font-size:17px">See how the week went and update your targets.</b></button>`}

    <section class="card raised" aria-label="Calories">
      <${Plate} eaten=${totals.k} target=${t.kcal}>
        <span class="big num">${fmt(Math.abs(left))}</span>
        <span class="lbl">${left >= 0 ? 'kcal left' : 'kcal over'}</span>
      <//>
      <div class="row between small"><span class="muted">Eaten <b class="num">${fmt(totals.k)}</b></span><span class="muted">Target <b class="num">${fmt(t.kcal)}</b></span></div>
      ${credit.kcal > 0 && html`<span class="tiny faint" style="text-align:right;margin-top:-8px">Includes +${fmt(credit.kcal)} kcal for ${fmt(credit.extra)} steps above your usual</span>`}
      <${MacroBars} totals=${totals} targets=${t} />
      <div class="row between tiny faint">
        <span>Fiber ${fmt(totals.fb)} / ${t.fiber} g</span>
        ${verifiedPct != null && html`<span title="Share of today's calories from weighed, database or label entries, not estimates">${verifiedPct}% verified</span>`}
      </div>
    </section>

    ${date === today && html`<${Nudges} go=${go} />`}
    ${tips.length > 0 && html`<div class="col tight">${tips.map((x) => html`<p class="small muted" style="margin:0">${x}</p>`)}</div>`}
    ${ideas.length > 0 && html`<div class="card">
      <span class="eyebrow">Close your protein (${fmt(t.p - totals.p)} g to go)</span>
      <div class="list">${ideas.map((i) => html`<button class="item" style="padding-inline:0" onClick=${() => openSheet('editor', { food: { ...i.food, lastG: i.g }, date, meal: mealNow() })}>
        <div class="grow"><div class="t">${i.food.name}</div><div class="s">${fmt(i.g)} g · ${fmt(i.p)} g protein · ${fmt(i.kcal)} kcal</div></div><${Icon} n="plus" /></button>`)}</div>
    </div>`}

    ${MEALS.map(([m, name]) => {
      const items = (day.foods || []).filter((e) => (e.meal || 's') === m);
      const k = items.reduce((a, e) => a + (e.k || 0), 0);
      return html`<section class="card flush" aria-label=${name}>
        <div class="row between" style="padding:12px 12px 10px 16px">
          <div class="row"><b>${name}</b>${items.length > 0 && html`<span class="faint small num">${fmt(k)} kcal</span>`}</div>
          <button class="btn xs soft" onClick=${() => openSheet('log', { date, meal: m })}><${Icon} n="plus" cls="sm" />Add</button>
        </div>
        ${items.length > 0 && html`<div class="list">${items.map((e) => html`<button class="item" onClick=${() => openSheet('entry', { date, entry: e })}>
          <div class="grow"><div class="t ellipsis">${e.name}</div><div class="s">${e.g ? `${fmt(e.g)} g · ` : ''}${fmt(e.p, 0)}P ${fmt(e.c, 0)}C ${fmt(e.f, 0)}F${e.est ? ' · estimate' : ''}</div></div>
          <span class="num">${fmt(e.k)}</span></button>`)}</div>`}
      </section>`;
    })}

    <${BodyCard} key=${date} date=${date} />
    ${date === today && html`<${TrainCard} go=${go} />`}
  `;
}

function BodyCard({ date }) {
  const s = useStore();
  const p = s.profile;
  const u = unitW(p);
  const day = s.days[date] || {};
  const cw = currentWeight(p, s.days);
  const weekAgo = cw.series.filter((x) => x.date <= E.addDays(date, -7)).pop();
  const delta = weekAgo ? cw.kg - weekAgo.t : null;
  const [editW, setEditW] = useState(false);
  const [w, setW] = useState(day.weight ? +kgTo(day.weight, u).toFixed(1) : null);
  const [steps, setSteps] = useState(day.steps || null);
  const imperial = p.units?.h === 'in';
  const lastWaist = Object.keys(s.days).filter((k) => s.days[k]?.waist > 0).sort().pop();
  const waistDue = !lastWaist || E.diffDays(lastWaist, date) >= 7;
  const [waist, setWaist] = useState(null);

  const saveW = () => { if (w > 0) { updateDay(date, (d) => { d.weight = toKg(w, u); d.weightSrc = 'manual'; }); setEditW(false); toast('Weigh-in saved'); } };
  const hs = isWeb ? healthStatus() : { connected: false };
  const [editSteps, setEditSteps] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const fromFitbit = day.stepsSrc === 'fitbit' && !editSteps;
  const sync = () => { setSyncing(true); syncHealth({ days: 3 }).then(() => toast('Fitbit synced')).catch((e) => toast(e.message || 'Sync failed')).finally(() => setSyncing(false)); };
  return html`<section class="card" aria-label="Body">
    <div class="row between"><b>Weigh-in</b>${cw.series.length > 1 && html`<span class="small faint">Trend ${fmtW(cw.kg, u)}${delta != null ? ` · ${signed(kgTo(delta, u))} ${u} this week` : ''}</span>`}</div>
    ${day.weight && !editW ? html`<div class="row between">
        <span class="display" style="font-size:36px">${fmt(kgTo(day.weight, u), 1)} <small style="font-family:var(--text);font-size:15px;font-weight:600" class="faint">${u}${day.weightSrc === 'fitbit' ? ' · from your scale' : ''}</small></span>
        <button class="btn xs ghost" onClick=${() => { setW(+kgTo(day.weight, u).toFixed(1)); setEditW(true); }}>Change</button></div>`
      : html`<div class="row"><div class="grow"><${NumInput} id="wi" value=${w} unit=${u} placeholder=${fmt(kgTo(cw.kg, u), 1)} onValue=${setW} /></div><button class="btn" disabled=${!(w > 0)} onClick=${saveW}>Save</button></div>
        <span class="hint">Morning, after the toilet, before food. Daily is best; the trend smooths out water swings.</span>`}
    <hr class="sep" />
    <div class="row between"><b>Steps</b><span class="small faint">Target ${(p.targets.steps || 8000).toLocaleString()}</span></div>
    ${fromFitbit ? html`<div class="row between">
        <span class="display" style="font-size:32px">${fmt(day.steps)}</span>
        <div class="row" style="gap:6px"><span class="tiny faint">Fitbit${hs.lastSync ? ` · ${new Date(hs.lastSync).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}</span>
          <button class="icon-btn solid" aria-label="Sync Fitbit now" disabled=${syncing} onClick=${sync}><${Icon} n="sync" cls="sm" /></button>
          <button class="btn xs ghost" onClick=${() => setEditSteps(true)}>Edit</button></div></div>`
      : html`<div class="row"><div class="grow"><${NumInput} id="steps" value=${steps} placeholder=${hs.connected ? 'Waiting for Fitbit, or type them' : 'From your phone or watch'} onValue=${setSteps} /></div>
      <button class="btn ghost" disabled=${!(steps >= 0) || steps === (day.steps || null)} onClick=${() => { updateDay(date, (d) => { d.steps = Math.round(steps); d.stepsSrc = 'manual'; }); setEditSteps(false); toast('Steps saved'); }}>Save</button></div>`}
    ${day.steps > 0 && html`<div class="bar"><i style=${`width:${Math.min(100, (day.steps / (p.targets.steps || 8000)) * 100)}%;background:var(--ink)`}></i></div>`}
    ${day.sleep?.asleep > 0 && html`<hr class="sep" />
      <div class="row between"><b>Sleep</b><span class="small faint">${day.sleep.start}–${day.sleep.end}${day.rhr ? ` · resting HR ${day.rhr}` : ''}</span></div>
      <div class="row between"><span class="display" style="font-size:32px">${hm(day.sleep.asleep)}</span>
        <span class="small faint">${day.sleep.deep != null ? `Deep ${hm(day.sleep.deep)} · REM ${hm(day.sleep.rem || 0)}` : ''}</span></div>
      ${day.sleep.asleep < 390 && html`<span class="hint">Under 6½ hours. Short sleep raises hunger the next day and makes a deficit cost more muscle. Protein first today, and aim for an earlier night.</span>`}`}
    ${waistDue && html`<hr class="sep" />
      <div class="row between"><b>Waist</b><span class="small faint">${lastWaist ? `Last: ${fmt(imperial ? s.days[lastWaist].waist / 2.54 : s.days[lastWaist].waist, 1)} ${imperial ? 'in' : 'cm'}` : 'Weekly'}</span></div>
      <div class="row"><div class="grow"><${NumInput} id="waist" value=${waist} unit=${imperial ? 'in' : 'cm'} placeholder="At the navel, relaxed" onValue=${setWaist} /></div>
        <button class="btn ghost" disabled=${!(waist > 0)} onClick=${() => { updateDay(date, (d) => { d.waist = imperial ? waist * 2.54 : waist; }); toast('Waist saved'); }}>Save</button></div>
      <span class="hint">Your waist is the most direct belly-fat measure you have. Once a week, same spot.</span>`}
  </section>`;
}

function TrainCard({ go }) {
  const s = useStore();
  const p = s.profile;
  const today = E.dateKey();
  const live = s.days[today]?.workout;
  const w = buildWorkout(p.train, nextWorkoutIndex(s.days, today));
  if (live?.done) return html`<section class="card"><div class="row between"><b>Trained today</b><span class="pill good"><${Icon} n="check" cls="sm" />${live.name}</span></div>
    <span class="small muted">Recovery is where the muscle is built. Eat your protein and sleep 7+ hours.</span></section>`;
  return html`<button class="card" style="text-align:left;cursor:pointer" onClick=${() => go('train')}>
    <div class="row between"><span class="eyebrow">${live ? 'In progress' : 'Next workout'}</span><${Icon} n="next" /></div>
    <div class="row between"><span class="h2">${w.name}</span><span class="small faint">${w.items.length} exercises</span></div>
    <span class="small muted ellipsis">${w.items.map((i) => i.label).join(' · ')}</span>
  </button>`;
}

// Install the app, connect Fitbit: shown until done or dismissed.
function Nudges({ go }) {
  const [hidden, setHidden] = useState(() => { try { return JSON.parse(localStorage.getItem('plates:nudges') || '{}'); } catch { return {}; } });
  const hide = (k) => { const n = { ...hidden, [k]: Date.now() }; setHidden(n); try { localStorage.setItem('plates:nudges', JSON.stringify(n)); } catch { /* optional */ } };
  if (!isWeb) return null;
  const hs = healthStatus();
  const showInstall = isIOS && !isStandalone() && !hidden.install;
  const showFitbit = !hs.connected && !hidden.fitbit;
  const err = hs.connected && hs.error;
  if (!showInstall && !showFitbit && !err) return null;
  return html`<div class="col">
    ${showInstall && html`<section class="card">
      <div class="row between"><b>Put Plates on your Home Screen</b><button class="icon-btn" aria-label="Dismiss" onClick=${() => hide('install')}><${Icon} n="x" cls="sm" /></button></div>
      <span class="small muted">Tap <${Icon} n="share" cls="sm" /> Share at the bottom of Safari, then <b>Add to Home Screen</b>. It opens straight to food logging, works offline, and keeps your data safe from Safari's clean-ups.</span>
    </section>`}
    ${err && html`<button class="card" style="text-align:left;cursor:pointer" onClick=${() => go('profile')}><span class="small" style="color:var(--warn)">${err}</span></button>`}
    ${showFitbit && !showInstall && html`<section class="card">
      <div class="row between"><b>Connect Fitbit</b><button class="icon-btn" aria-label="Dismiss" onClick=${() => hide('fitbit')}><${Icon} n="x" cls="sm" /></button></div>
      <span class="small muted">Steps, sleep, resting heart rate and scale weigh-ins arrive on their own, and extra walking earns back calories.</span>
      <button class="btn sm soft" style="align-self:flex-start" onClick=${() => go('profile')}>Set it up</button>
    </section>`}
  </div>`;
}
