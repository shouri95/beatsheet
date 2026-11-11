// Builds app/data/foods.json from a USDA Standard Reference JSON export.
//
//   npm run foods -- path/to/database.json
//
// Source used for the shipped file: the USDA National Nutrient Database for
// Standard Reference snapshot published with "Python for Data Analysis"
// (https://raw.githubusercontent.com/wesm/pydata-book/3rd-edition/datasets/usda_food/database.json).
// USDA data is public domain.
//
// Output is compact on purpose (it ships to the browser):
//   { v, foods: [[key, name, group, kcal, p, c, f, fiber, portions, flags, words]] }
//   flags: 'c' everyday/curated, 't' typical value (not USDA)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CURATED, MANUAL, TYPICAL } from './foods/curated.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const src = process.argv[2];
if (!src) { console.error('usage: npm run foods -- path/to/database.json'); process.exit(1); }
const db = JSON.parse(fs.readFileSync(src, 'utf8'));

const r1 = (x) => (x == null ? 0 : Math.round(x * 10) / 10);
const SKIP_GROUPS = new Set(['Baby Foods']);
const GROUP = {
  'Dairy and Egg Products': 'Dairy & eggs', 'Poultry Products': 'Poultry', 'Beef Products': 'Beef', 'Pork Products': 'Pork',
  'Lamb, Veal, and Game Products': 'Lamb & game', 'Finfish and Shellfish Products': 'Fish', 'Sausages and Luncheon Meats': 'Deli meats',
  'Legumes and Legume Products': 'Legumes', 'Cereal Grains and Pasta': 'Grains', 'Baked Products': 'Bakery', 'Breakfast Cereals': 'Cereal',
  'Vegetables and Vegetable Products': 'Vegetables', 'Fruits and Fruit Juices': 'Fruit', 'Nut and Seed Products': 'Nuts & seeds',
  'Fats and Oils': 'Fats & oils', 'Sweets': 'Sweets', 'Snacks': 'Snacks', 'Beverages': 'Drinks', 'Soups, Sauces, and Gravies': 'Soups & sauces',
  'Fast Foods': 'Fast food', 'Restaurant Foods': 'Restaurant', 'Meals, Entrees, and Sidedishes': 'Meals', 'Ethnic Foods': 'Traditional',
  'Spices and Herbs': 'Spices',
};
const groups = [];
const gi = (g) => { const n = GROUP[g] || g || 'Other'; let i = groups.indexOf(n); if (i < 0) { groups.push(n); i = groups.length - 1; } return i; };

function macros(e) {
  const m = {};
  for (const n of e.nutrients) {
    const k = `${n.description}|${n.units}`;
    if (!(k in m)) m[k] = n.value;
  }
  return {
    kcal: m['Energy|kcal'], p: m['Protein|g'], c: m['Carbohydrate, by difference|g'], f: m['Total lipid (fat)|g'], fb: m['Fiber, total dietary|g'],
  };
}

// The snapshot lost the real "amount" of each household measure (it stores a
// sequence number instead), so volume measures like "cup" or "tbsp" can't be
// trusted. Count-style measures ("1 large", "1 slice") and ounces can.
const COUNT = /^(extra large|large|medium|small|jumbo|slice|piece|item|breast|thigh|drumstick|wing|fillet|steak|chop|patty|link|strip|egg|cookie|bar|muffin|bagel|tortilla|roll|bun|pancake|waffle|serving|container|package|can|bottle|fruit|burger|sandwich|sausage|frankfurter|pita|date|nugget|biscuit|crepe|taco|burrito|pizza|wedge|fl oz)/i;
function portionsOf(e) {
  const out = [];
  for (const p of e.portions || []) {
    const u = String(p.unit || '').replace(/\s+/g, ' ').trim();
    if (!(p.grams > 0) || !u) continue;
    if (u === 'oz') { const n = Math.round(p.grams / 28.35); if (n >= 1) out.push([`${n} oz`, r1(p.grams)]); continue; }
    if (/^fl oz/i.test(u)) continue;
    if (COUNT.test(u)) out.push([`1 ${u}`.slice(0, 48), r1(p.grams)]);
  }
  const seen = new Set();
  return out.filter(([l]) => (seen.has(l) ? false : (seen.add(l), true))).slice(0, 4);
}

const byId = new Map(db.map((e) => [e.id, e]));
const manual = new Map(MANUAL.map((m) => [m.id, m]));
const rows = [];
const used = new Set();

for (const [name, id, portions, words] of CURATED) {
  const e = byId.get(id); const m = manual.get(id);
  if (!e && !m) throw new Error(`curated food ${name} (${id}) not found`);
  const v = m || macros(e);
  if (!(v.kcal >= 0)) throw new Error(`no energy value for ${name}`);
  const ps = portions.length ? portions.map(([l, g]) => [l, g]) : e ? portionsOf(e) : [];
  rows.push([`u${id}`, name, e ? gi(e.group) : gi(m.group || 'Dairy and Egg Products'), r1(v.kcal), r1(v.p), r1(v.c), r1(v.f), r1(v.fb), ps, 'c', words || '']);
  used.add(id);
}
for (const t of TYPICAL) rows.push([`t_${t.key}`, t.name, gi('Other'), t.kcal, t.p, t.c, t.f, t.fb, t.portions, 'ct', t.words || '']);

for (const e of db) {
  if (used.has(e.id) || SKIP_GROUPS.has(e.group)) continue;
  const v = macros(e);
  if (v.kcal == null || v.p == null || v.c == null || v.f == null) continue;
  rows.push([`u${e.id}`, e.description, gi(e.group), r1(v.kcal), r1(v.p), r1(v.c), r1(v.f), r1(v.fb), portionsOf(e), '', '']);
}
for (const m of MANUAL) if (!used.has(m.id)) rows.push([`u${m.id}`, m.name, gi('Dairy and Egg Products'), m.kcal, m.p, m.c, m.f, m.fb, [], '', '']);

const out = { v: 1, source: 'USDA National Nutrient Database for Standard Reference', groups, foods: rows };
const dest = path.join(root, 'app', 'data', 'foods.json');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, JSON.stringify(out));
console.log(`wrote ${rows.length} foods (${CURATED.length} everyday) → ${path.relative(root, dest)} ${(fs.statSync(dest).size / 1024).toFixed(0)} KB`);
