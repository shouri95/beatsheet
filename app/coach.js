// The coach: turns your log into targets and advice. Deterministic rules on
// top of engine.js, so the advice is the same every time for the same data.
import * as E from './engine.js';
import { sessionsThisWeek } from './program.js';

export const STEP_GOAL = { cut: 9000, recomp: 8000, gain: 7000, maintain: 8000 };

export function currentWeight(profile, days) {
  const s = E.withTrend(E.weightSeries(days));
  if (s.length) return { kg: s[s.length - 1].t, raw: s[s.length - 1].w, date: s[s.length - 1].date, series: s };
  return { kg: profile?.goal?.startKg || profile?.weightKg || 70, raw: null, date: null, series: [] };
}

// Full plan from today's numbers. Uses what your log says you burn once
// there are a few weeks of data, and the formula before that.
export function computePlan(profile, days, today = E.dateKey()) {
  const w = currentWeight(profile, days).kg;
  const { bmr, tdee: formula } = E.formulaTdee(profile, w);
  const adaptive = E.adaptiveTdee({ days, today, bmr, planStart: profile.goal?.startDate });
  const blend = E.blendTdee(formula, adaptive);
  const plan = E.buildPlan(profile, w, { today, tdee: blend.tdee });
  return { ...plan, weightKg: w, formulaTdee: formula, adaptive, tdeeSource: blend.source, tdeeConfidence: blend.confidence, steps: STEP_GOAL[plan.mode] || 8000 };
}

export function targetsFrom(plan, today = E.dateKey()) {
  return { kcal: plan.kcal, p: plan.p, c: plan.c, f: plan.f, fiber: plan.fiber, steps: plan.steps, tdee: Math.round(plan.tdee), mode: plan.mode, set: today, source: plan.tdeeSource };
}

/* ───────────── weekly check-in ───────────── */

export function checkinDue(profile, today = E.dateKey()) {
  const last = profile?.coach?.lastCheckin || profile?.goal?.startDate;
  return !last || E.diffDays(last, today) >= 7;
}

export function weekReview(profile, days, today = E.dateKey()) {
  const t = profile.targets || {};
  const from = E.addDays(today, -7);
  let logged = 0, kcal = 0, protein = 0, proteinDays = 0, onTarget = 0, steps = 0, stepDays = 0, est = 0, all = 0;
  for (let i = 1; i <= 7; i++) {
    const k = E.addDays(today, -i);
    const d = days[k];
    const tot = E.dayTotals(d);
    if (tot.n) {
      logged++; kcal += tot.k; protein += tot.p; all += tot.k; est += tot.k - tot.verifiedK;
      if (t.p && tot.p >= 0.9 * t.p) proteinDays++;
      if (E.dayScore(tot, { kcal: t.kcal, p: t.p })?.onTarget) onTarget++;
    }
    if (d?.steps > 0) { steps += d.steps; stepDays++; }
  }
  const series = E.withTrend(E.weightSeries(days));
  const at = (k) => { let v = null; for (const p of series) if (p.date <= k) v = p.t; return v; };
  const wNow = at(today), wThen = at(from);
  const change = wNow != null && wThen != null ? wNow - wThen : null;
  const waist = Object.keys(days).filter((k) => days[k]?.waist > 0).sort();
  const waistNow = waist.length ? days[waist[waist.length - 1]].waist : null;
  const waistStart = waist.length ? days[waist[0]].waist : null;
  const plan = computePlan(profile, days, today);
  const sessions = Object.keys(days).filter((k) => k >= from && k < today && days[k]?.workout?.done).length;
  return {
    logged, avgKcal: logged ? kcal / logged : 0, avgProtein: logged ? protein / logged : 0, proteinDays, onTarget,
    avgSteps: stepDays ? steps / stepDays : null, estShare: all ? est / all : 0,
    change, wNow, plan, sessions, waistNow, waistStart, sleep: E.sleepStats(days, E.addDays(today, -1), 7), waistDelta: waistNow != null && waistStart != null && waist.length > 1 ? waistNow - waistStart : null,
    kcalDiff: plan.kcal - (t.kcal || plan.kcal),
  };
}

