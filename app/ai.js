// Claude-powered helpers: describe or photograph a meal, read a nutrition
// label or a body-scan report, look a branded product's label up online, and
// talk to the coach.
//
// Two providers, same functions:
//   claude — inside Claude (the artifact), on the viewer's own Claude plan.
//            No web access, so branded foods are flagged rather than looked up.
//   api    — the installed app with your own Anthropic API key (stored only on
//            this device). Adds online label lookup through web search.
// Every result is shown for review before anything is saved.
import { isArtifact } from './env.js';
import { getSecrets } from './store.js';

/* ───────────── provider selection ───────────── */

let samplePromise = null;
function getSample() {
  if (!isArtifact) return Promise.resolve(null);
  samplePromise ||= window.claude.use('sample').catch(() => null);
  return samplePromise;
}

let apiPromise = null;
/* global __WEB__ */
function getApi() {
  if (!__WEB__ || isArtifact || !getSecrets().anthropicKey) return Promise.resolve(null);
  apiPromise ||= import('./ai-api.js');
  return apiPromise;
}
// The API module itself, for settings (model list, key test).
export const apiModule = () => (__WEB__ && !isArtifact ? import('./ai-api.js') : Promise.resolve(null));
export function resetAi() { apiPromise = null; }

// What this view can do. { provider, text, images, web }
export async function aiCaps() {
  const api = await getApi();
  if (api) return { provider: 'api', text: true, images: true, web: true };
  const s = await getSample();
  if (!s) return { provider: null, text: false, images: false, web: false };
  const lim = await s.limits().catch(() => null);
  return { provider: 'claude', text: true, images: !!lim?.images, web: false };
}

export function aiErrorText(e) {
  switch (e?.code) {
    case 'not_granted': case 'sampling_disabled': case 'not_declared': return 'Claude is turned off for this page. You can still log by search, barcode or label.';
    case 'bad_key': return 'Your Anthropic API key was rejected. Check it in Plan & settings → AI.';
    case 'no_credit': return 'Your Anthropic account has no credit left. Add some in the Anthropic Console, then try again.';
    case 'rate_limited': return 'Claude is busy or you have hit a usage limit. Try again in a minute.';
    case 'invalid_json': case 'empty_completion': return 'That answer came back garbled. Try again, or describe it a little differently.';
    case 'image_rejected': return 'That image could not be read. Try a clearer, closer photo.';
    case 'refused': return 'Claude would not answer that one. Try rewording it.';
    case 'session_expired': return 'Your Claude session expired. Sign in again and retry.';
    case 'offline': return 'You are offline. Search, barcode lookups of saved foods and manual entry still work.';
    case 'cancelled': return '';
    default: return 'Something went wrong reaching Claude. Try again.';
  }
}

/* ───────────── shared prompt text ───────────── */

export const MEAL_RULES = `You are a meticulous dietitian estimating a meal for a calorie-tracking app whose user wants exact numbers.
Split the meal into separate items (including cooking oil, butter, sauces, milk in coffee, and drinks), each with its weight in grams as eaten.
If a weight, volume or count is given, use it exactly. Otherwise use a typical home portion and mark confidence "low".
For generic foods use USDA FoodData Central values.
Branded or packaged products (a brand name, a supermarket product, a restaurant chain) need special care. Never infer their macros from marketing words such as "low carb", "keto", "protein" or "lite": those products are often still high in carbohydrate or fat. Set branded to true, put the brand and the product name in their own fields.`;

const num = (x) => (Number.isFinite(+x) ? +x : 0);
// Links shown to you come from web pages; only plain web addresses pass.
export const safeUrl = (u) => { try { const x = new URL(String(u)); return x.protocol === 'https:' || x.protocol === 'http:' ? x.href.slice(0, 400) : ''; } catch { return ''; } };

export function cleanItems(res) {
  const items = Array.isArray(res?.items) ? res.items : [];
  return {
    note: typeof res?.note === 'string' ? res.note.slice(0, 240) : '',
    items: items.slice(0, 20).map((i) => {
      const per100 = i.label_kcal_per_100g > 0 ? { kcal: num(i.label_kcal_per_100g), p: num(i.label_protein_per_100g), c: num(i.label_carbs_per_100g), f: num(i.label_fat_per_100g), fb: num(i.label_fiber_per_100g) } : null;
      return {
        name: String(i.name || 'Food').slice(0, 80), brand: String(i.brand || '').slice(0, 60), product: String(i.product || '').slice(0, 80),
        branded: !!i.branded, g: Math.max(1, num(i.grams)),
        k: Math.max(0, Math.round(num(i.kcal))), p: Math.max(0, num(i.protein)), c: Math.max(0, num(i.carbs)), f: Math.max(0, num(i.fat)), fb: Math.max(0, num(i.fiber)),
        conf: ['high', 'medium', 'low'].includes(i.confidence) ? i.confidence : 'medium',
        per100, source: safeUrl(i.label_source_url) ? { url: safeUrl(i.label_source_url), name: String(i.label_source_name || '').slice(0, 80) } : null,
      };
    }).filter((i) => i.g > 0),
  };
}

