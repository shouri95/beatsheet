// Training: which workout comes next, which exercises fill it for your
// equipment and experience, and what weight to put on the bar.
// Pure functions; tested in tests/program.test.mjs.
import { EX } from './data/exercises.js';
import { addDays, diffDays, e1rm, roundTo, KG_PER_LB } from './engine.js';

export const EQUIPMENT = {
  gym: { label: 'Full gym', hint: 'Barbells, racks, machines, cables', has: ['bb', 'rack', 'db', 'bench', 'machine', 'cable', 'bar', 'band', 'wheel', 'none'] },
  home: { label: 'Home gym', hint: 'Dumbbells, a bench, a pull-up bar and a band', has: ['db', 'bench', 'bar', 'band', 'none'] },
  bw: { label: 'No equipment', hint: 'Bodyweight only, plus a sturdy table', has: ['none'] },
};

export const LEVELS = {
  new: { label: 'New to lifting', hint: 'Under 6 months of regular training' },
  mid: { label: 'Some experience', hint: '6 months to 2 years' },
  exp: { label: 'Experienced', hint: '2+ years, you know your lifts' },
};

// Each slot lists candidates in order of preference; the first one your
// equipment allows wins. `new` overrides the order for beginners.
const SLOTS = {
  squat: { label: 'Squat', opts: ['squat', 'goblet_squat', 'leg_press', 'split_squat', 'bw_squat'], new: ['goblet_squat', 'leg_press', 'bw_squat'] },
  squat2: { label: 'Quads', opts: ['leg_press', 'split_squat', 'goblet_squat', 'bw_squat'] },
  hinge: { label: 'Hinge', opts: ['rdl', 'db_rdl', 'back_ext', 'sl_glute_bridge'], new: ['db_rdl', 'rdl', 'glute_bridge'] },
  hinge_heavy: { label: 'Hinge', opts: ['deadlift', 'rdl', 'db_rdl', 'sl_glute_bridge'], new: ['rdl', 'db_rdl', 'glute_bridge'] },
  lunge: { label: 'Single leg', opts: ['split_squat', 'rear_lunge', 'lunge', 'step_up'], new: ['rear_lunge', 'step_up', 'split_squat'] },
  glute: { label: 'Glutes', opts: ['hip_thrust', 'glute_bridge'] },
  hamcurl: { label: 'Hamstrings', opts: ['leg_curl', 'seated_leg_curl', 'sl_glute_bridge'] },
  quadiso: { label: 'Quads', opts: ['leg_ext', 'step_up'] },
  hpush: { label: 'Chest press', opts: ['bench', 'db_bench', 'machine_press', 'pushup'], new: ['db_bench', 'machine_press', 'incline_pushup'] },
  hpush2: { label: 'Chest press', opts: ['db_bench', 'machine_press', 'dips', 'pushup'] },
  ipush: { label: 'Incline press', opts: ['incline_db', 'incline_bb', 'decline_pushup'], new: ['incline_db', 'pushup'] },
  vpush: { label: 'Overhead press', opts: ['ohp', 'db_press', 'pike_pushup'], new: ['db_press', 'pike_pushup'] },
  vpull: { label: 'Vertical pull', opts: ['pullup', 'lat_pulldown', 'chinup', 'inverted_row'], new: ['lat_pulldown', 'assisted_pullup', 'inverted_row'] },
  vpull2: { label: 'Vertical pull', opts: ['close_pulldown', 'chinup', 'lat_pulldown', 'inverted_row'] },
  hpull: { label: 'Row', opts: ['cable_row', 'bb_row', 'db_row', 'inverted_row'], new: ['cable_row', 'db_row', 'inverted_row'] },
  hpull2: { label: 'Row', opts: ['db_row', 'cable_row', 'inverted_row'] },
  rear: { label: 'Rear shoulders', opts: ['face_pull', 'reverse_fly'] },
  side: { label: 'Side shoulders', opts: ['lateral_raise'] },
  fly: { label: 'Chest', opts: ['db_fly', 'decline_pushup', 'pushup'] },
  bi: { label: 'Biceps', opts: ['db_curl', 'bb_curl', 'hammer_curl'] },
  bi2: { label: 'Biceps', opts: ['hammer_curl', 'incline_curl', 'db_curl'] },
  tri: { label: 'Triceps', opts: ['pushdown', 'oh_tri_ext', 'close_pushup', 'bench_dip'] },
  tri2: { label: 'Triceps', opts: ['oh_tri_ext', 'skullcrusher', 'close_pushup', 'bench_dip'] },
  calf: { label: 'Calves', opts: ['calf_raise', 'seated_calf'] },
  core: { label: 'Abs', opts: ['hanging_leg_raise', 'cable_crunch', 'ab_wheel', 'reverse_crunch', 'dead_bug'], new: ['dead_bug', 'reverse_crunch', 'plank'] },
  core2: { label: 'Core', opts: ['plank', 'side_plank', 'dead_bug'] },
  carry: { label: 'Carry', opts: ['farmers_walk'] },
};

