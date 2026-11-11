// Food lookup: the bundled USDA table, your own foods and recipes, and what
// you log most. Values are per 100 g; an entry stores the computed macros at
// the moment you log it, so later edits never rewrite your history.
import { addDays, dateKey } from './engine.js';

let table = null;
let loading = null;

export function loadFoods() {
  if (table) return Promise.resolve(table);
  loading ||= fetch('data/foods.json').then((r) => {
    if (!r.ok) throw new Error(`food table ${r.status}`);
    return r.json();
  }).then((d) => {
    table = d.foods.map(([key, name, g, kcal, p, c, f, fb, portions, flags, words]) => ({
      key, name, group: d.groups[g], kcal, p, c, f, fb, portions,
      curated: flags.includes('c'), src: flags.includes('t') ? 'typ' : 'usda',
      hay: norm(`${name} ${words || ''}`),
    }));
    return table;
  }).catch((e) => { loading = null; throw e; });
  return loading;
}

export const norm = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9%]+/g, ' ').trim();

export function libraryFoods(lib) {
  const own = (lib?.foods || []).map((f) => ({ ...f, own: true, hay: norm(`${f.name} ${f.brand || ''}`) }));
  const recipes = (lib?.recipes || []).map((r) => ({ ...recipePer100(r), own: true, hay: norm(r.name) }));
  return [...recipes, ...own];
}

export function recipePer100(r) {
  const t = { k: 0, p: 0, c: 0, f: 0, fb: 0, g: 0 };
  for (const i of r.items || []) { t.k += i.k || 0; t.p += i.p || 0; t.c += i.c || 0; t.f += i.f || 0; t.fb += i.fb || 0; t.g += i.g || 0; }
  const total = r.cookedG > 0 ? r.cookedG : t.g || 1;
  const s = 100 / total;
  const servings = Math.max(1, r.servings || 1);
  return {
    key: r.key, name: r.name, src: 'recipe', group: 'Recipe',
    kcal: t.k * s, p: t.p * s, c: t.c * s, f: t.f * s, fb: t.fb * s,
    portions: [[servings > 1 ? `1 serving (of ${servings})` : '1 serving', Math.round((total / servings) * 10) / 10]],
    est: (r.items || []).some((i) => i.est),
  };
}

// Foods you log most over the last 60 days, newest first among ties.
export function recentFoods(days, today = dateKey(), limit = 12) {
  const seen = new Map();
  for (let i = 0; i < 60; i++) {
    const k = addDays(today, -i);
    for (const e of days[k]?.foods || []) {
      if (!e.fid) continue;
      const s = seen.get(e.fid) || { n: 0, last: k, entry: e };
      s.n++;
      seen.set(e.fid, s);
    }
  }
  return [...seen.values()].sort((a, b) => b.n - a.n || (a.last < b.last ? 1 : -1)).slice(0, limit).map((s) => s.entry);
}

export function search(q, lib, recentIds = []) {
  const terms = norm(q).split(' ').filter(Boolean);
  if (!terms.length) return [];
  const pool = [...libraryFoods(lib), ...(table || [])];
  const recent = new Set(recentIds);
  const out = [];
  for (const f of pool) {
    let score = 0;
    let ok = true;
    for (const t of terms) {
      const i = f.hay.indexOf(t);
      if (i < 0) { ok = false; break; }
      score += i === 0 ? 30 : f.hay[i - 1] === ' ' ? 18 : 4;
    }
    if (!ok) continue;
    if (f.own) score += 60;
    if (recent.has(f.key)) score += 50;
    if (f.curated) score += 40;
    score -= f.hay.length / 12;
    if (/\b(raw|cooked)\b/.test(f.hay)) score += 1;
    out.push([score, f]);
  }
  return out.sort((a, b) => b[0] - a[0]).slice(0, 50).map((x) => x[1]);
}

export function findByKey(key, lib) {
  if (!key) return null;
  return libraryFoods(lib).find((f) => f.key === key) || (table || []).find((f) => f.key === key) || null;
}

// The entry stored in a day's log.
export function makeEntry(food, grams, meal, extra = {}) {
  const s = grams / 100;
  const r = (x) => Math.round((x || 0) * s * 10) / 10;
  return {
    id: Math.random().toString(36).slice(2, 10),
    fid: food.key, name: food.name, g: Math.round(grams * 10) / 10,
    k: Math.round((food.kcal || 0) * s), p: r(food.p), c: r(food.c), f: r(food.f), fb: r(food.fb),
    meal, src: food.src, est: !!(food.est || food.src === 'typ' || extra.est), t: Date.now(), ...extra,
  };
}

// Foods that close a protein gap without blowing the calorie budget.
export function proteinIdeas(proteinLeft, kcalLeft) {
  if (!table || proteinLeft < 15) return [];
  const picks = ['u1256', 'u5064', 'u43352', 'u15121', 'u1124', 'u16426', 'u15016', 'u1123', 't_whey', 'u16070'];
  const out = [];
  for (const key of picks) {
    const f = table.find((x) => x.key === key);
    if (!f || f.p <= 0) continue;
    const portion = f.portions?.[0];
    let g = Math.min(300, Math.max(30, (proteinLeft / f.p) * 100));
    if (portion) g = Math.max(portion[1], Math.round(g / portion[1]) * portion[1]);
    const kcal = (f.kcal * g) / 100;
    if (kcal > Math.max(kcalLeft, 0) + 60) continue;
    out.push({ food: f, g: Math.round(g), p: (f.p * g) / 100, kcal, density: f.p / Math.max(1, f.kcal) });
  }
  return out.sort((a, b) => b.density - a.density).slice(0, 3);
}
