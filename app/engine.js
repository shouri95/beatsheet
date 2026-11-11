// Plates — the numbers. Pure functions only: no DOM, no storage, no dates read
// from the clock unless a caller omits `today`. Everything here is unit-tested
// in tests/engine.test.mjs, so change it there first.
//
// All internal quantities are metric (kg, cm, kcal, g).

export const KCAL_PER_KG = 7700;      // energy in 1 kg of body-weight change (mostly fat)
export const KG_PER_LB = 0.45359237;

/* ───────────── dates (local calendar days as 'YYYY-MM-DD') ───────────── */

const pad = (n) => String(n).padStart(2, '0');
export const dateKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d, 12); };
export const addDays = (k, n) => { const d = parseKey(k); d.setDate(d.getDate() + n); return dateKey(d); };
export const diffDays = (a, b) => Math.round((parseKey(b) - parseKey(a)) / 864e5);

/* ───────────── small helpers ───────────── */

export const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
export const roundTo = (x, step) => Math.round(x / step) * step;
const clamp01 = (x) => clamp(x, 0, 1);
export const bmi = (kg, cm) => kg / ((cm / 100) ** 2);
export const kgAtBmi = (b, cm) => b * ((cm / 100) ** 2);

/* ───────────── body composition ───────────── */

// US Navy circumference method. Good to roughly ±3–4 % body fat; a DEXA or a
// multi-frequency scan beats it, which is why scans take priority below.
export function navyBodyFat({ sex, heightCm, neckCm, waistCm, hipCm }) {
  const lg = Math.log10;
  let bf;
  if (sex === 'f') {
    const x = waistCm + (hipCm || 0) - neckCm;
    if (!(x > 0) || !hipCm) return null;
    bf = 495 / (1.29579 - 0.35004 * lg(x) + 0.221 * lg(heightCm)) - 450;
  } else {
    const x = waistCm - neckCm;
    if (!(x > 0)) return null;
    bf = 495 / (1.0324 - 0.19077 * lg(x) + 0.15456 * lg(heightCm)) - 450;
  }
  return Number.isFinite(bf) ? clamp(bf, 3, 60) : null;
}

// Latest measurement that carries a body-fat figure → lean mass. Lean mass is
// then held constant to estimate today's body fat at today's weight.
export function bodyComp(profile, weightKg) {
  const scans = (profile?.scans || []).filter((s) => s && (s.bf > 0 || s.leanKg > 0));
  if (!scans.length) return null;
  // Newest first; on the same day a real scan beats a tape-measure estimate.
  const rank = (x) => (x.src === 'navy' || x.src === 'rfm' ? 1 : 0);
  const s = scans.slice().sort((a, b) => (a.date === b.date ? rank(a) - rank(b) : a.date < b.date ? 1 : -1))[0];
  const scanW = s.weightKg || weightKg;
  const leanKg = s.leanKg > 0 ? s.leanKg : scanW * (1 - s.bf / 100);
  if (!(leanKg > 20) || leanKg >= weightKg) return null;
  return { leanKg, bf: (1 - leanKg / weightKg) * 100, scan: s };
}

export const ageOf = (profile, year = new Date().getFullYear()) => clamp(year - (profile.birthYear || year - 30), 13, 100);

/* ───────────── energy expenditure ───────────── */

// Katch–McArdle when lean mass is known (it ignores sex and age because lean
// mass already explains them); Mifflin–St Jeor otherwise.
export function bmrOf(profile, weightKg) {
  const comp = bodyComp(profile, weightKg);
  if (comp) return { bmr: 370 + 21.6 * comp.leanKg, method: 'katch' };
  const s = profile.sex === 'f' ? -161 : 5;
  return { bmr: 10 * weightKg + 6.25 * profile.heightCm - 5 * ageOf(profile) + s, method: 'mifflin' };
}