// [slot, sets, low reps, high reps, rest seconds, main lift]
const T = (name, focus, slots) => ({ name, focus, slots: slots.map(([slot, sets, lo, hi, rest, main]) => ({ slot, sets, lo, hi, rest, main: !!main })) });
const FB_A = T('Full body A', 'Squat · press · row', [['squat', 3, 6, 10, 150, 1], ['hpush', 3, 6, 10, 150, 1], ['hpull', 3, 8, 12, 120], ['hinge', 2, 8, 12, 120], ['side', 2, 12, 20, 60], ['core', 2, 8, 15, 60]]);
const FB_B = T('Full body B', 'Hinge · pull · incline', [['hinge_heavy', 3, 5, 8, 180, 1], ['vpull', 3, 6, 10, 150, 1], ['ipush', 3, 8, 12, 120], ['lunge', 2, 8, 12, 90], ['rear', 2, 12, 20, 60], ['bi', 2, 10, 15, 60], ['tri', 2, 10, 15, 60]]);
const FB_C = T('Full body C', 'Legs · overhead · row', [['squat2', 3, 10, 15, 120, 1], ['vpush', 3, 6, 10, 150, 1], ['hpull2', 3, 8, 12, 120], ['hamcurl', 3, 10, 15, 90], ['hpush2', 2, 8, 12, 90], ['calf', 2, 10, 15, 60], ['core2', 2, 30, 60, 60]]);
const UP_A = T('Upper A', 'Chest & back, heavy', [['hpush', 4, 6, 10, 150, 1], ['hpull', 4, 8, 12, 120, 1], ['vpush', 3, 8, 12, 120], ['vpull', 3, 8, 12, 120], ['side', 3, 12, 20, 60], ['tri', 2, 10, 15, 60], ['bi', 2, 10, 15, 60]]);
const LO_A = T('Lower A', 'Squat focus', [['squat', 4, 6, 10, 180, 1], ['hinge', 3, 8, 12, 150], ['lunge', 2, 8, 12, 90], ['hamcurl', 3, 10, 15, 90], ['calf', 3, 10, 15, 60], ['core', 2, 8, 15, 60]]);
const UP_B = T('Upper B', 'Back & shoulders', [['ipush', 3, 8, 12, 120, 1], ['vpull', 4, 6, 10, 150, 1], ['hpull2', 3, 10, 12, 90], ['fly', 2, 12, 15, 60], ['rear', 3, 12, 20, 60], ['bi2', 3, 10, 15, 60], ['tri2', 3, 10, 15, 60]]);
const LO_B = T('Lower B', 'Hinge focus', [['hinge_heavy', 3, 5, 8, 180, 1], ['squat2', 3, 10, 15, 120], ['glute', 3, 8, 12, 120], ['quadiso', 2, 12, 20, 60], ['calf', 3, 10, 15, 60], ['core2', 2, 30, 60, 60]]);
const PUSH = T('Push', 'Chest, shoulders, triceps', [['hpush', 4, 6, 10, 150, 1], ['ipush', 3, 8, 12, 120], ['vpush', 3, 8, 12, 120], ['side', 3, 12, 20, 60], ['fly', 2, 12, 15, 60], ['tri', 3, 10, 15, 60]]);
const PULL = T('Pull', 'Back, biceps, grip', [['vpull', 4, 6, 10, 150, 1], ['hpull', 3, 8, 12, 120], ['hpull2', 2, 10, 12, 90], ['rear', 3, 12, 20, 60], ['bi', 3, 10, 15, 60], ['bi2', 2, 10, 15, 60], ['carry', 2, 30, 45, 90]]);
const LEGS = T('Legs', 'Quads, hamstrings, glutes', [['squat', 4, 6, 10, 180, 1], ['hinge', 3, 8, 12, 150], ['lunge', 3, 8, 12, 90], ['hamcurl', 3, 10, 15, 90], ['calf', 3, 10, 15, 60], ['core', 3, 8, 15, 60]]);

