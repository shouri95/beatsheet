// Training: today's session, set-by-set logging with suggested loads, a rest
// timer, demos for every movement, and the full exercise library.
import { useState, useEffect, useRef, useMemo } from 'preact/hooks';
import { html, useStore, Sheet, Icon, fmt, kgTo, toKg, unitW, openSheet, closeSheet, toast, NumInput, Confetti, shortDate, parseNum } from './kit.js';
import * as E from '../engine.js';
import { updateDay, setProfile, state } from '../store.js';
import { EX, EXERCISES, imgSrc, videoUrl } from '../data/exercises.js';
import { buildWorkout, nextWorkoutIndex, sessionsThisWeek, blockWeek, splitFor, suggest, exerciseHistory, slotOptions, findPRs, workoutVolume, loadTypeFor, bestE1rm, roundLoad } from '../program.js';

const isClaude = typeof window !== 'undefined' && !!window.claude;

export function Demo({ id, tall }) {
  const ex = EX[id];
  if (!ex.img) return html`<div class="demo noimg"><div class="col" style="align-items:center"><${Icon} n="play" /><span class="small">Watch the video below for this one.</span></div></div>`;
  return html`<div class=${`demo${tall ? ' tall' : ''}`}>
    <img src=${imgSrc(id, 0)} alt=${`${ex.name}: start position`} loading="lazy" />
    <img class="b" src=${imgSrc(id, 1)} alt=${`${ex.name}: end position`} loading="lazy" />
    <span class="tag">Start ↔ finish</span>
  </div>`;
}

const Thumb = ({ id }) => html`<span class="thumb">${EX[id].img ? html`<img src=${imgSrc(id, 1)} alt="" loading="lazy" />` : null}</span>`;
const repsLabel = (it, id) => (EX[id].load === 'time' ? `${it.lo}–${it.hi} s` : EX[id].load === 'carry' ? `${it.lo}–${it.hi} m` : `${it.lo}–${it.hi}${EX[id].side ? ' / side' : ''}`);

export function Train() {
  const s = useStore();
  const p = s.profile;
  const today = E.dateKey();
  const live = s.days[today]?.workout;
  if (live && !live.done) return html`<${Session} w=${live} />`;
  return html`<${Plan} />`;
}