// Daily life outside the gym. Training is added separately so that changing
// "days per week" moves the estimate by what lifting actually costs.
export const ACTIVITY = [
  { id: 1, label: 'Mostly sitting', hint: 'Desk job, under 5,000 steps a day', f: 1.2 },
  { id: 2, label: 'Lightly active', hint: 'Some walking, 5,000–8,000 steps', f: 1.35 },
  { id: 3, label: 'Active', hint: 'On your feet a lot, 8,000–12,000 steps', f: 1.5 },
  { id: 4, label: 'Very active', hint: 'Physical job or 12,000+ steps', f: 1.7 },
];

export function formulaTdee(profile, weightKg) {
  const { bmr, method } = bmrOf(profile, weightKg);
  const f = (ACTIVITY.find((a) => a.id === profile.activity) || ACTIVITY[1]).f;
  const sessions = profile.train?.days ?? 3;
  const training = (sessions * 2.5 * weightKg) / 7; // ~2.5 kcal/kg net for an hour of lifting
  return { bmr, method, tdee: bmr * f + training };
}

/* ───────────── the plan ───────────── */

export const KCAL_FLOOR = { m: 1500, f: 1200 };

function leanTier(profile, weightKg) {
  const comp = bodyComp(profile, weightKg);
  const f = profile.sex === 'f';
  if (comp) {
    if (comp.bf >= (f ? 32 : 22)) return 'high';
    if (comp.bf < (f ? 24 : 15)) return 'lean';
    return 'mid';
  }
  const b = bmi(weightKg, profile.heightCm);
  return b >= 28 ? 'high' : b < 23 ? 'lean' : 'mid';
}

export function macrosFor(kcal, weightKg, profile, mode) {
  const comp = bodyComp(profile, weightKg);
  // Protein: set from lean mass when we know it, otherwise from a weight that
  // is capped at BMI 27 so heavier people are not handed absurd numbers.
  const ref = Math.min(weightKg, kgAtBmi(27, profile.heightCm));
  let p = comp ? comp.leanKg * (mode === 'cut' ? 2.4 : 2.2) : ref * (mode === 'cut' ? 2.0 : 1.8);
  p = clamp(p, 1.2 * ref, 2.6 * ref);
  p = Math.min(p, (kcal * 0.4) / 4);
  p = roundTo(p, 5);
  let f = roundTo(Math.max((kcal * 0.25) / 9, 0.6 * ref), 5);
  let c = (kcal - 4 * p - 9 * f) / 4;
  if (c < 60) { f = roundTo(Math.max(0.5 * ref, 35), 5); c = (kcal - 4 * p - 9 * f) / 4; }
  c = Math.max(0, roundTo(c, 5));
  return { p, c, f, fiber: Math.max(25, roundTo((kcal / 1000) * 14, 1)) };
}

