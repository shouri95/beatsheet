// First run: who you are, what you want, and the plan that gets you there.
import { useState, useMemo } from 'preact/hooks';
import { html, Seg, Choice, NumInput, Icon, fmt, kgTo, toKg, fmtW } from './kit.js';
import * as E from '../engine.js';
import { EQUIPMENT, LEVELS, SPLITS } from '../program.js';
import { setProfile, updateDay, state } from '../store.js';
import { targetsFrom, computePlan, currentWeight, STEP_GOAL } from '../coach.js';
import { ScanReader } from './scan.js';

const year = new Date().getFullYear();

export function Onboarding({ existing, onDone }) {
  const today = E.dateKey();
  const [step, setStep] = useState(existing ? 1 : 0);
  const [d, setD] = useState(() => existing ? {
    sex: existing.sex, birthYear: existing.birthYear, heightCm: existing.heightCm, units: existing.units,
    weightKg: E.roundTo(currentWeight(existing, state.days).kg, 0.1), activity: existing.activity, train: existing.train, scans: existing.scans || [],
    waistCm: null, neckCm: null, hipCm: null, targetKg: existing.goal?.targetKg, weeks: existing.goal?.weeks || 12,
  } : {
    sex: 'm', birthYear: year - 30, heightCm: 175, units: { w: 'kg', h: 'cm' }, weightKg: null, activity: 2,
    train: { days: 3, equipment: 'gym', level: 'new', swaps: {} }, scans: [], waistCm: null, neckCm: null, hipCm: null, targetKg: null, weeks: 12,
  });
  const set = (patch) => setD((x) => ({ ...x, ...patch }));
  const u = d.units.w;
  const imperial = d.units.h === 'in';

  const navy = d.waistCm && d.neckCm ? E.navyBodyFat({ sex: d.sex, heightCm: d.heightCm, neckCm: d.neckCm, waistCm: d.waistCm, hipCm: d.hipCm }) : null;
  const scans = useMemo(() => {
    const s = d.scans.filter((x) => x.src !== 'navy' || x.date !== today);
    if (navy && d.weightKg) s.push({ date: today, bf: E.roundTo(navy, 0.1), weightKg: d.weightKg, src: 'navy' });
    return s;
  }, [d.scans, navy, d.weightKg]);

  const draft = (targetKg = d.targetKg) => ({
    sex: d.sex, birthYear: d.birthYear, heightCm: d.heightCm, activity: d.activity, train: d.train, scans,
    goal: { targetKg: targetKg || d.weightKg, weeks: d.weeks, startDate: existing?.goal?.startDate || today, startKg: existing?.goal?.startKg || d.weightKg },
  });
  const suggestion = d.weightKg ? E.suggestTarget(draft(d.weightKg), d.weightKg) : null;
  const target = d.targetKg ?? suggestion?.targetKg;
  const plan = d.weightKg ? E.buildPlan(draft(target), d.weightKg, { today }) : null;
  const comp = d.weightKg ? E.bodyComp({ scans }, d.weightKg) : null;

  const finish = () => {
    const prof = {
      ...(existing || {}), v: 1, ...draft(target), units: d.units, created: existing?.created || Date.now(),
      coach: { ...(existing?.coach || {}), lastCheckin: existing?.coach?.lastCheckin || today },
    };
    if (!existing) { updateDay(today, (day) => { day.weight = d.weightKg; if (d.waistCm) day.waist = d.waistCm; }); }
    const days = existing ? state.days : { ...state.days, [today]: { ...(state.days[today] || {}), weight: d.weightKg } };
    const full = computePlan(prof, days, today);
    prof.targets = targetsFrom(full, today);
    setProfile(prof);
    onDone?.();
  };

  const STEPS = 6;
  const ok = [true, d.weightKg > 25 && d.heightCm > 120 && d.birthYear > 1920 && d.birthYear <= year - 13, true, true, target > 25, true][step];
  const nav = html`<div class="row" style="margin-top:auto;padding-top:8px">
    ${step > 0 && !(existing && step === 1) && html`<button class="btn ghost" onClick=${() => setStep(step - 1)}><${Icon} n="back" /></button>`}
    ${existing && step === 1 && html`<button class="btn ghost" onClick=${onDone}>Cancel</button>`}
    <button class="btn grow" disabled=${!ok} onClick=${() => (step === STEPS - 1 ? finish() : setStep(step + 1))}>
      ${step === STEPS - 1 ? (existing ? 'Save my plan' : 'Start') : 'Continue'}
    </button>
  </div>`;

  if (step === 0) return html`<div class="onb">
    <div class="eyebrow" style="padding-top:10vh">Your coach, in your pocket</div>
    <div class="hero-mark">Plates</div>
    <p class="muted prose" style="font-size:17px;margin:0">Food you weigh, lifts you log, and a plan that adjusts itself every week from what your body actually does.</p>
    <div class="col small muted">
      <div class="row top"><${Icon} n="scale" /><span>Calorie and protein targets from your body, your scan and your timeline.</span></div>
      <div class="row top"><${Icon} n="train" /><span>A strength program for your equipment, with demos for every exercise.</span></div>
      <div class="row top"><${Icon} n="progress" /><span>A weekly check-in that corrects your plan using your own data.</span></div>
    </div>
    <button class="btn block" style="margin-top:auto" onClick=${() => setStep(1)}>Set up my plan</button>
    <p class="tiny faint" style="margin:0">Takes about two minutes. General fitness guidance, not medical advice. If you are pregnant, under 18, or managing a health condition, check with your doctor first.</p>
  </div>`;

  return html`<div class="onb">
    <div class="steps" style=${`grid-template-columns:repeat(${STEPS - 1},1fr)`}>${Array.from({ length: STEPS - 1 }, (_, i) => html`<i class=${i < step ? 'on' : ''}></i>`)}</div>

    ${step === 1 && html`
      <div><div class="eyebrow">Step 1 of 5</div><h1 class="h1">About you</h1></div>
      <div class="field"><span class="lbl">Units</span>
        <${Seg} value=${d.units.h === 'in' ? 'us' : 'metric'} options=${[['metric', 'kg · cm'], ['us', 'lb · ft']]} onChange=${(v) => set({ units: v === 'us' ? { w: 'lb', h: 'in' } : { w: 'kg', h: 'cm' } })} />
      </div>
      <div class="field"><span class="lbl">Sex (sets the body-fat and energy formulas)</span>
        <${Seg} value=${d.sex} options=${[['m', 'Male'], ['f', 'Female']]} onChange=${(v) => set({ sex: v })} />
      </div>
      <div class="grid2">
        <div class="field"><label for="by">Birth year</label><${NumInput} id="by" value=${d.birthYear} onValue=${(v) => set({ birthYear: v })} /></div>
        <div class="field"><label for="wt">Weight today</label><${NumInput} id="wt" value=${d.weightKg ? E.roundTo(kgTo(d.weightKg, u), 0.1) : null} unit=${u} onValue=${(v) => set({ weightKg: v ? toKg(v, u) : null })} placeholder=${u === 'kg' ? '80' : '176'} /></div>
      </div>
      ${imperial ? html`<div class="grid2">
          <div class="field"><label for="hft">Height</label><${NumInput} id="hft" value=${Math.floor(d.heightCm / 30.48)} unit="ft" onValue=${(v) => set({ heightCm: (v || 0) * 30.48 + ((d.heightCm / 2.54) % 12) * 2.54 })} /></div>
          <div class="field"><label for="hin">&nbsp;</label><${NumInput} id="hin" value=${Math.round((d.heightCm / 2.54) % 12)} unit="in" onValue=${(v) => set({ heightCm: Math.floor(d.heightCm / 30.48) * 30.48 + (v || 0) * 2.54 })} /></div>
        </div>`
        : html`<div class="field"><label for="hcm">Height</label><${NumInput} id="hcm" value=${Math.round(d.heightCm)} unit="cm" onValue=${(v) => set({ heightCm: v })} /></div>`}
      <p class="hint">Weigh yourself in the morning, after the toilet, before food. Same time every day makes the trend honest.</p>
    `}

    ${step === 2 && html`
      <div><div class="eyebrow">Step 2 of 5 · optional</div><h1 class="h1">Body fat</h1></div>
      <p class="muted prose" style="margin:0">With your lean mass the calorie and protein targets get much more precise. Use a scan if you have one; otherwise a tape measure gets you within a few percent.</p>
      <div class="card">
        <div class="row between"><b>I have a scan</b><span class="pill">DEXA · InBody · smart scale</span></div>
        <${ScanReader} units=${d.units} onAdd=${(s) => set({ scans: [...d.scans.filter((x) => !(x.date === s.date && x.src === s.src)), s] })} defaultWeight=${d.weightKg} />
        ${d.scans.filter((s) => s.src !== 'navy').map((s) => html`<div class="row between small"><span>${s.date} · ${s.device || s.src}</span><b>${s.bf ? `${fmt(s.bf, 1)}% fat` : ''}${s.leanKg ? ` · ${fmtW(s.leanKg, u)} lean` : ''}</b></div>`)}
      </div>
      <div class="card">
        <b>Tape measure</b>
        <div class="grid2">
          <div class="field"><label for="waist">Waist at navel</label><${NumInput} id="waist" value=${d.waistCm ? E.roundTo(imperial ? d.waistCm / 2.54 : d.waistCm, 0.1) : null} unit=${imperial ? 'in' : 'cm'} onValue=${(v) => set({ waistCm: v ? (imperial ? v * 2.54 : v) : null })} /></div>
          <div class="field"><label for="neck">Neck, below the Adam's apple</label><${NumInput} id="neck" value=${d.neckCm ? E.roundTo(imperial ? d.neckCm / 2.54 : d.neckCm, 0.1) : null} unit=${imperial ? 'in' : 'cm'} onValue=${(v) => set({ neckCm: v ? (imperial ? v * 2.54 : v) : null })} /></div>
        </div>
        ${d.sex === 'f' && html`<div class="field"><label for="hip">Hips, widest point</label><${NumInput} id="hip" value=${d.hipCm ? E.roundTo(imperial ? d.hipCm / 2.54 : d.hipCm, 0.1) : null} unit=${imperial ? 'in' : 'cm'} onValue=${(v) => set({ hipCm: v ? (imperial ? v * 2.54 : v) : null })} /></div>`}
        ${navy ? html`<div class="row between"><span class="muted">US Navy estimate</span><b class="num">${fmt(navy, 1)}% body fat</b></div>` : html`<span class="hint">Relax your stomach and keep the tape level. Waist is also your best belly-fat tracker from here on.</span>`}
      </div>
      ${comp && html`<div class="row between small"><span class="muted">Used for your plan</span><b>${fmt(comp.bf, 1)}% fat · ${fmtW(comp.leanKg, u)} lean mass</b></div>`}
    `}

    ${step === 3 && html`
      <div><div class="eyebrow">Step 3 of 5</div><h1 class="h1">Your week</h1></div>
      <div class="field"><span class="lbl">Outside the gym, you are</span>
        <${Choice} value=${d.activity} options=${E.ACTIVITY} onChange=${(v) => set({ activity: v })} /></div>
      <div class="field"><span class="lbl">Strength sessions per week</span>
        <div class="chips">${[2, 3, 4, 5, 6].map((n) => html`<button class="chip" aria-pressed=${String(d.train.days === n)} onClick=${() => set({ train: { ...d.train, days: n } })}>${n} days</button>`)}</div>
        <span class="hint">${SPLITS[d.train.days].name}. ${d.train.days <= 3 ? 'About 50–60 minutes each.' : 'About 45–60 minutes each.'}</span></div>
      <div class="field"><span class="lbl">Where you train</span>
        <${Choice} value=${d.train.equipment} options=${Object.entries(EQUIPMENT).map(([id, e]) => ({ id, ...e }))} onChange=${(v) => set({ train: { ...d.train, equipment: v } })} /></div>
      <div class="field"><span class="lbl">Lifting experience</span>
        <${Choice} value=${d.train.level} options=${Object.entries(LEVELS).map(([id, e]) => ({ id, ...e }))} onChange=${(v) => set({ train: { ...d.train, level: v } })} /></div>
    `}

    ${step === 4 && plan && html`
      <div><div class="eyebrow">Step 4 of 5</div><h1 class="h1">Your goal</h1></div>
      ${suggestion && html`<div class="card">
        <div class="eyebrow">Suggested target</div>
        <div class="row between"><span class="display" style="font-size:40px">${fmtW(suggestion.targetKg, u)}</span>
          ${d.targetKg != null && Math.abs(d.targetKg - suggestion.targetKg) > 0.2 && html`<button class="btn xs soft" onClick=${() => set({ targetKg: null })}>Use this</button>`}</div>
        <span class="small muted">${suggestion.why === 'bf' ? `Gets you to about ${suggestion.goalBf}% body fat while keeping your current lean mass (plus a little new muscle). Belly fat is among the last to go, and this is roughly where most of it is gone.` : suggestion.why === 'bmi' ? 'Based on a healthy weight for your height. A body-fat measurement would make this sharper.' : 'You are already lean. The best move is a recomposition: eat near maintenance, lift hard, and let muscle replace fat.'}</span>
      </div>`}
      <div class="field"><label for="tw">Target weight</label><${NumInput} id="tw" value=${E.roundTo(kgTo(target, u), 0.5)} unit=${u} onValue=${(v) => set({ targetKg: v ? toKg(v, u) : null })} /></div>
      <div class="field"><span class="lbl">Timeframe</span>
        <div class="chips">${[8, 12, 16, 20, 26, 52].map((w) => html`<button class="chip" aria-pressed=${String(d.weeks === w)} onClick=${() => set({ weeks: w })}>${w < 52 ? `${w} weeks` : '1 year'}</button>`)}</div></div>
      <${Feasibility} plan=${plan} weeks=${d.weeks} u=${u} />
    `}

    ${step === 5 && plan && html`
      <div><div class="eyebrow">Step 5 of 5</div><h1 class="h1">Your plan</h1></div>
      <div class="card ink">
        <div class="eyebrow">Eat each day</div>
        <div class="row" style="align-items:baseline;gap:8px"><span class="display" style="font-size:64px">${fmt(plan.kcal)}</span><span>kcal</span></div>
        <div class="grid3">
          <div class="stat"><span class="v">${plan.p}<small>g</small></span><span class="l">Protein</span></div>
          <div class="stat"><span class="v">${plan.c}<small>g</small></span><span class="l">Carbs</span></div>
          <div class="stat"><span class="v">${plan.f}<small>g</small></span><span class="l">Fat</span></div>
        </div>
      </div>
      <dl class="kv card">
        <dt>Energy you burn (estimate)</dt><dd>${fmt(plan.tdee)} kcal</dd>
        <dt>${plan.deficit >= 0 ? 'Daily deficit' : 'Daily surplus'}</dt><dd>${fmt(Math.abs(plan.deficit))} kcal</dd>
        <dt>Expected change</dt><dd>${E.roundTo(kgTo(plan.rateKgWk, u), 0.05).toFixed(2)} ${u} / week</dd>
        <dt>Steps</dt><dd>${(STEP_GOAL[plan.mode] || 8000).toLocaleString()} a day</dd>
        <dt>Training</dt><dd>${d.train.days} × week</dd>
        <dt>Fiber</dt><dd>${plan.fiber} g</dd>
      </dl>
      <p class="small muted prose" style="margin:0">Protein is set high (${plan.p} g) because in a deficit it is what keeps your muscle. Your expenditure is a formula estimate for now. After 2–3 weeks of logging, the weekly check-in replaces it with what your own weight and food say, which is far more accurate.</p>
    `}
    ${nav}
  </div>`;
}