function Plan() {
  const s = useStore();
  const p = s.profile;
  const today = E.dateKey();
  const split = splitFor(p.train);
  const nextIdx = nextWorkoutIndex(s.days, today) % split.days.length;
  const [idx, setIdx] = useState(nextIdx);
  const w = buildWorkout(p.train, idx);
  const bw = blockWeek(p.goal.startDate, today);
  const done = sessionsThisWeek(s.days, today);
  const u = unitW(p);
  const finishedToday = s.days[today]?.workout?.done;

  const start = () => {
    const ex = w.items.map((it) => {
      const lt = loadTypeFor(it.id, p.train.equipment);
      const sg = suggest(it, exerciseHistory(s.days, it.id, today), { unit: u, deload: bw.deload, loadType: lt });
      const sets = bw.deload ? Math.max(1, Math.ceil(it.sets / 2)) : it.sets;
      return { ...it, note: sg.note, sets: Array.from({ length: sets }, () => ({ w: sg.w ?? null, r: sg.reps, done: false })) };
    });
    updateDay(today, (d) => { d.workout = { idx, name: w.name, started: Date.now(), ex, done: false, deload: bw.deload, rir: bw.rir }; });
  };

  return html`
    <header class="page-head"><div class="col tight"><span class="eyebrow">${split.name}</span><h1 class="h1">Train</h1></div>
      <button class="btn xs soft" onClick=${() => openSheet('library', {})}><${Icon} n="book" cls="sm" />Exercises</button></header>
    <div class="grid3">
      <div class="stat"><span class="v">${done}<small>/ ${p.train.days}</small></span><span class="l">This week</span></div>
      <div class="stat"><span class="v">${bw.inBlock}<small>/ 5</small></span><span class="l">Block week</span></div>
      <div class="stat"><span class="v">${bw.deload ? 'Easy' : bw.rir}</span><span class="l">${bw.deload ? 'Deload week' : 'Reps in reserve'}</span></div>
    </div>
    <p class="small muted prose" style="margin:0">${bw.deload ? 'Deload week: half the sets, a little lighter. It lets your joints and nervous system catch up so the next block goes further.' : `Stop each set with about ${bw.rir} good rep${bw.rir === 1 ? '' : 's'} left in you. Close to failure is where muscle is built; past it is where form breaks.`}</p>

    <div class="chips">${split.days.map((d, i) => html`<button class="chip" aria-pressed=${String(idx === i)} onClick=${() => setIdx(i)}>${d.name}${i === nextIdx ? ' · next' : ''}</button>`)}</div>

    <section class="card flush">
      <div class="col" style="padding:16px 16px 6px;gap:4px"><span class="h2">${w.name}</span><span class="small faint">${w.focus} · about ${Math.round(w.items.reduce((a, i) => a + i.sets * (i.rest + 45), 0) / 60 + 8)} min</span></div>
      <div class="list">${w.items.map((it) => {
        const h = exerciseHistory(s.days, it.id, today)[0];
        return html`<button class="item" onClick=${() => openSheet('exercise', { id: it.id, slot: it.slot, slotKey: it.key })}>
          <${Thumb} id=${it.id} />
          <div class="grow"><div class="t">${EX[it.id].name}</div>
          <div class="s">${it.sets} × ${repsLabel(it, it.id)}${h ? ` · last ${h.sets.map((x) => (x.w ? `${fmt(kgTo(x.w, u), 1)}×${x.r}` : x.r)).slice(0, 3).join(', ')}` : ''}</div></div>
          <${Icon} n="next" cls="sm" /></button>`;
      })}</div>
    </section>
    ${finishedToday ? html`<div class="pill good" style="align-self:flex-start"><${Icon} n="check" cls="sm" />${s.days[today].workout.name} done today</div>`
      : html`<button class="btn block" onClick=${start}><${Icon} n="play" cls="sm" />Start ${w.name}</button>`}
    <${Conditioning} />
    <${Recent} />
  `;
}

function Conditioning() {
  const s = useStore();
  const p = s.profile;
  const today = E.dateKey();
  const day = s.days[today] || {};
  const [min, setMin] = useState(day.cardioMin || null);
  const from = E.addDays(today, -6);
  const week = Object.keys(s.days).filter((k) => k >= from && k <= today).reduce((a, k) => a + (s.days[k]?.cardioMin || 0), 0);
  const goal = p.targets.mode === 'cut' ? 90 : 60;
  return html`<section class="card">
    <div class="row between"><b>Easy cardio</b><span class="small faint">${week} / ${goal} min this week</span></div>
    <div class="bar"><i style=${`width:${Math.min(100, (week / goal) * 100)}%;background:var(--ink)`}></i></div>
    <span class="small muted">Brisk or incline walking, cycling, rowing. Easy enough to talk. It burns fat without eating into recovery. Do it on rest days or after lifting, never before.</span>
    <div class="row"><div class="grow"><${NumInput} id="cardio" value=${min} unit="min" placeholder="Minutes today" onValue=${setMin} /></div>
      <button class="btn ghost" disabled=${!(min >= 0)} onClick=${() => { updateDay(today, (d) => { d.cardioMin = Math.round(min); d.cardioSrc = 'manual'; }); toast('Cardio saved'); }}>Save</button></div>
    ${(day.exercises || []).length > 0 && html`<span class="tiny faint">From Fitbit today: ${day.exercises.map((x) => `${x.name} ${x.min} min`).join(' · ')}</span>`}
  </section>`;
}

function Recent() {
  const s = useStore();
  const u = unitW(s.profile);
  const keys = Object.keys(s.days).filter((k) => s.days[k]?.workout?.done).sort().reverse().slice(0, 6);
  if (!keys.length) return null;
  return html`<div class="col tight"><span class="eyebrow">Recent sessions</span>
    <div class="card flush"><div class="list">${keys.map((k) => {
      const w = s.days[k].workout; const v = workoutVolume(w);
      return html`<button class="item" onClick=${() => openSheet('session', { date: k })}><div class="grow"><div class="t">${w.name}</div><div class="s">${shortDate(k)} · ${v.sets} set${v.sets === 1 ? '' : 's'} · ${fmt(kgTo(v.volume, u))} ${u} lifted</div></div>${w.prs?.length ? html`<span class="pill ink"><${Icon} n="trophy" cls="sm" />${w.prs.length}</span>` : null}</button>`;
    })}</div></div></div>`;
}