// profile.goal = { targetKg, weeks, startDate, startKg }
// opts.tdee overrides the formula (used once the adaptive estimate has data).
export function buildPlan(profile, weightKg, opts = {}) {
  const today = opts.today || dateKey();
  const g = profile.goal || {};
  const { bmr, method, tdee: formula } = formulaTdee(profile, weightKg);
  const tdee = opts.tdee || formula;
  const sex = profile.sex === 'f' ? 'f' : 'm';
  const notes = [];

  const endDate = addDays(g.startDate || today, Math.round((g.weeks || 12) * 7));
  const weeksLeft = Math.max(1, diffDays(today, endDate) / 7);

  let targetKg = g.targetKg || weightKg;
  const minHealthy = kgAtBmi(18.5, profile.heightCm);
  if (targetKg < minHealthy) { targetKg = minHealthy; notes.push('target_low'); }

  const delta = targetKg - weightKg;
  let mode = delta < -0.75 ? 'cut' : delta > 0.75 ? 'gain' : 'recomp';
  if (ageOf(profile, Number(today.slice(0, 4))) < 18) { mode = 'maintain'; notes.push('minor'); }

  const tier = leanTier(profile, weightKg);
  let kcal = tdee;
  let requested = 0;      // kg per week the timeline asks for (signed)
  let capped = null;

  if (mode === 'cut') {
    requested = delta / weeksLeft;
    const maxPct = tier === 'high' ? 0.01 : tier === 'lean' ? 0.005 : 0.008;
    let rate = Math.min(-requested, maxPct * weightKg);
    if (rate < -requested - 1e-6) capped = 'rate';
    let deficit = (rate * KCAL_PER_KG) / 7;
    const maxDeficit = tdee * (tier === 'high' ? 0.3 : 0.25);
    if (deficit > maxDeficit) { deficit = maxDeficit; capped = 'deficit'; }
    kcal = tdee - deficit;
    if (kcal < KCAL_FLOOR[sex]) { kcal = KCAL_FLOOR[sex]; capped = 'floor'; }
  } else if (mode === 'gain') {
    requested = delta / weeksLeft;
    const maxPct = profile.train?.level === 'new' ? 0.005 : 0.003;
    const rate = Math.min(requested, maxPct * weightKg);
    if (rate < requested - 1e-6) capped = 'rate';
    kcal = tdee + clamp((rate * KCAL_PER_KG) / 7, 150, tdee * 0.15);
  } else if (mode === 'recomp') {
    kcal = tdee - Math.min(tdee * 0.1, 300);
  }

  kcal = roundTo(kcal, 10);
  const rateKgWk = ((kcal - tdee) * 7) / KCAL_PER_KG;                    // signed, expected
  const etaWeeks = mode === 'cut' || mode === 'gain' ? (Math.abs(rateKgWk) > 0.02 ? delta / rateKgWk : null) : null;
  const reachByEnd = weightKg + rateKgWk * weeksLeft;

  return {
    mode, tier, bmr, bmrMethod: method, tdee, formulaTdee: formula,
    kcal, ...macrosFor(kcal, weightKg, profile, mode),
    deficit: tdee - kcal, rateKgWk, ratePct: (rateKgWk / weightKg) * 100,
    requestedKgWk: requested, capped, targetKg, weeksLeft, endDate,
    etaWeeks, etaDate: etaWeeks != null ? addDays(today, Math.round(etaWeeks * 7)) : null,
    reachByEnd: mode === 'cut' ? Math.max(reachByEnd, targetKg) : mode === 'gain' ? Math.min(reachByEnd, targetKg) : weightKg,
    notes,
  };
}

// A sensible first target for someone who says "lose the belly, add muscle".
export function suggestTarget(profile, weightKg) {
  const comp = bodyComp(profile, weightKg);
  const f = profile.sex === 'f';
  if (comp) {
    const goalBf = f ? 24 : 15;
    if (comp.bf > goalBf + 1) return { targetKg: roundTo((comp.leanKg + 0.5) / (1 - goalBf / 100), 0.5), why: 'bf', goalBf };
    return { targetKg: roundTo(weightKg, 0.5), why: 'lean' };
  }
  const b = bmi(weightKg, profile.heightCm);
  if (b > 25) return { targetKg: roundTo(Math.max(kgAtBmi(24, profile.heightCm), weightKg * 0.85), 0.5), why: 'bmi' };
  return { targetKg: roundTo(weightKg, 0.5), why: 'lean' };
}

/* ───────────── food totals ───────────── */

export function dayTotals(day) {
  const t = { k: 0, p: 0, c: 0, f: 0, fb: 0, n: 0, verifiedK: 0 };
  for (const e of day?.foods || []) {
    t.k += e.k || 0; t.p += e.p || 0; t.c += e.c || 0; t.f += e.f || 0; t.fb += e.fb || 0; t.n++;
    if (!e.est) t.verifiedK += e.k || 0;
  }
  return t;
}

// "On target": calories within a sensible band and protein mostly there.
export function dayScore(totals, targets) {
  if (!targets || !totals.n) return null;
  const kr = totals.k / targets.kcal;
  const pr = totals.p / targets.p;
  return { kr, pr, kcalOk: kr >= 0.85 && kr <= 1.07, proteinOk: pr >= 0.9, onTarget: kr >= 0.85 && kr <= 1.07 && pr >= 0.9 };
}

export function streak(days, today = dateKey()) {
  const logged = (k) => (days[k]?.foods?.length || 0) > 0;
  let k = logged(today) ? today : addDays(today, -1);
  let n = 0;
  while (logged(k)) { n++; k = addDays(k, -1); }
  return n;
}