// JSON schema shared by both providers (and the strict report tool).
export const MEAL_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['items', 'note'],
  properties: {
    note: { type: 'string', description: 'One short sentence on what would make this more accurate, or empty.' },
    items: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['name', 'branded', 'brand', 'product', 'grams', 'kcal', 'protein', 'carbs', 'fat', 'fiber', 'confidence', 'label_kcal_per_100g', 'label_protein_per_100g', 'label_carbs_per_100g', 'label_fat_per_100g', 'label_fiber_per_100g', 'label_source_url', 'label_source_name'],
        properties: {
          name: { type: 'string', description: 'Short generic name, e.g. "Chicken breast, cooked", or the product name for branded items' },
          branded: { type: 'boolean' },
          brand: { type: 'string', description: 'Brand for branded items, else empty' },
          product: { type: 'string', description: 'Product name as sold for branded items, else empty' },
          grams: { type: 'number' },
          kcal: { type: 'number', description: 'For the stated grams' },
          protein: { type: 'number' }, carbs: { type: 'number' }, fat: { type: 'number' }, fiber: { type: 'number' },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          label_kcal_per_100g: { type: 'number', description: 'From the official nutrition label if you found it, else 0' },
          label_protein_per_100g: { type: 'number' }, label_carbs_per_100g: { type: 'number' }, label_fat_per_100g: { type: 'number' }, label_fiber_per_100g: { type: 'number' },
          label_source_url: { type: 'string', description: 'Web page the label values came from, else empty' },
          label_source_name: { type: 'string', description: 'Site name, e.g. "Woolworths", else empty' },
        },
      },
    },
  },
};

export const LABEL_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['readable', 'name', 'brand', 'serving_g', 'serving_label', 'per100_kcal', 'per100_protein', 'per100_carbs', 'per100_fat', 'per100_fiber', 'serving_kcal', 'serving_protein', 'serving_carbs', 'serving_fat', 'serving_fiber'],
  properties: {
    readable: { type: 'boolean' }, name: { type: 'string' }, brand: { type: 'string' },
    serving_g: { type: 'number', description: 'Serving size in grams or ml, 0 if not shown' }, serving_label: { type: 'string' },
    per100_kcal: { type: 'number', description: 'Per 100 g/ml. 0 if the label has no per-100 column. Convert kJ to kcal by dividing by 4.184.' },
    per100_protein: { type: 'number' }, per100_carbs: { type: 'number' }, per100_fat: { type: 'number' }, per100_fiber: { type: 'number' },
    serving_kcal: { type: 'number', description: 'Per serving, 0 if not shown' },
    serving_protein: { type: 'number' }, serving_carbs: { type: 'number' }, serving_fat: { type: 'number' }, serving_fiber: { type: 'number' },
  },
};
export const LABEL_PROMPT = 'The image is a nutrition information panel (any country). Read the numbers exactly as printed; do not estimate. Use total carbohydrate as printed (Australian and EU labels already exclude fibre; report it as shown). If energy is only in kJ, convert to kcal by dividing by 4.184. Use 0 for anything not printed.';

export function cleanLabel(r) {
  const block = (pre) => (num(r?.[pre + 'kcal']) > 0 ? { kcal: num(r[pre + 'kcal']), p: num(r[pre + 'protein']), c: num(r[pre + 'carbs']), f: num(r[pre + 'fat']), fb: num(r[pre + 'fiber']) } : null);
  return {
    readable: r?.readable !== false, name: String(r?.name || '').slice(0, 80), brand: String(r?.brand || '').slice(0, 60),
    servingG: num(r?.serving_g) || null, servingLabel: String(r?.serving_label || '').slice(0, 40),
    per100: block('per100_'), perServing: block('serving_'),
  };
}

export const SCAN_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['device', 'date', 'weight_kg', 'body_fat_pct', 'lean_mass_kg', 'skeletal_muscle_kg', 'visceral_fat', 'waist_cm'],
  properties: {
    device: { type: 'string' }, date: { type: 'string', description: 'YYYY-MM-DD or empty' },
    weight_kg: { type: 'number', description: '0 if not shown' }, body_fat_pct: { type: 'number' }, lean_mass_kg: { type: 'number', description: 'Fat-free mass' },
    skeletal_muscle_kg: { type: 'number' }, visceral_fat: { type: 'number' }, waist_cm: { type: 'number' },
  },
};
export const SCAN_PROMPT = 'The image is a body composition report (DEXA, InBody, Tanita, Withings, a smart scale app or similar). Read the numbers exactly as printed. Convert pounds to kg (x 0.4536) and inches to cm (x 2.54). lean_mass_kg is fat-free mass (weight minus fat mass) if shown or derivable. Use 0 for anything not shown.';