export const SPLITS = {
  2: { name: 'Full body, twice a week', days: [FB_A, FB_B] },
  3: { name: 'Full body, three times a week', days: [FB_A, FB_B, FB_C] },
  4: { name: 'Upper / lower', days: [UP_A, LO_A, UP_B, LO_B] },
  5: { name: 'Upper / lower + push / pull / legs', days: [UP_A, LO_A, PUSH, PULL, LEGS] },
  6: { name: 'Push / pull / legs, twice', days: [PUSH, PULL, LEGS, PUSH, PULL, LEGS] },
};

// With no equipment there isn't enough to fill a pull day, so higher
// frequencies rotate full-body and upper/lower days instead.
const BW_SPLITS = {
  5: { name: 'Full body + upper / lower', days: [FB_A, FB_B, FB_C, UP_A, LO_A] },
  6: { name: 'Upper / lower + full body', days: [UP_A, LO_A, UP_B, LO_B, FB_A, FB_B] },
};
export const splitFor = (train) => (train.equipment === 'bw' && BW_SPLITS[train.days]) || SPLITS[train.days] || SPLITS[3];

export function slotOptions(slotKey, equipment) {
  const has = EQUIPMENT[equipment]?.has || EQUIPMENT.gym.has;
  const s = SLOTS[slotKey];
  const all = [...new Set([...(s.new || []), ...s.opts])];
  return all.filter((id) => EX[id] && EX[id].need.every((n) => has.includes(n)));
}

function pickExercise(slotKey, train, variant) {
  const has = EQUIPMENT[train.equipment]?.has || EQUIPMENT.gym.has;
  const s = SLOTS[slotKey];
  const order = train.level === 'new' && s.new ? [...s.new, ...s.opts] : s.opts;
  const ok = order.filter((id) => EX[id] && EX[id].need.every((n) => has.includes(n)));
  if (!ok.length) return null;
  return ok[Math.min(variant, ok.length - 1)];
}

// The workout with index `i` of the user's split, filled in.
export function buildWorkout(train, i) {
  const split = splitFor(train);
  const idx = ((i % split.days.length) + split.days.length) % split.days.length;
  const tpl = split.days[idx];
  const variant = train.days === 6 && train.equipment !== 'bw' && idx >= 3 ? 1 : 0;
  const used = new Set();
  let items = [];
  for (const s of tpl.slots) {
    const key = `${tpl.name}:${s.slot}`;
    let id = train.swaps?.[key];
    if (!id || !slotOptions(s.slot, train.equipment).includes(id)) id = pickExercise(s.slot, train, s.main ? 0 : variant);
    if (!id || used.has(id)) {
      const alt = slotOptions(s.slot, train.equipment).find((x) => !used.has(x));
      if (!alt) continue;
      id = alt;
    }
    used.add(id);
    let sets = s.sets;
    if (train.level === 'new') sets = s.main ? Math.min(3, sets) : Math.max(2, sets - 1);
    if (train.level === 'exp' && s.main) sets += 1;
    const ex = EX[id];
    let { lo, hi } = s;
    if (ex.load === 'time' && hi < 20) { lo = 30; hi = 60; }
    if (ex.load === 'carry') { lo = 30; hi = 45; }
    items.push({ id, slot: s.slot, key, label: SLOTS[s.slot].label, sets, lo, hi, rest: s.rest, main: s.main });
  }
  if (train.level === 'new' && items.length > 6) items = items.slice(0, 6);
  return { idx, name: tpl.name, focus: tpl.focus, items };
}

/* ───────────── where you are in the program ───────────── */

// 5-week blocks: four weeks of building effort, then an easy week.
// rir = reps you should have left in the tank on your last set.
export function blockWeek(startDate, today) {
  const week = Math.max(0, Math.floor(diffDays(startDate, today) / 7));
  const w = week % 5;
  return { week: week + 1, inBlock: w + 1, deload: w === 4, rir: [3, 2, 2, 1, 4][w] };
}

// Next workout in the rotation = the one after the last you finished.
export function nextWorkoutIndex(days, today) {
  const keys = Object.keys(days).filter((k) => k <= today && days[k]?.workout?.done).sort();
  const last = keys.length ? days[keys[keys.length - 1]].workout : null;
  return last ? (last.idx ?? -1) + 1 : 0;
}

export function sessionsThisWeek(days, today) {
  const d = new Date(today + 'T12:00:00');
  const monday = addDays(today, -((d.getDay() + 6) % 7));
  return Object.keys(days).filter((k) => k >= monday && k <= today && days[k]?.workout?.done).length;
}

/* ───────────── progression ───────────── */

