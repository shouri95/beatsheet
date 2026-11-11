// Coach: the weekly check-in that re-tunes your targets, why the numbers are
// what they are, and (inside Claude) a coach you can ask anything.
import { useState, useEffect, useRef } from 'preact/hooks';
import { html, useStore, Icon, fmt, fmtW, kgTo, unitW, signed, toast, shortDate } from './kit.js';
import * as E from '../engine.js';
import { setProfile, state } from '../store.js';
import { weekReview, reviewNotes, targetsFrom, checkinDue, contextFor, computePlan } from '../coach.js';
import { getSample, askCoach, aiErrorText } from '../ai.js';
import { SPLITS, EQUIPMENT } from '../program.js';

export function Coach({ go }) {
  const s = useStore();
  const p = s.profile;
  const today = E.dateKey();
  const due = checkinDue(p, today);
  const [open, setOpen] = useState(due);
  return html`
    <header class="page-head"><div class="col tight"><span class="eyebrow">${due ? 'Check-in ready' : `Next check-in ${shortDate(E.addDays(p.coach?.lastCheckin || today, 7))}`}</span><h1 class="h1">Coach</h1></div>
      <button class="icon-btn solid" onClick=${() => go('profile')} aria-label="Plan and settings"><${Icon} n="gear" /></button></header>
    ${open ? html`<${Checkin} onDone=${() => setOpen(false)} />`
      : html`<button class="btn soft block" onClick=${() => setOpen(true)}><${Icon} n="cal" cls="sm" />Run a check-in now</button>`}
    <${Ask} />
    <${Explain} />
  `;
}

function Checkin({ onDone }) {
  const s = useStore();
  const p = s.profile;
  const u = unitW(p);
  const today = E.dateKey();
  const r = weekReview(p, s.days, today);
  const notes = reviewNotes(p, r);
  const t = p.targets;
  const next = targetsFrom(r.plan, today);
  const changed = Math.abs(next.kcal - t.kcal) >= 30 || Math.abs(next.p - t.p) >= 10;
  const apply = () => {
    const hist = [...(p.coach?.history || []), { date: today, kcal: next.kcal, p: next.p, tdee: next.tdee, source: next.source, weight: r.wNow }].slice(-52);
    setProfile({ targets: next, coach: { ...(p.coach || {}), lastCheckin: today, history: hist } });
    toast(changed ? `New target: ${fmt(next.kcal)} kcal` : 'Check-in saved');
    onDone();
  };
  const tone = (x) => (x === 'good' ? 'good' : x === 'warn' ? 'warn' : '');
  return html`<section class="card raised">
    <div class="row between"><span class="h2">Your week</span><span class="small faint">${shortDate(E.addDays(today, -7))} – ${shortDate(E.addDays(today, -1))}</span></div>
    <div class="grid3">
      <div class="stat"><span class="v">${r.change != null ? signed(kgTo(r.change, u)) : '–'}<small>${u}</small></span><span class="l">Trend change</span></div>
      <div class="stat"><span class="v">${r.logged ? fmt(r.avgKcal) : '–'}</span><span class="l">Avg kcal (${r.logged}/7 days)</span></div>
      <div class="stat"><span class="v">${r.logged ? fmt(r.avgProtein) : '–'}<small>g</small></span><span class="l">Avg protein</span></div>
    </div>
    <div class="col">${notes.map((n) => html`<div class="col tight"><div class="row"><span class=${`pill ${tone(n.tone)}`}>${n.tone === 'good' ? 'Good' : n.tone === 'warn' ? 'Fix' : 'Note'}</span><b>${n.title}</b></div><span class="small muted">${n.body}</span></div>`)}</div>
    <hr class="sep" />
    <div class="col tight">
      <span class="eyebrow">Expenditure</span>
      <span class="small muted">${r.plan.adaptive
        ? `From your last ${r.plan.adaptive.loggedDays} logged days and ${r.plan.adaptive.weighIns} weigh-ins you burn about ${fmt(r.plan.adaptive.tdee)} kcal a day (formula said ${fmt(r.plan.formulaTdee)}). The plan now trusts your data ${Math.round(r.plan.tdeeConfidence * 100)}%.`
        : `Still using the formula (${fmt(r.plan.formulaTdee)} kcal). After about two weeks of logging food and weighing in on most days, your own data takes over.`}</span>
    </div>
    <div class="row between top">
      <div class="col tight"><span class="eyebrow">Current</span><span class="display" style="font-size:30px">${fmt(t.kcal)}</span><span class="small faint">${t.p}P · ${t.c}C · ${t.f}F</span></div>
      <${Icon} n="next" />
      <div class="col tight" style="text-align:right"><span class="eyebrow">${changed ? 'New' : 'Unchanged'}</span><span class="display" style="font-size:30px">${fmt(next.kcal)}</span><span class="small faint">${next.p}P · ${next.c}C · ${next.f}F</span></div>
    </div>
    ${r.plan.capped && html`<span class="small muted">The deficit is held at a safe maximum; the timeline is what flexes.</span>`}
    <button class="btn block" onClick=${apply}>${changed ? 'Apply new targets' : 'Keep going'}</button>
  </section>`;
}

