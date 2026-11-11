// Claude-powered helpers. Available only when the app runs as a Claude
// artifact; everywhere else they stay hidden and the app works without them.
// Every result is shown for review before anything is saved.

let samplePromise = null;
export function getSample() {
  const c = typeof window !== 'undefined' ? window.claude : null;
  if (!c || typeof c.use !== 'function') return Promise.resolve(null);
  samplePromise ||= c.use('sample').catch(() => null);
  return samplePromise;
}

export async function canUseImages() {
  const s = await getSample();
  if (!s) return false;
  const lim = await s.limits().catch(() => null);
  return !!lim?.images;
}

export function aiErrorText(e) {
  switch (e?.code) {
    case 'not_granted': case 'sampling_disabled': case 'not_declared': return 'Claude is turned off for this page. You can still log by search or by hand.';
    case 'rate_limited': return 'Claude is busy or you have hit a usage limit. Try again in a minute.';
    case 'invalid_json': case 'empty_completion': return 'That answer came back garbled. Try again, or describe it a little differently.';
    case 'image_rejected': return 'That image could not be read. Try a clearer, closer photo (JPEG or PNG).';
    case 'refused': return 'Claude would not answer that one. Try rewording it.';
    case 'session_expired': return 'Your Claude session expired. Sign in again and retry.';
    case 'cancelled': return '';
    default: return 'Something went wrong reaching Claude. Try again.';
  }
}

const num = (x) => (Number.isFinite(+x) ? +x : 0);

const MEAL_RULES = `You are a meticulous dietitian estimating a meal for a calorie-tracking app.
Split the meal into separate ingredients (including cooking oil, butter, sauces and drinks), each with an estimated cooked weight in grams.
Use USDA FoodData Central values. If a weight or count is given, use it exactly. Prefer typical home portions when unspecified.
Reply with only JSON: {"items":[{"name":"short generic food name as it would appear in USDA, e.g. Chicken breast, cooked","grams":number,"kcal":number,"protein":number,"carbs":number,"fat":number,"fiber":number,"confidence":"high"|"medium"|"low"}],"note":"one short sentence on what would make this more accurate, or empty"}
All nutrient numbers are for the stated grams, not per 100 g.`;

function cleanItems(res) {
  const items = Array.isArray(res?.items) ? res.items : [];
  return {
    note: typeof res?.note === 'string' ? res.note.slice(0, 200) : '',
    items: items.slice(0, 20).map((i) => ({
      name: String(i.name || 'Food').slice(0, 80), g: Math.max(1, num(i.grams)),
      k: Math.max(0, Math.round(num(i.kcal))), p: Math.max(0, num(i.protein)), c: Math.max(0, num(i.carbs)), f: Math.max(0, num(i.fat)), fb: Math.max(0, num(i.fiber)),
      conf: ['high', 'medium', 'low'].includes(i.confidence) ? i.confidence : 'medium',
    })).filter((i) => i.g > 0),
  };
}

export async function describeMeal(text, signal) {
  const s = await getSample();
  if (!s) throw { code: 'not_granted' };
  const res = await s.json(`${MEAL_RULES}\n\nMeal: ${text.slice(0, 1500)}`, { signal });
  return cleanItems(res);
}

export async function photoMeal(file, hint, signal) {
  const s = await getSample();
  if (!s) throw { code: 'not_granted' };
  const res = await s.json(`${MEAL_RULES}\n\nThe image is a photo of the meal.${hint ? ` The person adds: ${hint.slice(0, 400)}` : ''} Use plate size, utensils and packaging to judge portions.`, { images: [file], signal, cache: false });
  return cleanItems(res);
}

export async function readLabel(file, signal) {
  const s = await getSample();
  if (!s) throw { code: 'not_granted' };
  const res = await s.json(`The image is a nutrition facts label (any country). Read it exactly; do not estimate.
Reply with only JSON: {"name":"product name if visible, else empty","brand":"brand if visible, else empty","servingG":number or null,"servingLabel":"e.g. 1 cup (240 ml), or empty","per100":{"kcal":number,"protein":number,"carbs":number,"fat":number,"fiber":number}|null,"perServing":{"kcal":number,"protein":number,"carbs":number,"fat":number,"fiber":number}|null,"readable":true|false}
If the label gives kJ only, convert to kcal (divide by 4.184). Use total carbohydrate (for EU labels "carbohydrate" already excludes fibre; still report it as given). Leave a block null when the label does not show it.`, { images: [file], signal, cache: false });
  const block = (b) => (b ? { kcal: num(b.kcal), p: num(b.protein), c: num(b.carbs), f: num(b.fat), fb: num(b.fiber) } : null);
  return {
    name: String(res?.name || '').slice(0, 80), brand: String(res?.brand || '').slice(0, 60),
    servingG: num(res?.servingG) || null, servingLabel: String(res?.servingLabel || '').slice(0, 40),
    per100: block(res?.per100), perServing: block(res?.perServing), readable: res?.readable !== false,
  };
}

export async function readScan(file, signal) {
  const s = await getSample();
  if (!s) throw { code: 'not_granted' };
  const res = await s.json(`The image is a body composition report (DEXA, InBody, Tanita, Withings, a smart scale app or similar). Read the numbers exactly as printed.
Reply with only JSON: {"device":"short name of the device or report type","date":"YYYY-MM-DD or empty","weightKg":number|null,"bodyFatPct":number|null,"leanMassKg":number|null,"skeletalMuscleKg":number|null,"visceralFat":number|null,"waistCm":number|null}
Convert pounds to kg (x 0.4536) and inches to cm (x 2.54). leanMassKg is fat-free mass (weight minus fat mass) if shown or derivable. Use null for anything not shown.`, { images: [file], signal, cache: false });
  const n = (x) => (x == null || x === '' ? null : num(x) || null);
  return {
    device: String(res?.device || '').slice(0, 40), date: /^\d{4}-\d{2}-\d{2}$/.test(res?.date || '') ? res.date : '',
    weightKg: n(res?.weightKg), bf: n(res?.bodyFatPct), leanKg: n(res?.leanMassKg), smmKg: n(res?.skeletalMuscleKg),
    visceral: n(res?.visceralFat), waistCm: n(res?.waistCm),
  };
}

export async function askCoach(turns, context, { onText, signal } = {}) {
  const s = await getSample();
  if (!s) throw { code: 'not_granted' };
  const rules = `You are the person's strength and nutrition coach inside the app "Plates". Be direct, warm and specific, like a good personal trainer. Keep answers under 180 words unless asked for more. Use their numbers below. Never suggest going under their calorie floor, crash diets, or losing more than 1% of body weight a week. Spot reduction of belly fat is not possible: fat comes off the belly through an overall deficit, protein and lifting; say so when relevant. For pain, injury, medication or medical conditions, tell them to see a doctor or physio. Plain text, short paragraphs or a short list, no markdown headings.

Their data:
${context}`;
  const input = [{ role: 'user', content: rules }, ...turns.slice(-12)];
  return s(input, { onText, signal, cache: false });
}