export function cleanScan(r) {
  const n = (x) => (num(x) > 0 ? num(x) : null);
  return {
    device: String(r?.device || '').slice(0, 40), date: /^\d{4}-\d{2}-\d{2}$/.test(r?.date || '') ? r.date : '',
    weightKg: n(r?.weight_kg), bf: n(r?.body_fat_pct), leanKg: n(r?.lean_mass_kg), smmKg: n(r?.skeletal_muscle_kg), visceral: n(r?.visceral_fat), waistCm: n(r?.waist_cm),
  };
}

export const COACH_RULES = `You are the person's strength and nutrition coach inside the app "Plates". Be direct, warm and specific, like a good personal trainer. Keep answers under 180 words unless asked for more. Use their numbers below. Never suggest going under their calorie floor, crash diets, or losing more than 1% of body weight a week. Spot reduction of belly fat is not possible: fat comes off the belly through an overall deficit, protein, lifting, steps and sleep; say so when relevant. For pain, injury, medication or medical conditions, tell them to see a doctor or physio. Plain text, short paragraphs or a short list, no markdown headings.`;

/* ───────────── image prep ───────────── */

// Downscale to ≤1568 px and re-encode as JPEG: smaller upload, fewer tokens,
// and iPhone HEIC photos become something every model reads.
export async function prepImage(file, max = 1568) {
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) return file;
  const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const cv = document.createElement('canvas');
  cv.width = Math.round(bmp.width * s); cv.height = Math.round(bmp.height * s);
  cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
  return new Promise((res) => cv.toBlob((b) => res(b || file), 'image/jpeg', 0.85));
}

/* ───────────── public functions ───────────── */

const SAMPLE_JSON_TAIL = (schema) => `\n\nReply with only JSON matching this schema:\n${JSON.stringify(schema)}`;

export async function describeMeal(text, signal) {
  const api = await getApi();
  if (api) return api.describeMeal(text, { signal });
  const s = await getSample();
  if (!s) throw { code: 'not_granted' };
  const res = await s.json(`${MEAL_RULES}\nYou cannot browse, so for branded items give your best estimate with confidence "low" and set every label_ field to 0 or empty.${SAMPLE_JSON_TAIL(MEAL_SCHEMA)}\n\nMeal: ${text.slice(0, 1500)}`, { signal });
  return cleanItems(res);
}

export async function photoMeal(file, hint, signal) {
  const img = await prepImage(file);
  const api = await getApi();
  if (api) return api.photoMeal(img, hint, { signal });
  const s = await getSample();
  if (!s) throw { code: 'not_granted' };
  const res = await s.json(`${MEAL_RULES}\nYou cannot browse, so for branded items give your best estimate with confidence "low" and set every label_ field to 0 or empty.${SAMPLE_JSON_TAIL(MEAL_SCHEMA)}\n\nThe image is a photo of the meal.${hint ? ` The person adds: ${hint.slice(0, 400)}` : ''} Use plate size, utensils and packaging to judge portions.`, { images: [img], signal, cache: false });
  return cleanItems(res);
}

export async function readLabel(file, signal) {
  const img = await prepImage(file);
  const api = await getApi();
  if (api) return api.readLabel(img, { signal });
  const s = await getSample();
  if (!s) throw { code: 'not_granted' };
  return cleanLabel(await s.json(LABEL_PROMPT + SAMPLE_JSON_TAIL(LABEL_SCHEMA), { images: [img], signal, cache: false }));
}

export async function readScan(file, signal) {
  const img = await prepImage(file);
  const api = await getApi();
  if (api) return api.readScan(img, { signal });
  const s = await getSample();
  if (!s) throw { code: 'not_granted' };
  return cleanScan(await s.json(SCAN_PROMPT + SAMPLE_JSON_TAIL(SCAN_SCHEMA), { images: [img], signal, cache: false }));
}

// Online label lookup (API provider only).
export async function lookupProduct(query, { signal, country } = {}) {
  const api = await getApi();
  if (!api) throw { code: 'not_granted' };
  return api.lookupProduct(query, { signal, country });
}

export async function askCoach(turns, context, { onText, signal } = {}) {
  const api = await getApi();
  if (api) return api.askCoach(turns, context, { onText, signal });
  const s = await getSample();
  if (!s) throw { code: 'not_granted' };
  return s([{ role: 'user', content: `${COACH_RULES}\n\nTheir data:\n${context}` }, ...turns.slice(-12)], { onText, signal, cache: false });
}