function Explain() {
  const s = useStore();
  const p = s.profile;
  const u = unitW(p);
  const plan = computePlan(p, s.days);
  const t = p.targets;
  const comp = E.bodyComp(p, plan.weightKg);
  return html`<section class="card">
    <span class="h2">Why these numbers</span>
    <dl class="kv">
      <dt>Resting burn (${plan.bmrMethod === 'katch' ? 'from your lean mass' : 'from height, weight, age'})</dt><dd>${fmt(plan.bmr)} kcal</dd>
      <dt>Total daily burn</dt><dd>${fmt(t.tdee)} kcal</dd>
      <dt>Your target</dt><dd>${fmt(t.kcal)} kcal</dd>
      <dt>${t.tdee >= t.kcal ? 'Deficit' : 'Surplus'}</dt><dd>${fmt(Math.abs(t.tdee - t.kcal))} kcal / day</dd>
      <dt>Expected pace</dt><dd>${signed(kgTo(((t.kcal - t.tdee) * 7) / E.KCAL_PER_KG, u), 2)} ${u} / week</dd>
      ${comp && html`<dt>Lean mass</dt><dd>${fmtW(comp.leanKg, u)}</dd>`}
    </dl>
    <div class="prose small muted">
      <p><b>Belly fat.</b> You can't burn fat from one spot; crunches strengthen the muscle underneath but don't remove the fat on top. Belly fat comes off with overall fat loss, and for most people it is among the last places to go. What works: the calorie deficit above, protein at ${t.p} g, lifting ${p.train.days}× a week, ${(t.steps || 8000).toLocaleString()} steps, and 7+ hours of sleep. Your waist measurement shows it first.</p>
      <p><b>Protein.</b> ${t.p} g a day (${fmt(t.p / plan.weightKg, 1)} g per kg). In a deficit, high protein and heavy lifting are what make the weight you lose come from fat, not muscle. Spread it over 3–5 meals.</p>
      <p><b>Building lean muscle.</b> ${SPLITS[p.train.days]?.name || 'Your program'} on ${EQUIPMENT[p.train.equipment]?.label.toLowerCase() || 'your equipment'}. Every session the app asks for a little more: one more rep, or more weight once you top the rep range. Every fifth week is lighter so you recover.</p>
      <p><b>Accuracy.</b> The formulas are a starting point, typically within ±10%. The weekly check-in compares what you ate with what your weight did and corrects your burn from your own data. Weigh food on a kitchen scale and weigh yourself most mornings, and that correction gets very precise.</p>
    </div>
  </section>`;
}

const STARTERS = [
  'What should I eat for dinner with what I have left today?',
  'Why is my weight not moving?',
  'How do I lose belly fat specifically?',
  'Squats hurt my knees. What should I do instead?',
];

function Ask() {
  const [sample, setSample] = useState(undefined);
  useEffect(() => { getSample().then(setSample); }, []);
  const [turns, setTurns] = useState([]);
  const [text, setText] = useState('');
  const [live, setLive] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const ctl = useRef(null);
  if (!sample) return null;
  const send = async (q) => {
    const msg = (q || text).trim();
    if (!msg || busy) return;
    const next = [...turns, { role: 'user', content: msg }];
    setTurns(next); setText(''); setBusy(true); setErr(''); setLive('');
    ctl.current = new AbortController();
    try {
      const { text: ans } = await askCoach(next, contextFor(state.profile, state.days), { onText: ({ text: t }) => setLive(t), signal: ctl.current.signal });
      setTurns([...next, { role: 'assistant', content: ans }]);
    } catch (e) {
      if (e?.text) setTurns([...next, { role: 'assistant', content: e.text }]);
      const m = aiErrorText(e); if (m) setErr(m);
    }
    setLive(''); setBusy(false);
  };
  return html`<section class="card">
    <div class="row between"><span class="h2">Ask your coach</span>${turns.length > 0 && html`<button class="btn xs ghost" onClick=${() => { ctl.current?.abort(); setTurns([]); }}>Clear</button>`}</div>
    ${!turns.length && html`<div class="chips">${STARTERS.map((q) => html`<button class="chip" style="height:auto;min-height:34px;padding:7px 12px;text-align:left" onClick=${() => send(q)}>${q}</button>`)}</div>`}
    ${turns.length > 0 && html`<div class="col">${turns.map((t) => html`<div class=${`bubble ${t.role === 'user' ? 'me' : 'ai'}`}>${t.content}</div>`)}
      ${busy && html`<div class="bubble ai">${live || 'Thinking…'}</div>`}</div>`}
    ${err && html`<span class="err">${err}</span>`}
    <form class="row" onSubmit=${(e) => { e.preventDefault(); send(); }}>
      <input id="ask" class="input grow" value=${text} onInput=${(e) => setText(e.target.value)} placeholder="Ask about food, training, your plan" />
      ${busy ? html`<button type="button" class="btn" onClick=${() => ctl.current?.abort()}>Stop</button>` : html`<button class="btn" disabled=${!text.trim()}>Ask</button>`}
    </form>
    <span class="tiny faint">Your coach sees your targets and the last 7 days of your log. Not medical advice.</span>
  </section>`;
}