/* ───────────── live session ───────────── */

let audioCtx;
function beep() {
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.frequency.value = 880; g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.25, audioCtx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.5);
    o.connect(g).connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + 0.55);
    navigator.vibrate?.([120, 80, 120]);
  } catch { /* sound is optional */ }
}

function Session({ w }) {
  const s = useStore();
  const p = s.profile;
  const u = unitW(p);
  const today = E.dateKey();
  const [rest, setRest] = useState(null); // {until, total}
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!rest) return;
    const id = setInterval(() => {
      const n = Date.now(); setNow(n);
      if (n >= rest.until) { setRest(null); beep(); }
    }, 250);
    return () => clearInterval(id);
  }, [rest]);
  useEffect(() => {
    let lock;
    navigator.wakeLock?.request('screen').then((l) => { lock = l; }).catch(() => {});
    return () => lock?.release?.().catch(() => {});
  }, []);

  const edit = (fn) => updateDay(today, (d) => { fn(d.workout); });
  const allDone = w.ex.every((it) => it.sets.every((x) => x.done));
  const doneSets = w.ex.reduce((a, it) => a + it.sets.filter((x) => x.done).length, 0);
  const totalSets = w.ex.reduce((a, it) => a + it.sets.length, 0);

  const finish = () => {
    const prs = findPRs(state.days, today, w);
    edit((wo) => { wo.done = true; wo.ended = Date.now(); wo.prs = prs; wo.ex = wo.ex.map((it) => ({ ...it, sets: it.sets.filter((x) => x.done) })).filter((it) => it.sets.length); });
    openSheet('summary', { summary: { prs, vol: workoutVolume({ ex: w.ex.map((it) => ({ ...it, sets: it.sets.filter((x) => x.done) })) }), min: Math.max(1, Math.round((Date.now() - w.started) / 60000)) }, name: w.name });
  };

  return html`
    <header class="page-head"><div class="col tight"><span class="eyebrow">${w.deload ? 'Deload · easy' : `Stop ${w.rir ?? 2} reps short of failure`}</span><h1 class="h1">${w.name}</h1></div>
      <span class="pill num">${doneSets}/${totalSets} sets</span></header>
    <div class="bar"><i style=${`width:${(doneSets / Math.max(1, totalSets)) * 100}%;background:var(--ink)`}></i></div>
    ${w.ex.map((it, n) => html`<${ExerciseLog} key=${it.id + n} it=${it} n=${n} u=${u} edit=${edit} onRest=${(sec) => setRest({ until: Date.now() + sec * 1000, total: sec })} />`)}
    <div class="row">
      <button class="btn ghost" onClick=${() => { if (doneSets === 0) updateDay(today, (d) => { delete d.workout; }); else openSheet('confirmDiscard', {}); }}>${doneSets ? 'Discard' : 'Cancel'}</button>
      <button class="btn grow" disabled=${!doneSets} onClick=${finish}>${allDone ? 'Finish workout' : `Finish (${doneSets} sets)`}</button>
    </div>
    ${rest && html`<div class="restbar" role="timer" aria-live="polite">
      <${Icon} n="timer" /><span class="t num">${fmtClock(Math.max(0, rest.until - now))}</span><span class="grow small" style="opacity:.75">Rest</span>
      <button class="btn xs" onClick=${() => setRest({ ...rest, until: rest.until + 30000 })}>+30 s</button>
      <button class="btn xs" onClick=${() => setRest(null)}>Skip</button></div>`}
  `;
}
const fmtClock = (ms) => { const t = Math.ceil(ms / 1000); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };

const NOTE = {
  first: 'First time: pick a weight you could lift about 3 more times than the target. Write down what you used.',
  up: 'You hit the top of the range last time. Weight goes up.',
  same: 'Same weight, one more rep than last time.',
  down: 'Two tough sessions in a row. A little lighter to build back up.',
  deload: 'Deload: lighter and fewer sets.',
  harder: 'You maxed the range. Slow the lowering to 3 seconds, add a pause, or move to a harder variation.',
  hold_longer: 'You maxed the range. Hold 10 seconds longer or make it harder.',
};

function ExerciseLog({ it, n, u, edit, onRest }) {
  const s = useStore();
  const ex = EX[it.id];
  const lt = loadTypeFor(it.id, s.profile.train.equipment);
  const weighted = lt !== 'bw' && lt !== 'time';
  const allDone = it.sets.every((x) => x.done);
  const setVal = (i, k, v) => edit((wo) => { const x = wo.ex[n].sets[i]; x[k] = v; });
  const tick = (i) => {
    const x = it.sets[i];
    edit((wo) => {
      const set = wo.ex[n].sets[i];
      set.done = !set.done;
      // Carry the weight forward to the next sets that have none yet.
      if (set.done && set.w != null) for (let j = i + 1; j < wo.ex[n].sets.length; j++) if (wo.ex[n].sets[j].w == null && !wo.ex[n].sets[j].done) wo.ex[n].sets[j].w = set.w;
    });
    if (!x.done) onRest(it.rest);
  };
  return html`<section class=${`ex-card${allDone ? ' done' : ''}`}>
    <div class="ex-head">
      <button style="all:unset;cursor:pointer" onClick=${() => openSheet('exercise', { id: it.id, slot: it.slot, slotKey: it.key, live: n })} aria-label=${`How to do ${ex.name}`}><${Thumb} id=${it.id} /></button>
      <div class="grow"><b>${ex.name}</b><div class="small faint">${it.sets.length} × ${repsLabel(it, it.id)} · rest ${Math.round(it.rest / 60 * 10) / 10} min</div></div>
      <button class="icon-btn" aria-label="Exercise options" onClick=${() => openSheet('exercise', { id: it.id, slot: it.slot, slotKey: it.key, live: n })}><${Icon} n="info" /></button>
    </div>
    ${it.note && !allDone && html`<p class="small muted" style="margin:0 14px 10px">${NOTE[it.note]}</p>`}
    <div class="set-labels"><span>Set</span><span>${weighted ? u : lt === 'time' ? '' : 'Added ' + u}</span><span>${lt === 'time' ? 'Seconds' : lt === 'carry' ? 'Meters' : 'Reps'}</span><span></span></div>
    <div class="sets">${it.sets.map((x, i) => html`<div class="set-row">
      <span class="n">${i + 1}</span>
      ${lt === 'time' ? html`<span></span>` : html`<${Cell} label=${`Set ${i + 1} weight`} placeholder=${weighted ? '–' : '0'} value=${x.w != null ? +kgTo(x.w, u).toFixed(2) : null}
        onValue=${(v) => setVal(i, 'w', v == null ? null : toKg(v, u))} />`}
      <${Cell} label=${`Set ${i + 1} ${lt === 'time' ? 'seconds' : 'reps'}`} numeric value=${x.r ?? null} onValue=${(v) => setVal(i, 'r', v)} />
      <button class="tick" aria-pressed=${String(!!x.done)} aria-label=${`Set ${i + 1} done`} onClick=${() => tick(i)}><${Icon} n="check" /></button>
    </div>`)}
      <div class="row"><button class="btn xs ghost" onClick=${() => edit((wo) => { const last = wo.ex[n].sets[wo.ex[n].sets.length - 1]; wo.ex[n].sets.push({ w: last?.w ?? null, r: last?.r ?? it.lo, done: false }); })}><${Icon} n="plus" cls="sm" />Set</button>
      ${it.sets.length > 1 && html`<button class="btn xs ghost" onClick=${() => edit((wo) => { wo.ex[n].sets.pop(); })}>Remove set</button>`}
      ${weighted && it.sets[0]?.w > 0 && ex.load === 'bb' && html`<${Plates} kg=${it.sets.find((x) => !x.done)?.w ?? it.sets[0].w} u=${u} />`}</div>
    </div>
  </section>`;
}

