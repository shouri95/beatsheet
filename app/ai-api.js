// Claude through the Anthropic API, with the key you saved in settings.
// Loaded on demand, only in the installed app. The key never leaves this
// device except to go to api.anthropic.com.
import Anthropic from '@anthropic-ai/sdk';
import { jsonSchemaOutputFormat } from '@anthropic-ai/sdk/helpers/json-schema';
import { getSecrets } from './store.js';
import { MEAL_RULES, MEAL_SCHEMA, cleanItems, LABEL_SCHEMA, LABEL_PROMPT, cleanLabel, SCAN_SCHEMA, SCAN_PROMPT, cleanScan, COACH_RULES, safeUrl } from './ai.js';

export const MODELS = [
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5', hint: 'Most accurate. About 1–3¢ per meal, a few cents with an online lookup.' },
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5', hint: 'Nearly as good, about half the cost.' },
  { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5', hint: 'Cheapest and fastest; less careful with portions.' },
];
const DEFAULT_MODEL = 'claude-opus-5-5';

let client = null, clientKey = '';
function api() {
  const { anthropicKey } = getSecrets();
  if (!anthropicKey) throw { code: 'bad_key' };
  if (!client || clientKey !== anthropicKey) {
    client = new Anthropic({ apiKey: anthropicKey, dangerouslyAllowBrowser: true, maxRetries: 1 });
    clientKey = anthropicKey;
  }
  return client;
}
const model = () => getSecrets().anthropicModel || DEFAULT_MODEL;

// Server-side refusal fallback where the model supports it.
function base(extra = {}) {
  const m = model();
  const p = { model: m, ...extra };
  if (m !== 'claude-haiku-5-5') { p.betas = ['server-side-fallback-2026-07-01']; p.fallbacks = 'default'; }
  else p.betas = [];
  return p;
}
const webSearch = (country) => {
  const tool = { type: model() === 'claude-haiku-5-5' ? 'web_search_20250305' : 'web_search_20260209', name: 'web_search', max_uses: 4 };
  const tz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return null; } })();
  if (country) tool.user_location = { type: 'approximate', country, ...(tz ? { timezone: tz } : {}) };
  return tool;
};

export function deviceCountry() {
  const tags = typeof navigator !== 'undefined' ? navigator.languages || [navigator.language] : [];
  for (const t of tags) { const m = /-([A-Z]{2})$/i.exec(t || ''); if (m) return m[1].toUpperCase(); }
  return null;
}

function mapError(e) {
  if (e?.code) return e;
  if (e instanceof Anthropic.APIUserAbortError) return { code: 'cancelled' };
  if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) return { code: 'bad_key' };
  if (e instanceof Anthropic.RateLimitError) return { code: 'rate_limited' };
  if (e instanceof Anthropic.APIConnectionError) return { code: typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'upstream_error' };
  if (e instanceof Anthropic.BadRequestError) return { code: 'api_error', message: e.message };
  if (e instanceof Anthropic.APIError) return { code: 'upstream_error', message: e.message };
  return { code: 'upstream_error', message: String(e?.message || e) };
}