function Feasibility({ plan, weeks, u }) {
  const lose = plan.mode === 'cut';
  const gain = plan.mode === 'gain';
  const rate = Math.abs(kgTo(plan.rateKgWk, u));
  const reqRate = Math.abs(kgTo(plan.requestedKgWk, u));
  return html`<div class="card">
    <div class="row between"><b>${lose ? 'Fat loss' : gain ? 'Lean gain' : plan.mode === 'maintain' ? 'Maintain' : 'Recomposition'}</b>
      ${plan.capped ? html`<span class="pill warn">Timeline adjusted</span>` : html`<span class="pill good">On track</span>`}</div>
    ${(lose || gain) && html`<div class="grid2">
      <div class="stat"><span class="v">${rate.toFixed(2)}<small>${u}/wk</small></span><span class="l">Safe pace</span></div>
      <div class="stat"><span class="v">${plan.etaWeeks ? Math.ceil(plan.etaWeeks) : '–'}<small>weeks</small></span><span class="l">To reach it</span></div>
    </div>`}
    <span class="small muted">${plan.capped
      ? `Reaching it in ${weeks} weeks needs ${reqRate.toFixed(2)} ${u} a week. That would cost muscle and stall your metabolism, so the plan keeps you at ${rate.toFixed(2)} ${u} a week. In ${weeks} weeks you will be around ${fmtW(plan.reachByEnd, u)}; keep going after that.`
      : lose ? `At this pace you lose mostly fat and keep the muscle you build. Expect the scale to bounce day to day; the trend line is what counts.`
      : gain ? 'A small surplus keeps the gain lean. Most people can add 0.25–0.5% of body weight a month in muscle.'
      : plan.mode === 'maintain' ? 'Under 18, the plan keeps you at maintenance while you build strength.'
      : 'A small deficit with high protein and hard training: the scale moves slowly, your waist and strength tell the story.'}</span>
    ${plan.notes.includes('target_low') && html`<span class="err">That target is below a healthy weight for your height, so the plan stops at ${fmtW(plan.targetKg, u)}.</span>`}
  </div>`;
}