// A set cell keeps its own text while you type, so the rest timer ticking in
// the background never wipes a half-typed "62.".
function Cell({ value, onValue, label, placeholder, numeric }) {
  const [text, setText] = useState(value == null ? '' : String(value));
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setText(value == null ? '' : String(value)); }, [value]);
  return html`<input class="input" inputmode=${numeric ? 'numeric' : 'decimal'} aria-label=${label} placeholder=${placeholder} value=${text}
    onFocus=${(e) => { focused.current = true; e.target.select(); }}
    onBlur=${() => { focused.current = false; setText(value == null ? '' : String(value)); }}
    onInput=${(e) => { setText(e.target.value); onValue(parseNum(e.target.value)); }} />`;
}

function Plates({ kg, u }) {
  const bar = u === 'lb' ? 45 : 20;
  const plates = u === 'lb' ? [45, 35, 25, 10, 5, 2.5] : [25, 20, 15, 10, 5, 2.5, 1.25];
  const r = E.plateLoad(+kgTo(kg, u).toFixed(2), bar, plates);
  if (!r || !r.perSide.length) return null;
  return html`<span class="small faint grow" style="text-align:right">Per side: ${r.perSide.join(' + ')}</span>`;
}

export function Summary({ summary, name }) {
  const u = unitW(state.profile);
  const onClose = closeSheet;
  return html`${summary.prs.length > 0 && html`<${Confetti} />`}
  <${Sheet} title="Workout done" onClose=${onClose} foot=${html`<button class="btn block" onClick=${onClose}>Done</button>`}>
    <div class="h1">${name}</div>
    <div class="grid3">
      <div class="stat"><span class="v">${summary.min}<small>min</small></span><span class="l">Time</span></div>
      <div class="stat"><span class="v">${summary.vol.sets}</span><span class="l">Sets</span></div>
      <div class="stat"><span class="v">${fmt(kgTo(summary.vol.volume, u))}<small>${u}</small></span><span class="l">Lifted</span></div>
    </div>
    ${summary.prs.length ? html`<div class="card ink"><div class="row"><${Icon} n="trophy" /><b>${summary.prs.length} new personal record${summary.prs.length > 1 ? 's' : ''}</b></div>
      ${summary.prs.map((x) => html`<div class="row between small"><span>${EX[x.id].name}</span><span>est. 1-rep max ${fmt(kgTo(x.e1rm, u), 1)} ${u} (was ${fmt(kgTo(x.prev, u), 1)})</span></div>`)}</div>`
      : html`<p class="muted">Logged. Next time the app will nudge the weights or reps up where you earned it.</p>`}
    <p class="small muted" style="margin:0">Now: protein within a couple of hours, and the rest of today's food as planned.</p>
  <//>`;
}

export function ConfirmDiscard() {
  const today = E.dateKey();
  return html`<${Sheet} title="Discard this workout?" foot=${html`<button class="btn ghost grow" onClick=${closeSheet}>Keep going</button><button class="btn grow" onClick=${() => { updateDay(today, (d) => { delete d.workout; }); closeSheet(); }}>Discard</button>`}>
    <p class="muted" style="margin:0">The sets you have ticked will be deleted and won't count toward your progress.</p><//>`;
}

/* ───────────── exercise detail ───────────── */