export function exerciseHistory(days, exId, beforeDate) {
  const out = [];
  for (const k of Object.keys(days).sort().reverse()) {
    if (beforeDate && k >= beforeDate) continue;
    const it = days[k]?.workout?.ex?.find((e) => e.id === exId);
    if (it && it.sets.some((s) => s.done)) out.push({ date: k, sets: it.sets.filter((s) => s.done) });
  }
  return out;
}

// Smallest sensible jump, in kg, for the unit the user lifts in.
export function increment(ex, unit) {
  const lb = unit === 'lb';
  if (ex.load === 'bb') return ex.lower ? (lb ? 10 : 5) * (lb ? KG_PER_LB : 1) : (lb ? 5 : 2.5) * (lb ? KG_PER_LB : 1);
  if (ex.load === 'db' || ex.load === 'carry') return lb ? 5 * KG_PER_LB : 2;
  if (ex.load === 'stack') return lb ? 10 * KG_PER_LB : 5;
  return 0;
}
export const roundLoad = (kg, ex, unit) => {
  const inc = increment(ex, unit);
  if (!inc) return kg;
  const step = unit === 'lb' ? (ex.load === 'bb' ? 5 : 5) * KG_PER_LB : ex.load === 'bb' ? 2.5 : ex.load === 'db' || ex.load === 'carry' ? 1 : 2.5;
  return roundTo(kg, step);
};

// Double progression: earn the top of the rep range on every set, then add
// weight and start again at the bottom of the range.
export function suggest(item, history, { unit = 'kg', deload = false, loadType } = {}) {
  const ex = EX[item.id];
  const load = loadType || ex.load;
  const last = history[0];
  if (!last) return { w: null, reps: item.hi, note: 'first' };
  const sets = last.sets;
  const topW = Math.max(...sets.map((s) => s.w || 0));
  const atTop = sets.filter((s) => (s.w || 0) >= topW);
  const hitAll = sets.length >= item.sets && atTop.every((s) => s.r >= item.hi);
  const minR = Math.min(...atTop.map((s) => s.r));

  if (load === 'bw' || load === 'time' || !(topW > 0)) {
    if (deload) return { w: topW || null, reps: item.lo, note: 'deload' };
    if (hitAll) return { w: topW || null, reps: item.hi, note: load === 'time' ? 'hold_longer' : 'harder' };
    return { w: topW || null, reps: Math.min(item.hi, minR + (load === 'time' ? 5 : 1)), note: 'same' };
  }
  if (deload) return { w: roundLoad(topW * 0.9, ex, unit), reps: item.lo, note: 'deload' };
  if (hitAll) return { w: roundLoad(topW + increment(ex, unit), ex, unit), reps: item.lo, note: 'up' };
  const prev = history[1];
  const struggling = minR < item.lo && prev && Math.max(...prev.sets.map((s) => s.w || 0)) >= topW && Math.min(...prev.sets.map((s) => s.r)) < item.lo;
  if (struggling) return { w: roundLoad(topW * 0.9, ex, unit), reps: item.lo, note: 'down' };
  return { w: topW, reps: Math.max(item.lo, Math.min(item.hi, minR + 1)), note: 'same' };
}

export function bestE1rm(sets) {
  return Math.max(0, ...sets.filter((s) => s.done !== false).map((s) => e1rm(s.w || 0, s.r || 0)));
}

// Records set in a finished workout, compared with everything before it.
export function findPRs(days, date, workout) {
  const prs = [];
  for (const it of workout.ex || []) {
    const done = it.sets.filter((s) => s.done && s.w > 0 && s.r > 0);
    if (!done.length) continue;
    const now = bestE1rm(done);
    const before = exerciseHistory(days, it.id, date);
    if (!before.length) continue;
    const prev = Math.max(...before.map((h) => bestE1rm(h.sets)));
    if (now > prev + 0.01) prs.push({ id: it.id, e1rm: now, prev });
  }
  return prs;
}

export function workoutVolume(w) {
  let v = 0, sets = 0;
  for (const it of w?.ex || []) for (const s of it.sets) if (s.done) { sets++; v += (s.w || 0) * (s.r || 0); }
  return { volume: v, sets };
}

// Dumbbell movements done without dumbbells progress by reps instead.
export function loadTypeFor(exId, equipment) {
  const ex = EX[exId];
  const has = EQUIPMENT[equipment]?.has || EQUIPMENT.gym.has;
  if ((ex.load === 'db' || ex.load === 'carry') && !has.includes('db')) return 'bw';
  return ex.load;
}