/* ───────────── weight trend ───────────── */

export function weightSeries(days) {
  return Object.keys(days).filter((k) => days[k]?.weight > 0).sort().map((k) => ({ date: k, w: days[k].weight }));
}

// Exponentially-weighted trend, gap-aware: a weigh-in after a 5-day gap moves
// the trend as much as five daily ones would have.
export function withTrend(series, alphaPerDay = 0.16) {
  let t = null, prev = null;
  return series.map((pt) => {
    if (t == null) t = pt.w;
    else { const gap = Math.max(1, diffDays(prev, pt.date)); t += (1 - (1 - alphaPerDay) ** gap) * (pt.w - t); }
    prev = pt.date;
    return { ...pt, t };
  });
}

// Least-squares slope of raw weigh-ins in [from, to], in kg/day.
export function weightSlope(series, from, to, minPoints = 5, minSpan = 7) {
  const pts = series.filter((p) => p.date >= from && p.date <= to);
  if (pts.length < minPoints) return null;
  const x0 = pts[0].date;
  const span = diffDays(x0, pts[pts.length - 1].date);
  if (span < minSpan) return null;
  const xs = pts.map((p) => diffDays(x0, p.date));
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = pts.reduce((a, p) => a + p.w, 0) / pts.length;
  let sxy = 0, sxx = 0;
  xs.forEach((x, i) => { sxy += (x - mx) * (pts[i].w - my); sxx += (x - mx) ** 2; });
  return sxx ? { slope: sxy / sxx, n: pts.length, span } : null;
}

/* ───────────── adaptive expenditure ─────────────
   What you ate, minus what your weight did, is what you burned. This is the
   piece that makes the plan self-correcting: a formula can be off by 300 kcal,
   and food logs are never perfect, but intake − change absorbs both errors. */

export function adaptiveTdee({ days, today = dateKey(), bmr, planStart, windowDays = 28 }) {
  let from = addDays(today, -(windowDays - 1));
  // The first days of a new diet shed water and glycogen, not tissue; reading
  // that as fat loss would inflate the estimate, so skip them when we can.
  if (planStart && planStart > addDays(from, -6)) {
    const skipTo = addDays(planStart, 5);
    if (diffDays(skipTo, today) >= 13) from = skipTo > from ? skipTo : from;
    else if (planStart > from) from = planStart;
  }
  const yesterday = addDays(today, -1);
  const series = weightSeries(days);
  const fit = weightSlope(series, from, today, 6, 12);
  if (!fit) return null;

  const minK = Math.max(700, 0.55 * (bmr || 1500));
  let sum = 0, n = 0;
  const spanDays = diffDays(from, yesterday) + 1;
  for (let k = from; k <= yesterday; k = addDays(k, 1)) {
    const t = dayTotals(days[k]);
    if (t.k >= minK) { sum += t.k; n++; }
  }
  const coverage = n / Math.max(1, spanDays);
  if (n < 10 || coverage < 0.6) return null;

  const avgIntake = sum / n;
  let tdee = avgIntake - fit.slope * KCAL_PER_KG;
  if (bmr) tdee = clamp(tdee, bmr * 0.95, bmr * 2.6);
  const confidence = 0.85 * (0.5 * clamp01((fit.span - 12) / 14) + 0.25 * clamp01((coverage - 0.6) / 0.35) + 0.25 * clamp01((fit.n - 6) / 10));
  return { tdee, avgIntake, slopeKgWk: fit.slope * 7, loggedDays: n, weighIns: fit.n, spanDays, coverage, confidence, from };
}

export function blendTdee(formula, adaptive) {
  if (!adaptive) return { tdee: formula, source: 'formula', confidence: 0 };
  const c = adaptive.confidence;
  return { tdee: formula * (1 - c) + adaptive.tdee * c, source: c > 0.25 ? 'adaptive' : 'formula', confidence: c };
}

/* ───────────── strength ───────────── */

// Epley estimate; meaningless past ~12 reps, so those sets are ignored.
export const e1rm = (w, reps) => (w > 0 && reps > 0 && reps <= 12 ? w * (1 + reps / 30) : 0);