export function ExerciseSheet({ id, slot, slotKey, live }) {
  const s = useStore();
  const p = s.profile;
  const ex = EX[id];
  const u = unitW(p);
  const [play, setPlay] = useState(false);
  const hist = exerciseHistory(s.days, id).slice(0, 8);
  const opts = slot ? slotOptions(slot, p.train.equipment).filter((x) => x !== id) : [];
  const swap = (to) => {
    setProfile({ train: { ...p.train, swaps: { ...(p.train.swaps || {}), [slotKey]: to } } });
    const today = E.dateKey();
    if (live != null) updateDay(today, (d) => { const it = d.workout?.ex?.[live]; if (it && !it.sets.some((x) => x.done)) { it.id = to; it.note = 'first'; it.sets = it.sets.map(() => ({ w: null, r: it.hi, done: false })); } });
    toast(`Swapped to ${EX[to].name}`);
    closeSheet();
  };
  return html`<${Sheet} title=${ex.name} full>
    <${Demo} id=${id} tall=${id === 'split_squat' || id === 'assisted_pullup'} />
    <div class="row wrap"><span class="pill">${ex.muscles}</span>${ex.side && html`<span class="pill">Each side</span>`}</div>
    <div class="col tight"><span class="eyebrow">How to do it</span><ol class="cues">${ex.cues.map((c) => html`<li>${c}</li>`)}</ol></div>
    <div class="card"><span class="eyebrow">Most common mistake</span><span>${ex.mistake}</span></div>
    ${!isClaude && play ? html`<iframe class="video-frame" src=${`https://www.youtube-nocookie.com/embed/${ex.v}?autoplay=1&rel=0`} title=${`${ex.name} tutorial`} allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`
      : !isClaude ? html`<button class="btn soft block" onClick=${() => setPlay(true)}><${Icon} n="play" cls="sm" />Watch the form video</button>`
      : html`<a class="btn soft block" href=${videoUrl(id)} target="_blank" rel="noopener noreferrer"><${Icon} n="play" cls="sm" />Watch the form video on YouTube</a>`}
    ${hist.length > 0 && html`<div class="col tight"><span class="eyebrow">Your history</span>
      <div class="card flush"><div class="list">${hist.map((h) => html`<div class="item"><div class="grow"><div class="t">${shortDate(h.date)}</div>
        <div class="s">${h.sets.map((x) => (x.w ? `${fmt(kgTo(x.w, u), 1)} × ${x.r}` : `${x.r}`)).join(' · ')}</div></div>
        ${bestE1rm(h.sets) > 0 && html`<span class="small faint">e1RM ${fmt(kgTo(bestE1rm(h.sets), u), 1)}</span>`}</div>`)}</div></div></div>`}
    ${opts.length > 0 && html`<div class="col tight"><span class="eyebrow">Swap for</span>
      <div class="card flush"><div class="list">${opts.map((o) => html`<button class="item" onClick=${() => swap(o)}><${Thumb} id=${o} /><div class="grow"><div class="t">${EX[o].name}</div><div class="s">${EX[o].muscles}</div></div><${Icon} n="swap" cls="sm" /></button>`)}</div></div>
      <span class="hint">Swaps stick for this slot in future workouts too. Swap when a machine is taken or something hurts; otherwise sticking with the same lifts is how you see progress.</span></div>`}
  <//>`;
}

export function LibrarySheet() {
  const [q, setQ] = useState('');
  const list = EXERCISES.filter((e) => !q || `${e.name} ${e.muscles}`.toLowerCase().includes(q.toLowerCase()));
  return html`<${Sheet} title="Exercise library" full>
    <div class="search"><${Icon} n="search" /><input id="ex-q" class="input" placeholder="Search by name or muscle" value=${q} onInput=${(e) => setQ(e.target.value)} /></div>
    <div class="card flush"><div class="list">${list.map((e) => html`<button class="item" onClick=${() => openSheet('exercise', { id: e.id })}><${Thumb} id=${e.id} /><div class="grow"><div class="t">${e.name}</div><div class="s">${e.muscles}</div></div></button>`)}</div></div>
    <p class="tiny faint">Photos: Free Exercise DB (public domain). Videos open on YouTube.</p>
  <//>`;
}

export function SessionSheet({ date }) {
  const s = useStore();
  const u = unitW(s.profile);
  const w = s.days[date]?.workout;
  if (!w) return null;
  return html`<${Sheet} title=${`${w.name} · ${shortDate(date)}`}>
    ${w.ex.map((it) => html`<div class="col tight"><b>${EX[it.id].name}</b><span class="small muted">${it.sets.map((x) => (x.w ? `${fmt(kgTo(x.w, u), 1)} ${u} × ${x.r}` : `${x.r}`)).join(' · ')}</span></div>`)}
    <button class="btn ghost" onClick=${() => { updateDay(date, (d) => { delete d.workout; }); closeSheet(); toast('Workout deleted'); }}><${Icon} n="trash" cls="sm" />Delete this workout</button>
  <//>`;
}