const imageBlock = async (blob) => ({
  type: 'image',
  source: { type: 'base64', media_type: blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg', data: await toBase64(blob) },
});
function toBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

// Runs a request that ends in a call to one strict "report" tool, with web
// search available beforehand. Resumes server-tool pauses.
async function reportWithTools({ content, toolName, toolDescription, schema, country, effort = 'medium', signal }) {
  const report = { name: toolName, description: toolDescription, strict: true, input_schema: schema };
  const messages = [{ role: 'user', content }];
  for (let round = 0; round < 4; round++) {
    const res = await api().beta.messages.create({
      ...base({ max_tokens: 16000, output_config: { effort } }),
      tools: [webSearch(country), report],
      tool_choice: { type: 'auto' },
      messages,
    }, { signal });
    if (res.stop_reason === 'refusal') throw { code: 'refused' };
    const call = res.content.find((b) => b.type === 'tool_use' && b.name === toolName);
    if (call) return call.input;
    if (res.stop_reason === 'pause_turn') { messages.push({ role: 'assistant', content: res.content }); continue; }
    // Answered in text instead of calling the tool: ask once more for the call.
    messages.push({ role: 'assistant', content: res.content });
    messages.push({ role: 'user', content: `Now call ${toolName} with the result.` });
  }
  throw { code: 'invalid_json' };
}

async function parseJson({ content, schema, effort = 'medium', signal }) {
  const res = await api().beta.messages.parse({
    ...base({ max_tokens: 16000, output_config: { effort, format: jsonSchemaOutputFormat(schema) } }),
    messages: [{ role: 'user', content }],
  }, { signal });
  if (res.stop_reason === 'refusal') throw { code: 'refused' };
  if (!res.parsed_output) throw { code: 'invalid_json' };
  return res.parsed_output;
}

const BRAND_LOOKUP = `For every branded or packaged item, use web_search to find its official nutrition information panel before reporting: the manufacturer's website or a major supermarket listing in the person's country. Copy the per-100 g values exactly into the label_ fields with the page URL and site name, and compute kcal and macros for the eaten grams from them. If the listing gives kJ only, divide by 4.184. If you cannot find the exact product, leave the label_ fields at 0 and empty, give your best estimate and set confidence "low". Generic foods need no search.
When done, call report_meal exactly once.`;

export async function describeMeal(text, { signal } = {}) {
  try {
    const out = await reportWithTools({
      content: `${MEAL_RULES}\n${BRAND_LOOKUP}\n\nMeal: ${text.slice(0, 1500)}`,
      toolName: 'report_meal', toolDescription: 'Report the itemised meal with grams and nutrition for each item.', schema: MEAL_SCHEMA,
      country: deviceCountry(), signal,
    });
    return cleanItems(out);
  } catch (e) { throw mapError(e); }
}

export async function photoMeal(img, hint, { signal } = {}) {
  try {
    const out = await reportWithTools({
      content: [await imageBlock(img), { type: 'text', text: `${MEAL_RULES}\n${BRAND_LOOKUP}\n\nThe image is a photo of the meal.${hint ? ` The person adds: ${hint.slice(0, 400)}` : ''} Use plate size, utensils and any packaging or brand names visible to judge items and portions.` }],
      toolName: 'report_meal', toolDescription: 'Report the itemised meal with grams and nutrition for each item.', schema: MEAL_SCHEMA,
      country: deviceCountry(), signal,
    });
    return cleanItems(out);
  } catch (e) { throw mapError(e); }
}

export async function readLabel(img, { signal } = {}) {
  try { return cleanLabel(await parseJson({ content: [await imageBlock(img), { type: 'text', text: LABEL_PROMPT }], schema: LABEL_SCHEMA, signal })); }
  catch (e) { throw mapError(e); }
}

export async function readScan(img, { signal } = {}) {
  try { return cleanScan(await parseJson({ content: [await imageBlock(img), { type: 'text', text: SCAN_PROMPT }], schema: SCAN_SCHEMA, signal })); }
  catch (e) { throw mapError(e); }
}

const PRODUCT_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['found', 'name', 'brand', 'per100_kcal', 'per100_protein', 'per100_carbs', 'per100_fat', 'per100_fiber', 'serving_g', 'serving_label', 'source_url', 'source_name', 'note'],
  properties: {
    found: { type: 'boolean', description: 'True only if you found the exact product\'s nutrition panel' },
    name: { type: 'string' }, brand: { type: 'string' },
    per100_kcal: { type: 'number' }, per100_protein: { type: 'number' }, per100_carbs: { type: 'number' }, per100_fat: { type: 'number' }, per100_fiber: { type: 'number' },
    serving_g: { type: 'number', description: 'Serving size in grams from the panel, 0 if not listed' }, serving_label: { type: 'string' },
    source_url: { type: 'string' }, source_name: { type: 'string' },
    note: { type: 'string', description: 'Anything the person should know, e.g. the listing differs from older packaging. Empty if nothing.' },
  },
};

export async function lookupProduct(query, { signal, country } = {}) {
  try {
    const r = await reportWithTools({
      content: `Find the official nutrition information panel for this food product${country || deviceCountry() ? ` as sold in country code ${country || deviceCountry()}` : ''}: "${query.slice(0, 200)}".
Search the manufacturer's website and major supermarket listings. Report the per-100 g (or per-100 ml) values exactly as listed, the serving size, and the page you used. If listings disagree, prefer the most recent supermarket or manufacturer listing and say so in note. Energy in kJ only: divide by 4.184 for kcal. If you cannot find this exact product, set found to false.
When done, call report_product exactly once.`,
      toolName: 'report_product', toolDescription: 'Report the product nutrition panel you found.', schema: PRODUCT_SCHEMA,
      country: country || deviceCountry(), signal,
    });
    return {
      found: !!r.found && r.per100_kcal > 0, name: String(r.name || query).slice(0, 80), brand: String(r.brand || '').slice(0, 60),
      per100: { kcal: +r.per100_kcal || 0, p: +r.per100_protein || 0, c: +r.per100_carbs || 0, f: +r.per100_fat || 0, fb: +r.per100_fiber || 0 },
      servingG: +r.serving_g > 0 ? +r.serving_g : null, servingLabel: String(r.serving_label || '').slice(0, 40),
      source: safeUrl(r.source_url) ? { url: safeUrl(r.source_url), name: String(r.source_name || '').slice(0, 80) } : null,
      note: String(r.note || '').slice(0, 240),
    };
  } catch (e) { throw mapError(e); }
}

export async function askCoach(turns, context, { onText, signal } = {}) {
  try {
    const stream = api().beta.messages.stream({
      ...base({ max_tokens: 4000, output_config: { effort: 'medium' } }),
      system: `${COACH_RULES}\n\nTheir data:\n${context}`,
      messages: turns.slice(-12),
    }, { signal });
    stream.on('text', (_delta, snapshot) => onText?.({ text: snapshot }));
    const msg = await stream.finalMessage();
    if (msg.stop_reason === 'refusal') throw { code: 'refused' };
    const text = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
    if (!text.trim()) throw { code: 'empty_completion' };
    return { text };
  } catch (e) { throw mapError(e); }
}

// A cheap call to confirm the key works.
export async function testKey() {
  try {
    await api().messages.create({ model: model(), max_tokens: 16, messages: [{ role: 'user', content: 'Reply with OK.' }] });
    return true;
  } catch (e) { throw mapError(e); }
}