// Plain-language notes, most important first.
export function reviewNotes(profile, r) {
  const t = profile.targets || {};
  const notes = [];
  const plan = r.plan;
  if (r.logged < 5) notes.push({ tone: 'warn', title: `You logged ${r.logged} of 7 days`, body: 'The plan corrects itself from what you eat and weigh. With gaps it has to guess, so the targets stay on the formula. Aim for every day, even rough entries.' });
  if (r.change != null && r.wNow) {
    const pct = (r.change / r.wNow) * 100;
    const expected = plan.rateKgWk;
    if (plan.mode === 'cut' && pct < -1.1) notes.push({ tone: 'warn', title: 'Losing faster than planned', body: `About ${Math.abs(pct).toFixed(1)}% of your body weight in a week. Past 1% a week you start losing muscle too. Eat a little more; the new target accounts for it.` });
    else if (plan.mode === 'cut' && r.change > -0.05 && r.logged >= 5) notes.push({ tone: 'info', title: 'Weight held steady this week', body: 'One flat week is normal; water and food in your gut swing 1–2 kg day to day. If it holds for two weeks with good logging, the plan lowers your calories automatically.' });
    else if (plan.mode === 'cut' && expected < 0 && r.change <= expected * 0.6) notes.push({ tone: 'good', title: 'Right on pace', body: `Trend weight moved ${r.change.toFixed(1)} kg this week. That rate keeps muscle while the fat comes off.` });
    if (plan.mode === 'gain' && pct > 0.6) notes.push({ tone: 'warn', title: 'Gaining fast', body: 'More than about 0.5% a week is mostly fat for most people. The plan trims calories slightly.' });
  }
  if (t.p && r.logged && r.proteinDays < Math.min(5, r.logged)) notes.push({ tone: 'warn', title: `Protein hit on ${r.proteinDays} of ${r.logged} logged days`, body: `Protein is what makes the weight you lose fat instead of muscle. ${t.p} g a day is the target. The easy wins: a protein source at every meal, Greek yogurt, eggs, lean meat, fish, tofu, or a whey shake.` });
  const planned = profile.train?.days || 3;
  if (r.sessions < planned) notes.push({ tone: r.sessions === 0 ? 'warn' : 'info', title: `${r.sessions} of ${planned} workouts done`, body: 'Lifting is the signal that tells your body to keep muscle in a deficit, and to build it otherwise. If the schedule is too ambitious, lower the days per week in Settings; consistency beats volume.' });
  else notes.push({ tone: 'good', title: `All ${planned} workouts done`, body: 'That is the part most people skip. Keep adding a rep or a little weight each week.' });
  if (r.avgSteps != null && r.avgSteps < (t.steps || 8000) * 0.8) notes.push({ tone: 'info', title: `About ${Math.round(r.avgSteps / 100) * 100 > 0 ? (Math.round(r.avgSteps / 100) * 100).toLocaleString() : 0} steps a day`, body: `Walking is the cheapest fat-loss tool you have and barely affects recovery. Target ${(t.steps || 8000).toLocaleString()}: a 20-minute walk after a meal adds around 2,000.` });
  if (r.sleep && r.sleep.nights >= 3 && r.sleep.avg < 420) notes.push({ tone: 'warn', title: `About ${(r.sleep.avg / 60).toFixed(1)} hours of sleep a night`, body: 'Under 7 hours raises hunger hormones, makes cravings harder to resist, and in a deficit more of the weight you lose comes from muscle. A fixed bedtime and no screens for the last 30 minutes are the cheapest fixes.' });
  else if (r.sleep && r.sleep.nights >= 3) notes.push({ tone: 'good', title: `${(r.sleep.avg / 60).toFixed(1)} hours of sleep a night`, body: 'Good recovery. It is quietly doing a lot for your fat loss and strength.' });
  if (r.estShare > 0.4) notes.push({ tone: 'info', title: `${Math.round(r.estShare * 100)}% of calories were estimates`, body: 'Estimates from photos or descriptions are usually within 20–30%. For the meals you eat often, weigh them once with a kitchen scale and save them as a recipe. Then they are exact forever.' });
  if (r.waistDelta != null && r.waistDelta < -0.4) notes.push({ tone: 'good', title: `Waist down ${Math.abs(r.waistDelta).toFixed(1)} cm since you started measuring`, body: 'This is the belly fat coming off. Waist often moves even in weeks the scale does not.' });
  return notes;
}

