// Open Food Facts: packaged foods by barcode (https://world.openfoodfacts.org,
// open data under the ODbL). Crowd-sourced, so every product is checked with
// labelCheck before it is trusted, and the person confirms the numbers before
// it is saved to their foods.
import { labelCheck, kjToKcal } from './engine.js';

const FIELDS = 'code,product_name,product_name_en,generic_name,brands,quantity,serving_size,serving_quantity,nutriments,image_front_small_url,countries_tags';
const r1 = (x) => Math.round(x * 10) / 10;
const num = (x) => (x === '' || x == null || !Number.isFinite(+x) ? null : +x);

// Normalise an OFF product to the app's food shape (per 100 g).
export function fromOff(p) {
  if (!p) return null;
  const n = p.nutriments || {};
  let kcal = num(n['energy-kcal_100g']);
  const kj = num(n['energy-kj_100g']) ?? num(n.energy_100g);
  if (kcal == null && kj != null) kcal = kjToKcal(kj);
  const v = { kcal, p: num(n.proteins_100g), c: num(n.carbohydrates_100g), f: num(n.fat_100g), fb: num(n.fiber_100g) ?? 0 };
  const name = (p.product_name_en || p.product_name || p.generic_name || '').trim();
  const brand = String(p.brands || '').split(',')[0].trim();
  const complete = v.kcal != null && v.p != null && v.c != null && v.f != null;
  const check = complete ? labelCheck(v) : { ok: false, reason: 'missing' };
  const sq = num(p.serving_quantity);
  return {
    key: `off_${p.code}`, code: p.code, name: name || 'Unnamed product', brand, src: 'off',
    kcal: complete ? r1(v.kcal) : null, p: v.p, c: v.c, f: v.f, fb: v.fb,
    portions: sq > 0 && sq < 2000 ? [[p.serving_size ? `1 serving (${p.serving_size})` : '1 serving', sq]] : [],
    quantity: p.quantity || '', image: /^https:\/\/images\.openfoodfacts\.org\//.test(p.image_front_small_url || '') ? p.image_front_small_url : '',
    complete, check, url: `https://world.openfoodfacts.org/product/${p.code}`,
  };
}

export async function lookupBarcode(code, { signal } = {}) {
  const clean = String(code).replace(/\D/g, '');
  if (clean.length < 6) throw new Error('That barcode is too short.');
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${clean}.json?fields=${FIELDS}`, { signal });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Open Food Facts answered ${res.status}. Try again in a minute.`);
  const d = await res.json();
  if (d.status !== 1 || !d.product) return null;
  return fromOff({ ...d.product, code: d.product.code || clean });
}