// Plates per side for a barbell load, largest first.
export function plateLoad(total, bar, plates) {
  let side = (total - bar) / 2;
  if (side < -1e-9) return null;
  const out = [];
  for (const p of plates) { while (side >= p - 1e-9) { out.push(p); side -= p; } }
  return { perSide: out, leftover: Math.max(0, side) };
}

/* ───────────── steps → calories ───────────── */

// Net energy of walking ≈ 0.5 kcal per kg per km above resting; step length
// ≈ 0.414 × height. So an 86 kg, 178 cm person burns ~0.032 kcal per step.
export const kcalPerStep = (weightKg, heightCm) => 0.5 * weightKg * ((0.414 * heightCm) / 100) / 1000;

// Your usual daily steps: the median of recent synced days (today excluded).
export function stepBaseline(days, today, fallback = 8000, lookback = 28) {
  const vals = [];
  for (let i = 1; i <= lookback; i++) {
    const s = days[addDays(today, -i)]?.steps;
    if (s > 0) vals.push(s);
  }
  if (vals.length < 7) return { steps: fallback, from: 'goal', n: vals.length };
  vals.sort((a, b) => a - b);
  const m = vals.length >> 1;
  return { steps: vals.length % 2 ? vals[m] : (vals[m - 1] + vals[m]) / 2, from: 'history', n: vals.length };
}

// Extra calories you've earned today by walking more than usual. Only the
// part above your usual steps counts (that is already in your burn), only
// half of it (trackers and formulas overestimate), capped at 250 kcal, and
// never negative: a slow morning doesn't take food away.
export function stepCredit({ steps, baseline, weightKg, heightCm, share = 0.5, cap = 250 }) {
  if (!(steps > 0) || !(baseline > 0)) return { kcal: 0, extra: 0 };
  const extra = Math.max(0, steps - baseline);
  const kcal = Math.min(cap, extra * kcalPerStep(weightKg, heightCm) * share);
  return { kcal: roundTo(kcal, 5), extra: Math.round(extra) };
}

/* ───────────── label sanity ───────────── */

export const kjToKcal = (kj) => kj / 4.184;

// Does a label's calorie figure agree with its macros? Catches the typos that
// crowd-sourced databases are full of (per-serving values typed as per-100 g,
// kJ typed as kcal). Fibre counts 2 kcal/g; labels that exclude it from carbs
// (Australia, EU) and those that include it (US) both pass.
export function labelCheck({ kcal, p = 0, c = 0, f = 0, fb = 0 }) {
  if (!(kcal >= 0)) return { ok: false, reason: 'missing' };
  if (p + c + f > 100.5 || kcal > 902) return { ok: false, reason: 'impossible' };
  const lo = 4 * p + 4 * Math.max(0, c - fb) + 9 * f;
  const hi = 4 * p + 4 * c + 9 * f + 2 * fb;
  const slack = Math.max(25, 0.12 * Math.max(kcal, hi));
  if (kcal < lo - slack || kcal > hi + slack) return { ok: false, reason: 'mismatch', fromMacros: Math.round((lo + hi) / 2) };
  return { ok: true };
}

/* ───────────── sleep ───────────── */

export function sleepStats(days, today, n = 7) {
  let sum = 0, cnt = 0;
  for (let i = 0; i < n; i++) {
    const s = days[addDays(today, -i)]?.sleep;
    if (s?.asleep > 0) { sum += s.asleep; cnt++; }
  }
  return cnt ? { avg: sum / cnt, nights: cnt } : null;
}

// Relative fat mass (Woolcott & Bergman, 2018): body fat % from height and
// waist alone, validated against DEXA to about the accuracy of the US Navy
// tape method, without needing a neck measurement.
export function rfmBodyFat({ sex, heightCm, waistCm }) {
  if (!(heightCm > 0) || !(waistCm > 0)) return null;
  const bf = (sex === 'f' ? 76 : 64) - 20 * (heightCm / waistCm);
  return Number.isFinite(bf) ? clamp(bf, 3, 60) : null;
}