/* ───────────── today ───────────── */

export function todayTips({ profile, totals, targets, hour = new Date().getHours(), trainedToday, sessionsWeek }) {
  const tips = [];
  if (!targets) return tips;
  const kLeft = targets.kcal - totals.k;
  const pLeft = targets.p - totals.p;
  if (!totals.n) tips.push(hour < 11 ? 'Log breakfast while you eat it. It takes 20 seconds, and the day is easier to steer from there.' : 'Nothing logged yet today. Start with what you remember; rough is better than empty.');
  else if (kLeft < -150) tips.push(`You are ${Math.round(-kLeft)} kcal over. That is fine once in a while; do not try to make it up tomorrow. Just get back on target.`);
  else if (pLeft > 25 && hour >= 15) tips.push(`${Math.round(pLeft)} g protein to go with ${Math.max(0, Math.round(kLeft))} kcal left. Make the next meal protein-first.`);
  else if (pLeft <= 5 && kLeft >= -60 && kLeft <= 250) tips.push('Protein hit and calories on target. That is a winning day.');
  const planned = profile.train?.days || 3;
  if (!trainedToday && sessionsWeek < planned && hour >= 6) tips.push(`${sessionsWeek} of ${planned} workouts this week.`);
  return tips;
}

// Compact text summary for the AI coach.
export function contextFor(profile, days, today = E.dateKey()) {
  const t = profile.targets || {};
  const w = currentWeight(profile, days);
  const lines = [];
  const age = E.ageOf(profile, Number(today.slice(0, 4)));
  lines.push(`Sex ${profile.sex === 'f' ? 'female' : 'male'}, age ${age}, height ${Math.round(profile.heightCm)} cm, trend weight ${E.roundTo(w.kg, 0.1)} kg.`);
  const comp = E.bodyComp(profile, w.kg);
  if (comp) lines.push(`Estimated body fat ${E.roundTo(comp.bf, 0.5)}% (lean mass ${E.roundTo(comp.leanKg, 0.1)} kg, from ${comp.scan.src || 'a measurement'} on ${comp.scan.date}).`);
  const g = profile.goal || {};
  lines.push(`Goal: ${E.roundTo(g.targetKg || w.kg, 0.1)} kg by ${E.addDays(g.startDate || today, Math.round((g.weeks || 12) * 7))} (started ${g.startDate} at ${g.startKg} kg). Mode: ${t.mode}.`);
  lines.push(`Daily targets: ${t.kcal} kcal, protein ${t.p} g, carbs ${t.c} g, fat ${t.f} g, ${t.steps} steps. Estimated expenditure ${t.tdee} kcal (${t.source}).`);
  lines.push(`Training: ${profile.train?.days} days/week, ${profile.train?.equipment}, level ${profile.train?.level}. ${sessionsThisWeek(days, today)} sessions so far this week.`);
  lines.push('Last 7 days (kcal / protein g / weight kg / steps / sleep h / workout):');
  for (let i = 0; i < 7; i++) {
    const k = E.addDays(today, -i);
    const d = days[k];
    const tot = E.dayTotals(d);
    lines.push(`${k}: ${tot.n ? Math.round(tot.k) : '-'} / ${tot.n ? Math.round(tot.p) : '-'} / ${d?.weight ? E.roundTo(d.weight, 0.1) : '-'} / ${d?.steps || '-'} / ${d?.sleep?.asleep ? (d.sleep.asleep / 60).toFixed(1) : '-'} / ${d?.workout?.done ? d.workout.name : '-'}`);
  }
  const todayFoods = (days[today]?.foods || []).map((e) => `${e.name} ${e.g} g`).slice(0, 25);
  if (todayFoods.length) lines.push(`Eaten today: ${todayFoods.join('; ')}.`);
  return lines.join('\n');
}
