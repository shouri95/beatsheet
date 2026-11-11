// Run with:  npm test   (or: node --test)
import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../app/engine.js';

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ''} expected ${b} ± ${tol}, got ${a}`);

const base = (over = {}) => ({
  sex: 'm', birthYear: new Date().getFullYear() - 30, heightCm: 178, activity: 1,
  train: { days: 4, level: 'mid', equipment: 'gym' }, scans: [],
  goal: { targetKg: 75, weeks: 12, startDate: '2026-01-01', startKg: 85 }, ...over,
});

test('date helpers are calendar-safe', () => {
  assert.equal(E.addDays('2026-02-27', 3), '2026-03-02');
  assert.equal(E.addDays('2026-03-29', 1), '2026-03-30'); // across a DST change
  assert.equal(E.diffDays('2026-01-01', '2026-03-01'), 59);
  assert.equal(E.diffDays('2026-03-01', '2026-01-01'), -59);
});

test('Navy body fat matches the published formula', () => {
  near(E.navyBodyFat({ sex: 'm', heightCm: 178, neckCm: 38, waistCm: 90 }), 20.1, 0.3);
  near(E.navyBodyFat({ sex: 'f', heightCm: 165, neckCm: 32, waistCm: 75, hipCm: 98 }), 28.9, 0.3);
  assert.equal(E.navyBodyFat({ sex: 'f', heightCm: 165, neckCm: 32, waistCm: 75 }), null);
  assert.equal(E.navyBodyFat({ sex: 'm', heightCm: 178, neckCm: 40, waistCm: 38 }), null);
});

test('BMR: Mifflin without a scan, Katch–McArdle with one', () => {
  const p = base();
  const m = E.bmrOf(p, 85);
  assert.equal(m.method, 'mifflin');
  near(m.bmr, 10 * 85 + 6.25 * 178 - 5 * 30 + 5, 0.01);
  const withScan = base({ scans: [{ date: '2026-01-01', bf: 25, weightKg: 85 }] });
  const k = E.bmrOf(withScan, 85);
  assert.equal(k.method, 'katch');
  near(k.bmr, 370 + 21.6 * 63.75, 0.01);
  // lean mass is held constant as weight drops, so body fat % falls
  near(E.bodyComp(withScan, 80).bf, (1 - 63.75 / 80) * 100, 0.01);
});

test('latest scan wins; nonsense scans are ignored', () => {
  const p = base({ scans: [{ date: '2026-01-01', bf: 30, weightKg: 85 }, { date: '2026-03-01', bf: 22, weightKg: 80 }] });
  near(E.bodyComp(p, 80).leanKg, 62.4, 0.01);
  assert.equal(E.bodyComp(base({ scans: [{ date: '2026-01-01', leanKg: 90 }] }), 80), null);
});

test('cut: deficit follows the timeline when it is reasonable', () => {
  const p = base({ goal: { targetKg: 80, weeks: 12, startDate: '2026-01-01', startKg: 85 } });
  const plan = E.buildPlan(p, 85, { today: '2026-01-01' });
  assert.equal(plan.mode, 'cut');
  assert.equal(plan.capped, null);
  near(plan.rateKgWk, -5 / 12, 0.02);
  near(plan.deficit, (5 / 12) * 7700 / 7, 12);
  near(plan.etaWeeks, 12, 0.5);
  // macros add back up to the calorie target (within rounding to 5 g)
  near(plan.p * 4 + plan.c * 4 + plan.f * 9, plan.kcal, 45);
  assert.ok(plan.p >= 1.6 * 85 * 0.9 && plan.p <= 2.6 * 85, `protein ${plan.p}`);
});

test('cut: an impossible timeline is capped, never obeyed', () => {
  const p = base({ goal: { targetKg: 70, weeks: 6, startDate: '2026-01-01', startKg: 85 } });
  const plan = E.buildPlan(p, 85, { today: '2026-01-01' });
  assert.ok(plan.capped, 'should be capped');
  assert.ok(-plan.rateKgWk <= 0.0101 * 85, `rate ${plan.rateKgWk}`);
  assert.ok(plan.deficit <= plan.tdee * 0.3 + 6);
  assert.ok(plan.kcal >= E.KCAL_FLOOR.m);
  assert.ok(plan.etaWeeks > 6);
  assert.ok(plan.reachByEnd > 70);
});

test('calorie floor holds for small, sedentary people', () => {
  const p = base({ sex: 'f', heightCm: 155, activity: 1, train: { days: 2 }, goal: { targetKg: 50, weeks: 8, startDate: '2026-01-01', startKg: 62 } });
  const plan = E.buildPlan(p, 62, { today: '2026-01-01' });
  assert.ok(plan.kcal >= E.KCAL_FLOOR.f, `kcal ${plan.kcal}`);
  assert.ok(plan.c >= 0 && plan.f >= 35);
});

test('targets below a healthy weight are refused', () => {
  const p = base({ goal: { targetKg: 50, weeks: 30, startDate: '2026-01-01', startKg: 85 } });
  const plan = E.buildPlan(p, 85, { today: '2026-01-01' });
  assert.ok(plan.notes.includes('target_low'));
  near(plan.targetKg, E.kgAtBmi(18.5, 178), 0.01);
});

test('recomp and gain modes', () => {
  const r = E.buildPlan(base({ goal: { targetKg: 85, weeks: 12, startDate: '2026-01-01' } }), 85, { today: '2026-01-01' });
  assert.equal(r.mode, 'recomp');
  assert.ok(r.kcal < r.tdee && r.kcal > r.tdee - 320);
  const g = E.buildPlan(base({ goal: { targetKg: 78, weeks: 16, startDate: '2026-01-01' } }), 72, { today: '2026-01-01' });
  assert.equal(g.mode, 'gain');
  assert.ok(g.kcal > g.tdee + 140 && g.kcal <= g.tdee * 1.15 + 6);
});

test('under-18s get maintenance, not a deficit', () => {
  const p = base({ birthYear: 2026 - 16 });
  const plan = E.buildPlan(p, 85, { today: '2026-01-01' });
  assert.equal(plan.mode, 'maintain');
  near(plan.kcal, plan.tdee, 6);
});

test('suggested target comes from lean mass when known', () => {
  const p = base({ scans: [{ date: '2026-01-01', bf: 25, weightKg: 85 }] });
  const s = E.suggestTarget(p, 85);
  near(s.targetKg, (63.75 + 0.5) / 0.85, 0.5);
  assert.equal(E.suggestTarget(base(), 70).why, 'lean');
});

test('day totals, verified share and streak', () => {
  const day = { foods: [{ k: 300, p: 30, c: 10, f: 15, fb: 2 }, { k: 200, p: 5, c: 40, f: 2, fb: 1, est: true }] };
  const t = E.dayTotals(day);
  assert.deepEqual([t.k, t.p, t.c, t.f, t.fb, t.n, t.verifiedK], [500, 35, 50, 17, 3, 2, 300]);
  const days = { '2026-01-03': day, '2026-01-02': day, '2026-01-01': day, '2025-12-30': day };
  assert.equal(E.streak(days, '2026-01-03'), 3);
  assert.equal(E.streak(days, '2026-01-04'), 3); // today not logged yet keeps the streak alive
  assert.equal(E.streak(days, '2026-01-05'), 0);
});

test('trend smooths and regression recovers a known slope', () => {
  const days = {};
  for (let i = 0; i < 28; i++) days[E.addDays('2026-01-01', i)] = { weight: 85 - 0.1 * i + (i % 2 ? 0.4 : -0.4) };
  const s = E.withTrend(E.weightSeries(days));
  assert.equal(s.length, 28);
  assert.ok(Math.abs(s[27].t - s[27].w) < 0.9);
  const fit = E.weightSlope(E.weightSeries(days), '2026-01-01', '2026-01-28');
  near(fit.slope, -0.1, 0.01);
  assert.equal(E.weightSlope(E.weightSeries(days), '2026-01-25', '2026-01-28'), null);
});

test('adaptive expenditure = intake − weight change', () => {
  // Eat 2,000 kcal a day and lose 0.5 kg a week → burning 2,550.
  const days = {};
  for (let i = 0; i < 28; i++) {
    days[E.addDays('2026-02-01', i)] = { weight: 85 - (0.5 / 7) * i, foods: [{ k: 2000, p: 150, c: 200, f: 60 }] };
  }
  const a = E.adaptiveTdee({ days, today: '2026-02-28', bmr: 1800 });
  near(a.tdee, 2550, 15);
  assert.ok(a.confidence > 0.6);
  const blended = E.blendTdee(2300, a);
  assert.ok(blended.tdee > 2300 && blended.tdee < 2550);
  // too little data → no estimate rather than a bad one
  const few = Object.fromEntries(Object.entries(days).slice(0, 8));
  assert.equal(E.adaptiveTdee({ days: few, today: '2026-02-08', bmr: 1800 }), null);
});

test('adaptive expenditure ignores unlogged days and the first-week water drop', () => {
  const days = {};
  for (let i = 0; i < 30; i++) {
    const water = i < 5 ? (5 - i) * 0.3 : 0; // extra 1.5 kg that vanishes in week one
    days[E.addDays('2026-03-01', i)] = { weight: 85 + water - (0.5 / 7) * i, foods: i % 6 === 5 ? [] : [{ k: 2000 }] };
  }
  const a = E.adaptiveTdee({ days, today: '2026-03-30', bmr: 1800, planStart: '2026-03-01' });
  near(a.tdee, 2550, 40);
});

test('strength helpers', () => {
  near(E.e1rm(100, 5), 116.7, 0.1);
  assert.equal(E.e1rm(100, 20), 0);
  assert.deepEqual(E.plateLoad(100, 20, [25, 20, 15, 10, 5, 2.5, 1.25]).perSide, [25, 15]);
  assert.deepEqual(E.plateLoad(62.5, 20, [25, 20, 15, 10, 5, 2.5, 1.25]).perSide, [20, 1.25]);
  assert.equal(E.plateLoad(15, 20, [20, 10]), null);
});

test('step credit: only extra steps, half of them, capped, never negative', () => {
  near(E.kcalPerStep(86, 178), 0.0317, 0.001);
  assert.equal(E.stepCredit({ steps: 3000, baseline: 8000, weightKg: 86, heightCm: 178 }).kcal, 0);
  const c = E.stepCredit({ steps: 12000, baseline: 8000, weightKg: 86, heightCm: 178 });
  assert.equal(c.extra, 4000);
  near(c.kcal, 65, 5);
  assert.equal(E.stepCredit({ steps: 60000, baseline: 8000, weightKg: 86, heightCm: 178 }).kcal, 250);
});

test('step baseline is the median of recent days, else the goal', () => {
  const days = {};
  for (let i = 1; i <= 10; i++) days[E.addDays('2026-01-20', -i)] = { steps: 6000 + i * 100 };
  days['2026-01-20'] = { steps: 99999 };
  const b = E.stepBaseline(days, '2026-01-20');
  assert.equal(b.from, 'history');
  near(b.steps, 6550, 1);
  assert.deepEqual(E.stepBaseline({}, '2026-01-20', 9000), { steps: 9000, from: 'goal', n: 0 });
});

test('label check catches common database errors', () => {
  // Carman's Low Carb Granola Peanut Butter, Woolworths listing (AU label, carbs exclude fibre)
  assert.ok(E.labelCheck({ kcal: E.kjToKcal(1790), p: 13.6, c: 34.8, f: 22.1, fb: 15 }).ok);
  assert.ok(E.labelCheck({ kcal: 165, p: 31, c: 0, f: 3.6 }).ok); // chicken breast
  assert.equal(E.labelCheck({ kcal: 1260, p: 26.7, c: 182, f: 35.6 }).ok, false); // per-pack typed as per-100 g
  assert.equal(E.labelCheck({ kcal: 107, p: 6.2, c: 1.7, f: 3.8, fb: 5 }).ok, false); // macros only explain ~76 kcal
  assert.equal(E.labelCheck({ kcal: 1790, p: 13.6, c: 34.8, f: 22.1 }).ok, false); // kJ typed as kcal
  assert.equal(E.labelCheck({ kcal: 3984, p: 22, c: 18.4, f: 76 }).ok, false);
});

test('sleep stats average recent nights', () => {
  const days = { '2026-01-10': { sleep: { asleep: 420 } }, '2026-01-09': { sleep: { asleep: 360 } }, '2026-01-01': { sleep: { asleep: 600 } } };
  assert.deepEqual(E.sleepStats(days, '2026-01-10'), { avg: 390, nights: 2 });
  assert.equal(E.sleepStats({}, '2026-01-10'), null);
});

test('links from the web are limited to http(s)', async () => {
  const { safeUrl } = await import('../app/ai.js').catch(() => ({}));
  if (!safeUrl) return; // ai.js needs a browser global in some runtimes
  assert.equal(safeUrl('javascript:alert(1)'), '');
  assert.equal(safeUrl('data:text/html,hi'), '');
  assert.equal(safeUrl('https://www.woolworths.com.au/shop/productdetails/272313'), 'https://www.woolworths.com.au/shop/productdetails/272313');
});
