// Turning Google Health API responses into the app's day records.
// Pure functions; tested in tests/health.test.mjs.

const pad = (n) => String(n).padStart(2, '0');
export const civilKey = (c) => (c?.date ? `${c.date.year}-${pad(c.date.month)}-${pad(c.date.day)}` : null);
export const dateObj = (k) => { const [y, m, d] = k.split('-').map(Number); return { year: y, month: m, day: d }; };
const int = (x) => (x == null || x === '' ? null : Math.round(+x));
const secs = (d) => { const m = /^(-?\d+(?:\.\d+)?)s$/.exec(d || ''); return m ? +m[1] : null; };

// Local date of a physical timestamp, given the UTC offset the API recorded.
export function localKey(iso, offset) {
  const off = secs(offset) ?? 0;
  const d = new Date(Date.parse(iso) + off * 1000);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
const localTime = (iso, offset) => {
  const d = new Date(Date.parse(iso) + (secs(offset) ?? 0) * 1000);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
};

// dailyRollUp → { 'YYYY-MM-DD': value }
export function mapRollup(res, pick) {
  const out = {};
  for (const p of res?.rollupDataPoints || []) {
    const k = civilKey(p.civilStartTime);
    const v = pick(p);
    if (k && v != null) out[k] = v;
  }
  return out;
}
export const pickSteps = (p) => (p.steps ? int(p.steps.countSum) ?? 0 : null);
export const pickCalories = (p) => (p.totalCalories?.kcalSum > 0 ? Math.round(p.totalCalories.kcalSum) : null);

// Sleep sessions → the night's main sleep, filed under the day you woke up.
export function mapSleep(points) {
  const out = {};
  for (const dp of points || []) {
    const s = dp.sleep;
    if (!s?.interval?.endTime) continue;
    const meta = s.metadata || {};
    if (meta.nap) continue;
    const key = civilKey(s.interval.civilEndTime) || localKey(s.interval.endTime, s.interval.endUtcOffset);
    const sum = s.summary || {};
    const stage = (t) => int((sum.stagesSummary || []).find((x) => x.type === t)?.minutes);
    const rec = {
      asleep: int(sum.minutesAsleep), inBed: int(sum.minutesInSleepPeriod), awake: int(sum.minutesAwake),
      deep: stage('DEEP'), rem: stage('REM'), light: stage('LIGHT'),
      start: localTime(s.interval.startTime, s.interval.startUtcOffset), end: localTime(s.interval.endTime, s.interval.endUtcOffset),
      main: !!(meta.mainSleep ?? meta.main),
    };
    if (!(rec.asleep > 0)) continue;
    const prev = out[key];
    // Keep the main sleep; otherwise the longest.
    if (!prev || (rec.main && !prev.main) || (rec.main === prev.main && rec.asleep > prev.asleep)) out[key] = rec;
  }
  for (const k of Object.keys(out)) delete out[k].main;
  return out;
}

// Weight samples → latest of each day, in kg.
export function mapWeight(points) {
  const out = {};
  for (const dp of points || []) {
    const w = dp.weight;
    if (!(w?.weightGrams > 0)) continue;
    const t = w.sampleTime || {};
    const key = civilKey(t.civilTime) || (t.physicalTime ? localKey(t.physicalTime, t.utcOffset) : null);
    if (!key) continue;
    const at = Date.parse(t.physicalTime || 0) || 0;
    if (!out[key] || at >= out[key].at) out[key] = { kg: Math.round(w.weightGrams / 10) / 100, at };
  }
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.kg]));
}

export function mapRestingHr(points) {
  const out = {};
  for (const dp of points || []) {
    const r = dp.dailyRestingHeartRate;
    if (!r?.date) continue;
    const k = `${r.date.year}-${pad(r.date.month)}-${pad(r.date.day)}`;
    const bpm = int(r.beatsPerMinute);
    if (bpm > 0) out[k] = bpm;
  }
  return out;
}

const STRENGTH = new Set(['WEIGHTLIFTING', 'WEIGHTS', 'WEIGHT_MACHINES', 'FREE_WEIGHTS', 'STRENGTH_TRAINING', 'FUNCTIONAL_STRENGTH_TRAINING', 'POWERLIFTING', 'CALISTHENICS', 'BODY_WEIGHT', 'RESISTANCE_BANDS', 'CORE_TRAINING', 'CROSSFIT', 'CIRCUIT_TRAINING']);

// Exercise sessions → cardio minutes per day (lifting is logged in the app).
export function mapExercise(points) {
  const out = {};
  for (const dp of points || []) {
    const e = dp.exercise;
    if (!e?.interval?.startTime) continue;
    const key = civilKey(e.interval.civilStartTime) || localKey(e.interval.startTime, e.interval.startUtcOffset);
    const dur = secs(e.activeDuration) ?? (Date.parse(e.interval.endTime) - Date.parse(e.interval.startTime)) / 1000;
    if (!(dur > 0)) continue;
    const day = (out[key] ||= { cardioMin: 0, sessions: [] });
    const min = Math.round(dur / 60);
    const strength = STRENGTH.has(e.exerciseType);
    if (!strength) day.cardioMin += min;
    day.sessions.push({ type: e.exerciseType, name: e.displayName || e.exerciseType, min, kcal: e.metricsSummary?.caloriesKcal ? Math.round(e.metricsSummary.caloriesKcal) : null, strength });
  }
  return out;
}

// Fold synced values into existing days. Anything you typed yourself wins:
// synced fields are only written where the day has none, or where the last
// value also came from the sync.
export function mergeIntoDays(days, synced) {
  const changes = {};
  const put = (k, fn) => { const d = { ...(changes[k] || days[k] || {}) }; if (fn(d)) changes[k] = d; };
  for (const [k, v] of Object.entries(synced.steps || {})) put(k, (d) => (d.stepsSrc !== 'manual' && d.steps !== v ? ((d.steps = v), (d.stepsSrc = 'fitbit'), true) : false));
  for (const [k, v] of Object.entries(synced.sleep || {})) put(k, (d) => (JSON.stringify(d.sleep) !== JSON.stringify(v) ? ((d.sleep = v), true) : false));
  for (const [k, v] of Object.entries(synced.weight || {})) put(k, (d) => ((!d.weight || d.weightSrc === 'fitbit') && d.weight !== v ? ((d.weight = v), (d.weightSrc = 'fitbit'), true) : false));
  for (const [k, v] of Object.entries(synced.rhr || {})) put(k, (d) => (d.rhr !== v ? ((d.rhr = v), true) : false));
  for (const [k, v] of Object.entries(synced.burn || {})) put(k, (d) => (d.burn !== v ? ((d.burn = v), true) : false));
  for (const [k, v] of Object.entries(synced.exercise || {})) put(k, (d) => {
    const same = JSON.stringify(d.exercises) === JSON.stringify(v.sessions);
    if (same) return false;
    d.exercises = v.sessions;
    if (d.cardioSrc !== 'manual') { d.cardioMin = v.cardioMin; d.cardioSrc = 'fitbit'; }
    return true;
  });
  return changes;
}
