// Logging food. One box does it all: search the USDA table and your own
// foods, or (with Claude) describe the meal in words. Packaged food is exact
// when it comes from its label: scan the barcode, photograph the label, or
// let Claude find the official panel online. Anything verified once is saved
// to your foods, so it's instant and exact next time.
import { useState, useEffect, useMemo, useRef } from 'preact/hooks';
import { html, Sheet, Seg, NumInput, Icon, fmt, closeSheet, openSheet, toast, useStore, parseNum } from './kit.js';
import { loadFoods, search, recentFoods, makeEntry, findByKey, libraryFoods, recipePer100, matchOwnFood, ownByBarcode, asOwnFood } from '../foods.js';
import { updateDay, setLibrary, state } from '../store.js';
import { aiCaps, describeMeal, photoMeal, readLabel, lookupProduct, aiErrorText } from '../ai.js';
import { isWeb } from '../env.js';
import { lookupBarcode } from '../off.js';
import { dateKey, addDays, labelCheck } from '../engine.js';
import { Scanner } from './scanner.js';

export const MEALS = [['b', 'Breakfast'], ['l', 'Lunch'], ['d', 'Dinner'], ['s', 'Snacks']];
export const mealName = (m) => (MEALS.find((x) => x[0] === m) || MEALS[3])[1];
export const mealNow = () => { const h = new Date().getHours(); return h < 11 ? 'b' : h < 16 ? 'l' : h < 21 ? 'd' : 's'; };
const OZ = 28.349523125;
const uid = () => Math.random().toString(36).slice(2, 10);

function useFoods() {
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { loadFoods().then(() => setReady(true)).catch(() => setErr('The food database did not load. Check your connection and reopen this.')); }, []);
  return { ready, err };
}

export function useAI() {
  const [c, setC] = useState({ provider: null, text: false, images: false, web: false });
  useEffect(() => { aiCaps().then(setC); }, []);
  return c;
}

const per100Line = (f) => (f.kcal != null ? `${fmt(f.kcal)} kcal · ${fmt(f.p, 1)}P ${fmt(f.c, 1)}C ${fmt(f.f, 1)}F per 100 g` : 'No nutrition values');
const SRC = { usda: 'USDA', off: 'Open Food Facts', web: 'Official label, found online', label: 'Your label', recipe: 'Recipe', typ: 'Typical value' };
const Badge = ({ f }) => f.src === 'typ' ? html`<span class="pill warn">Typical</span>` : f.src === 'recipe' ? html`<span class="pill">Recipe</span>` : f.own ? html`<span class="pill">Yours</span>` : f.curated ? null : html`<span class="pill">USDA</span>`;

// Save (or update) a product in your foods; matches by key, then barcode.
export function saveOwn(food) {
  const own = { ...food }; delete own.own; delete own.hay; delete own.lastG; delete own.saveOnAdd; delete own.curated;
  setLibrary((lib) => {
    let i = lib.foods.findIndex((x) => x.key === own.key);
    if (i < 0 && own.code) i = lib.foods.findIndex((x) => x.code === own.code);
    if (i >= 0) lib.foods[i] = { ...lib.foods[i], ...own, key: lib.foods[i].key };
    else lib.foods.unshift(own);
  });
  return own;
}

const SourceLine = ({ food }) => {
  if (!food) return null;
  const src = food.source;
  return html`<span class="small faint">${SRC[food.src] || food.group || ''}${food.brand ? ` · ${food.brand}` : ''}${src?.url ? html` · <a href=${src.url} target="_blank" rel="noopener noreferrer">${src.name || 'source'}</a>` : food.url ? html` · <a href=${food.url} target="_blank" rel="noopener noreferrer">product page</a>` : ''}</span>`;
};

/* ───────────── the log sheet ───────────── */

export function LogSheet({ date = dateKey(), meal: meal0, start, text: text0 }) {
  const s = useStore();
  const ai = useAI();
  const [meal, setMeal] = useState(meal0 || mealNow());
  const [mode, setMode] = useState(start === 'quick' ? 'quick' : 'home'); // home | ai | quick
  const [scan, setScan] = useState(start === 'scan');
  const [q, setQ] = useState(text0 || '');
  const [photo, setPhoto] = useState(null);
  const [picked, setPicked] = useState(null);

  if (picked) return html`<${FoodEditor} food=${picked} date=${date} meal=${meal} onBack=${() => setPicked(null)} onMeal=${setMeal} />`;
  const onCode = (code) => { setScan(false); openSheet('barcode', { code, date, meal }); };
  const title = mode === 'ai' ? (photo ? 'Meal photo' : 'Claude estimate') : mode === 'quick' ? 'Quick add' : `Add to ${mealName(meal)}`;
  return html`<${Sheet} title=${title} full
    left=${mode !== 'home' && html`<button class="icon-btn solid" onClick=${() => { setMode('home'); setPhoto(null); }} aria-label="Back"><${Icon} n="back" /></button>`}>
    <${Seg} value=${meal} options=${MEALS} onChange=${setMeal} label="Meal" />
    ${mode === 'home' && html`<${Home} q=${q} setQ=${setQ} lib=${s.library} days=${s.days} date=${date} meal=${meal} ai=${ai}
      onPick=${setPicked} onAi=${() => setMode('ai')} onQuick=${() => setMode('quick')} onScan=${() => setScan(true)}
      onPhoto=${(f) => { setPhoto(f); setMode('ai'); }} />`}
    ${mode === 'ai' && html`<${AiView} key=${photo ? 'p' : 't'} text0=${photo ? '' : q} photo=${photo} date=${date} meal=${meal} ai=${ai} />`}
    ${mode === 'quick' && html`<${QuickTab} date=${date} meal=${meal} />`}
    ${scan && html`<${Scanner} onCode=${onCode} onClose=${() => setScan(false)} />`}
  <//>`;
}

function Home({ q, setQ, lib, days, date, meal, ai, onPick, onAi, onQuick, onScan, onPhoto }) {
  const { ready, err } = useFoods();
  const recents = useMemo(() => recentFoods(days, date), [days, date]);
  const results = useMemo(() => (ready && q.trim().length > 1 ? search(q, lib, recents.map((r) => r.fid)) : []), [q, ready, lib, recents]);
  const ref = useRef();
  useEffect(() => { setTimeout(() => ref.current?.focus(), 80); }, []);
  const own = libraryFoods(lib);
  const yesterday = (days[addDays(date, -1)]?.foods || []).filter((e) => (e.meal || 's') === meal);
  const words = q.trim().split(/\s+/).filter(Boolean).length;

  const addCopies = (entries, label) => {
    const ids = [];
    updateDay(date, (d) => { d.foods ||= []; for (const e of entries) { const id = uid(); ids.push(id); d.foods.push({ ...e, id, meal, t: Date.now() }); } });
    toast(label, { label: 'Undo', fn: () => updateDay(date, (d) => { d.foods = (d.foods || []).filter((x) => !ids.includes(x.id)); }) });
    closeSheet();
  };

  return html`
    <div class="search"><${Icon} n="search" /><input ref=${ref} id="food-q" class="input" placeholder=${ai.text ? 'What are you eating?' : 'Search 6,400 foods'} value=${q}
      onInput=${(e) => setQ(e.target.value)} onKeyDown=${(e) => { if (e.key === 'Enter' && ai.text && words >= 2) onAi(); }} autocomplete="off" enterkeyhint=${ai.text ? 'go' : 'search'} /></div>
    <div class="actions">
      ${isWeb && html`<button class="action" onClick=${onScan}><${Icon} n="barcode" /><span>Barcode</span></button>`}
      ${ai.images && html`<label class="action"><${Icon} n="camera" /><span>Meal photo</span><input type="file" accept="image/*" hidden onChange=${(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onPhoto(f); }} /></label>`}
      <button class="action" onClick=${() => openSheet('customFood', { date, meal })}><${Icon} n="label" /><span>Label</span></button>
      <button class="action" onClick=${onQuick}><${Icon} n="bolt" /><span>Quick add</span></button>
    </div>
    ${err && html`<span class="err">${err}</span>`}
    ${q.trim().length > 1 ? html`
      ${ai.text && words >= 2 && html`<button class="card ink" style="text-align:left;cursor:pointer;flex-direction:row;align-items:center" onClick=${onAi}>
        <${Icon} n="spark" /><div class="grow"><b>Estimate this meal with Claude</b><div class="small" style="opacity:.75">${ai.web ? 'Branded products are checked against their official labels online' : 'Branded products are flagged for you to verify'}</div></div><${Icon} n="next" /></button>`}
      <div class="card flush"><div class="list">
        ${!ready && html`<div class="item"><span class="faint">Loading the food database…</span></div>`}
        ${ready && !results.length && html`<div class="item"><span class="faint">No match in the database${ai.web ? '.' : '. Try fewer words, scan the barcode or add it from its label.'}</span></div>`}
        ${results.slice(0, 30).map((f) => html`<button class="item" onClick=${() => onPick(f)}>
          <div class="grow"><div class="t">${f.name}</div><div class="s">${f.brand ? `${f.brand} · ` : ''}${per100Line(f)}</div></div><${Badge} f=${f} /></button>`)}
      </div></div>
      ${ai.web && html`<button class="btn soft block wrap" onClick=${() => openSheet('lookup', { query: q, date, meal })}><${Icon} n="search" cls="sm" /><span>Find the official label online<span class="small faint ellipsis" style="display:block;max-width:260px">“${q.trim()}”</span></span></button>`}`
    : html`
      ${yesterday.length > 0 && html`<button class="card" style="text-align:left;cursor:pointer;flex-direction:row;align-items:center" onClick=${() => addCopies(yesterday, `Added yesterday's ${mealName(meal).toLowerCase()}`)}>
        <${Icon} n="copy" /><div class="grow"><b>Same as yesterday's ${mealName(meal).toLowerCase()}</b><div class="small faint ellipsis">${yesterday.map((e) => e.name).join(', ')}</div></div>
        <span class="num">${fmt(yesterday.reduce((a, e) => a + (e.k || 0), 0))}</span></button>`}
      ${recents.length > 0 && html`<div class="col tight"><div class="eyebrow">Recent · tap + to add the same amount</div>
        <div class="card flush"><div class="list">${recents.map((e) => html`
          <div class="item">
            <button class="grow" style="all:unset;cursor:pointer;min-width:0" onClick=${() => { const f = findByKey(e.fid, lib); if (f) onPick({ ...f, lastG: e.g }); else addCopies([e], `Added ${e.name}`); }}>
              <div class="t ellipsis">${e.name}</div><div class="s">${e.g ? `${fmt(e.g)} g · ` : ''}${fmt(e.k)} kcal</div></button>
            <button class="icon-btn solid" aria-label=${`Add ${e.name} again`} onClick=${() => addCopies([e], `Added ${e.name}`)}><${Icon} n="plus" /></button>
          </div>`)}</div></div></div>`}
      ${own.length > 0 && html`<div class="col tight"><div class="eyebrow">Your foods & recipes</div>
        <div class="card flush"><div class="list">${own.slice(0, 20).map((f) => html`<button class="item" onClick=${() => onPick(f)}>
          <div class="grow"><div class="t">${f.name}</div><div class="s">${f.brand ? `${f.brand} · ` : ''}${per100Line(f)}</div></div><${Badge} f=${f} /></button>`)}</div></div></div>`}
      <button class="btn ghost sm" style="align-self:flex-start" onClick=${() => openSheet('recipe', {})}><${Icon} n="book" cls="sm" />New recipe</button>
      <p class="hint">Exact numbers come from a kitchen scale and the label. Weigh in grams and pick "cooked" or "uncooked" to match (rice and pasta differ about 3×). Packaged food: scan the barcode or photograph the label once and it's saved for good.</p>
    `}`;
}

/* ───────────── amount editor ───────────── */

export function FoodEditor({ food, date, meal, onBack, onMeal, entry }) {
  const portions = food.portions || [];
  const initialG = entry?.g || food.lastG || portions[0]?.[1] || 100;
  const [g, setG] = useState(initialG);
  const [unit, setUnit] = useState('g');
  const [m, setM] = useState(entry?.meal || meal);
  const valid = g > 0 && g < 5000 && food.kcal != null;
  const shouldSave = !food.own && (food.saveOnAdd || food.src === 'off' || food.src === 'web');
  const add = () => {
    let f = food;
    if (shouldSave) f = saveOwn(food);
    const e = makeEntry(f, g, m);
    if (entry) {
      updateDay(date, (d) => { const i = (d.foods || []).findIndex((x) => x.id === entry.id); if (i >= 0) d.foods[i] = { ...e, id: entry.id, t: entry.t }; });
      toast('Updated');
    } else {
      updateDay(date, (d) => { (d.foods ||= []).push(e); });
      toast(`Added ${f.name} · ${fmt(e.k)} kcal`, { label: 'Undo', fn: () => updateDay(date, (d) => { d.foods = (d.foods || []).filter((x) => x.id !== e.id); }) });
    }
    closeSheet();
  };
  const e = makeEntry(food, valid ? g : 0, m);
  const shown = unit === 'oz' ? +(g / OZ).toFixed(2) : +(+g).toFixed(1);
  return html`<${Sheet} title=${entry ? 'Edit entry' : 'How much?'} full
    left=${onBack && html`<button class="icon-btn solid" onClick=${onBack} aria-label="Back"><${Icon} n="back" /></button>`}
    foot=${html`<button class="btn block" disabled=${!valid} onClick=${add}>${entry ? 'Save' : `Add to ${mealName(m)}`}</button>`}>
    <div class="row top">
      ${food.image && html`<img src=${food.image} alt="" style="width:56px;height:56px;object-fit:contain;border-radius:10px;background:#fff;flex:none" />`}
      <div class="col tight grow"><h2 class="h3">${food.name}</h2><${SourceLine} food=${food} /></div>
    </div>
    ${food.src === 'off' && html`<span class="hint">From Open Food Facts, a crowd-sourced database. Glance at your pack: if the numbers differ, tap Edit on the saved food later.</span>`}
    <div class="row">
      <div class="grow"><${NumInput} id="amt" big value=${shown} unit=${unit} autofocus onValue=${(v) => setG(v == null ? 0 : unit === 'oz' ? v * OZ : v)} /></div>
      <div style="width:112px"><${Seg} value=${unit} options=${[['g', 'g'], ['oz', 'oz']]} onChange=${setUnit} label="Unit" /></div>
    </div>
    ${portions.length > 0 && html`<div class="chips">${portions.map(([l, pg]) => html`<button class="chip" onClick=${() => setG(pg)}>${l} · ${fmt(pg)} g</button>`)}
      ${portions[0] && html`<button class="chip" onClick=${() => setG(portions[0][1] * 2)}>2 × ${portions[0][0].replace(/^1 /, '')}</button>`}</div>`}
    <${Totals} e=${e} food=${food} />
    ${!entry && html`<${Seg} value=${m} options=${MEALS} onChange=${(v) => { setM(v); onMeal?.(v); }} label="Meal" />`}
    ${food.own && !entry && html`<button class="btn xs ghost" style="align-self:flex-start" onClick=${() => openSheet('customFood', { date, meal: m, food })}><${Icon} n="edit" cls="sm" />Edit this food</button>`}
  <//>`;
}

const Dot = ({ c }) => html`<i style=${`display:inline-block;width:8px;height:8px;border-radius:9px;background:${c};margin-right:5px`}></i>`;
function Totals({ e, food }) {
  return html`<div class="card">
    <div class="row between"><span class="display" style="font-size:44px">${fmt(e.k)}</span><span class="faint">kcal</span></div>
    <div class="grid3">
      <div class="stat"><span class="v">${fmt(e.p, 1)}<small>g</small></span><span class="l"><${Dot} c="var(--pro)" />Protein</span></div>
      <div class="stat"><span class="v">${fmt(e.c, 1)}<small>g</small></span><span class="l"><${Dot} c="var(--carb)" />Carbs</span></div>
      <div class="stat"><span class="v">${fmt(e.f, 1)}<small>g</small></span><span class="l"><${Dot} c="var(--fat)" />Fat</span></div>
    </div>
    ${food && html`<span class="tiny faint">${fmt(e.fb, 1)} g fiber · ${per100Line(food)}</span>`}
  </div>`;
}

/* ───────────── edit a logged entry ───────────── */

export function EntrySheet({ date, entry }) {
  const s = useStore();
  const [g, setG] = useState(entry.g);
  const [m, setM] = useState(entry.meal);
  const [, force] = useState(0);
  useEffect(() => { loadFoods().then(() => force(1)).catch(() => {}); }, []);
  const f2 = findByKey(entry.fid, s.library);
  if (f2 && entry.src !== 'ai' && entry.src !== 'quick') return html`<${FoodEditor} food=${f2} date=${date} meal=${entry.meal} entry=${entry} />`;
  const k = entry.g > 0 ? g / entry.g : 1;
  const save = () => {
    updateDay(date, (d) => { const i = (d.foods || []).findIndex((x) => x.id === entry.id); if (i >= 0) d.foods[i] = { ...entry, g, meal: m, k: Math.round(entry.k * k), p: +(entry.p * k).toFixed(1), c: +(entry.c * k).toFixed(1), f: +(entry.f * k).toFixed(1), fb: +((entry.fb || 0) * k).toFixed(1) }; });
    closeSheet();
  };
  return html`<${Sheet} title="Edit entry" foot=${html`<button class="btn ghost" onClick=${() => { updateDay(date, (d) => { d.foods = d.foods.filter((x) => x.id !== entry.id); }); closeSheet(); }}><${Icon} n="trash" />Delete</button><button class="btn grow" onClick=${save}>Save</button>`}>
    <h2 class="h3">${entry.name}</h2>
    <span class="small faint">${entry.est ? 'Estimate' : 'Logged'} · all values scale with the amount</span>
    ${entry.g > 0 && html`<${NumInput} id="eg" big value=${g} unit="g" onValue=${(v) => setG(v || 0)} />`}
    <div class="card"><div class="row between"><span class="display" style="font-size:40px">${fmt(entry.k * k)}</span><span class="faint">kcal · ${fmt(entry.p * k, 1)}P ${fmt(entry.c * k, 1)}C ${fmt(entry.f * k, 1)}F</span></div></div>
    ${entry.est && entry.brand && html`<button class="btn soft sm" style="align-self:flex-start" onClick=${() => openSheet('lookup', { query: `${entry.brand} ${entry.product || entry.name}`, date, meal: entry.meal, replace: entry })}><${Icon} n="search" cls="sm" />Verify with the official label</button>`}
    <${Seg} value=${m} options=${MEALS} onChange=${setM} label="Meal" />
  <//>`;
}

/* ───────────── quick add ───────────── */

function QuickTab({ date, meal }) {
  const [f, setF] = useState({ name: '', k: null, p: null, c: null, f: null });
  const set = (p) => setF((x) => ({ ...x, ...p }));
  const fromMacros = (f.p || 0) * 4 + (f.c || 0) * 4 + (f.f || 0) * 9;
  const kcal = f.k ?? (fromMacros || null);
  const add = () => {
    const e = { id: uid(), name: f.name.trim() || 'Quick add', g: 0, k: Math.round(kcal), p: f.p || 0, c: f.c || 0, f: f.f || 0, fb: 0, meal, src: 'quick', est: true, t: Date.now() };
    updateDay(date, (d) => { (d.foods ||= []).push(e); });
    toast(`Added ${fmt(e.k)} kcal`); closeSheet();
  };
  return html`<div class="col">
    <div class="field"><label for="qa-n">What was it?</label><input id="qa-n" class="input" value=${f.name} onInput=${(e) => set({ name: e.target.value })} placeholder="Coffee with colleagues" /></div>
    <div class="grid2">
      <div class="field"><label for="qa-k">Calories</label><${NumInput} id="qa-k" value=${f.k} unit="kcal" placeholder=${fromMacros ? String(Math.round(fromMacros)) : ''} onValue=${(v) => set({ k: v })} /></div>
      <div class="field"><label for="qa-p">Protein</label><${NumInput} id="qa-p" value=${f.p} unit="g" onValue=${(v) => set({ p: v })} /></div>
      <div class="field"><label for="qa-c">Carbs</label><${NumInput} id="qa-c" value=${f.c} unit="g" onValue=${(v) => set({ c: v })} /></div>
      <div class="field"><label for="qa-f">Fat</label><${NumInput} id="qa-f" value=${f.f} unit="g" onValue=${(v) => set({ f: v })} /></div>
    </div>
    <span class="hint">Counts as an estimate. For anything you'll eat again, save it from its label instead.</span>
    <button class="btn block" disabled=${!(kcal > 0)} onClick=${add}>Add ${kcal > 0 ? `${fmt(kcal)} kcal` : ''}</button>
  </div>`;
}

/* ───────────── Claude estimates, with brand verification ───────────── */

// Decide how far each estimated item can be trusted.
export function resolveItem(i, lib) {
  if (i.branded) {
    const own = matchOwnFood(i, lib);
    if (own) return { ...i, status: 'own', per100: { kcal: own.kcal, p: own.p, c: own.c, f: own.f, fb: own.fb }, food: own, source: own.source };
    if (i.per100) return { ...i, status: labelCheck(i.per100).ok ? 'label' : 'label_bad' };
    return { ...i, status: 'unverified' };
  }
  return { ...i, status: 'generic' };
}
export function itemValues(i) {
  if (i.per100 && i.status !== 'label_bad') {
    const s = i.g / 100;
    return { k: i.per100.kcal * s, p: i.per100.p * s, c: i.per100.c * s, f: i.per100.f * s, fb: (i.per100.fb || 0) * s };
  }
  const s = i.g0 > 0 ? i.g / i.g0 : 1;
  return { k: i.k * s, p: i.p * s, c: i.c * s, f: i.f * s, fb: i.fb * s };
}
const STATUS = {
  own: ['good', 'Your saved label'], label: ['good', 'Official label'], label_bad: ['warn', "Label numbers don't add up"],
  unverified: ['warn', 'Brand estimate, not verified'], generic: ['', ''],
};

function AiView({ text0, photo, date, meal, ai }) {
  const s = useStore();
  const [text, setText] = useState(text0 || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [items, setItems] = useState(null);
  const [note, setNote] = useState('');
  const [working, setWorking] = useState({}); // item id → message
  const [scanFor, setScanFor] = useState(null);
  const preview = useMemo(() => (photo ? URL.createObjectURL(photo) : ''), [photo]);
  const ctl = useRef(null);
  useEffect(() => () => { ctl.current?.abort(); if (preview) URL.revokeObjectURL(preview); }, []);
  useEffect(() => { if (photo || (text0 || '').trim().length > 2) run(); }, []);

  const run = async () => {
    ctl.current?.abort(); ctl.current = new AbortController();
    setBusy(true); setErr(''); setItems(null);
    try {
      const r = photo ? await photoMeal(photo, text, ctl.current.signal) : await describeMeal(text, ctl.current.signal);
      if (!r.items.length) setErr('No foods found in that. Try naming each item.');
      setItems(r.items.map((i) => resolveItem({ ...i, g0: i.g, id: uid() }, state.library)));
      setNote(r.note);
    } catch (x) { setErr(aiErrorText(x)); }
    setBusy(false);
  };
  const patch = (id, fn) => setItems((list) => list.map((x) => (x.id === id ? fn(x) : x)));
  const fromLabel = (id, per100, src, extra = {}) => patch(id, (x) => ({ ...x, per100, status: labelCheck(per100).ok ? 'label' : 'label_bad', labelSrc: src, ...extra }));

  const lookup = async (it) => {
    setWorking((w) => ({ ...w, [it.id]: 'Finding the official label…' }));
    try {
      const r = await lookupProduct(`${it.brand} ${it.product || it.name}`.trim());
      if (r.found) fromLabel(it.id, r.per100, 'web', { source: r.source, servingG: r.servingG, servingLabel: r.servingLabel, lookupNote: r.note, name: r.name || it.name, brand: r.brand || it.brand });
      else setWorking((w) => ({ ...w, [it.id]: "Couldn't find this exact product online. Scan the barcode or photograph the label." }));
      if (r.found) setWorking((w) => { const n = { ...w }; delete n[it.id]; return n; });
    } catch (x) { setWorking((w) => ({ ...w, [it.id]: aiErrorText(x) })); }
  };
  const labelPhoto = async (it, file) => {
    setWorking((w) => ({ ...w, [it.id]: 'Reading the label…' }));
    try {
      const r = await readLabel(file);
      const per100 = r.per100 || (r.perServing && r.servingG ? Object.fromEntries(Object.entries(r.perServing).map(([k, v]) => [k, (v * 100) / r.servingG])) : null);
      if (!per100) throw { code: 'label_unreadable' };
      fromLabel(it.id, per100, 'label', { servingG: r.servingG, servingLabel: r.servingLabel, name: r.name || it.name, brand: r.brand || it.brand });
      setWorking((w) => { const n = { ...w }; delete n[it.id]; return n; });
    } catch (x) { setWorking((w) => ({ ...w, [it.id]: x?.code === 'label_unreadable' ? 'Could not read per-100 g values. Try a sharper photo of the table.' : aiErrorText(x) })); }
  };
  const barcode = async (it, code) => {
    setScanFor(null);
    setWorking((w) => ({ ...w, [it.id]: 'Looking up the barcode…' }));
    try {
      const own = ownByBarcode(code, state.library);
      const p = own ? { ...own, complete: true, check: { ok: true } } : await lookupBarcode(code);
      if (!p || !p.complete) { setWorking((w) => ({ ...w, [it.id]: 'Not in the barcode database yet. Photograph the label instead.' })); return; }
      fromLabel(it.id, { kcal: p.kcal, p: p.p, c: p.c, f: p.f, fb: p.fb }, own ? 'label' : 'off', { code, name: p.name, brand: p.brand || it.brand, servingG: p.portions?.[0]?.[1], source: p.url ? { url: p.url, name: 'Open Food Facts' } : p.source });
      setWorking((w) => { const n = { ...w }; delete n[it.id]; return n; });
    } catch (x) { setWorking((w) => ({ ...w, [it.id]: String(x?.message || 'Lookup failed.') })); }
  };

  const tot = (items || []).reduce((a, i) => { const v = itemValues(i); a.k += v.k; a.p += v.p; a.c += v.c; a.f += v.f; return a; }, { k: 0, p: 0, c: 0, f: 0 });
  const unverified = (items || []).filter((i) => i.status === 'unverified' || i.status === 'label_bad').length;

  const addAll = () => {
    const saved = [];
    const entries = items.map((i) => {
      const v = itemValues(i);
      let fid;
      if ((i.status === 'label') && i.per100) {
        const food = saveOwn(asOwnFood({ name: i.product || i.name, brand: i.brand, code: i.code || '', src: i.labelSrc || 'web', per100: i.per100,
          portions: i.servingG ? [[i.servingLabel ? `1 serving (${i.servingLabel})` : '1 serving', i.servingG]] : [], source: i.source || null }));
        fid = food.key; saved.push(food.name);
      } else if (i.status === 'own') fid = i.food.key;
      const exact = i.status === 'own' || i.status === 'label';
      return { id: uid(), fid, name: i.status === 'own' ? i.food.name : i.name, brand: i.brand || undefined, product: i.product || undefined, g: Math.round(i.g),
        k: Math.round(v.k), p: +v.p.toFixed(1), c: +v.c.toFixed(1), f: +v.f.toFixed(1), fb: +v.fb.toFixed(1), meal, src: exact ? 'label' : 'ai', est: !exact, t: Date.now() };
    });
    updateDay(date, (d) => { (d.foods ||= []).push(...entries); });
    toast(`Added ${entries.length} items · ${fmt(tot.k)} kcal${saved.length ? ` · saved ${saved.length} label${saved.length > 1 ? 's' : ''}` : ''}`);
    closeSheet();
  };

  return html`<div class="col">
    ${photo && html`<img src=${preview} alt="Your meal" style="border-radius:14px;max-height:220px;object-fit:cover;width:100%" />`}
    <div class="field"><label for="ai-t">${photo ? 'Anything the photo can’t show? (optional)' : 'What did you eat?'}</label>
      <textarea id="ai-t" class="input" style="min-height:72px" value=${text} onInput=${(e) => setText(e.target.value)} placeholder=${photo ? 'Cooked in about a tablespoon of olive oil' : "40 g Carman's low carb peanut butter granola, 200 ml lactose-free milk, half a banana"}></textarea></div>
    ${!busy && html`<button class="btn ${items ? 'ghost' : ''} block" disabled=${!photo && text.trim().length < 3} onClick=${run}>${items ? 'Estimate again' : 'Estimate'}</button>`}
    ${busy && html`<div class="card" aria-live="polite"><b>${ai.web ? 'Estimating, and checking any brands against their labels…' : 'Estimating…'}</b><span class="small faint">${ai.web ? 'Online label checks take 10–40 seconds.' : 'This takes a few seconds.'}</span>
      <button class="btn ghost sm" style="align-self:flex-start" onClick=${() => { ctl.current?.abort(); setBusy(false); }}>Stop</button></div>`}
    ${err && html`<span class="err">${err}</span>`}
    ${items && items.length > 0 && html`
      <div class="card flush"><div class="list">${items.map((i) => {
        const v = itemValues(i); const [tone, label] = STATUS[i.status];
        return html`<div class="item" style="flex-direction:column;align-items:stretch;gap:8px">
          <div class="row">
            <div class="grow"><div class="t">${i.status === 'own' ? i.food.name : i.name}</div>
              <div class="s">${fmt(v.k)} kcal · ${fmt(v.p, 1)}P ${fmt(v.c, 1)}C ${fmt(v.f, 1)}F${i.status === 'generic' && i.conf === 'low' ? ' · rough guess' : ''}</div></div>
            <div style="width:92px;flex:none"><${NumInput} id=${`ai-g-${i.id}`} small value=${Math.round(i.g)} unit="g" onValue=${(g) => patch(i.id, (x) => ({ ...x, g: g || 0 }))} /></div>
            <button class="icon-btn" aria-label=${`Remove ${i.name}`} onClick=${() => setItems((l) => l.filter((x) => x.id !== i.id))}><${Icon} n="x" cls="sm" /></button>
          </div>
          ${label && html`<div class="row wrap" style="gap:6px"><span class=${`pill ${tone}`}>${label}</span>
            ${i.source?.url && html`<a class="small" href=${i.source.url} target="_blank" rel="noopener noreferrer">${i.source.name || 'source'}</a>`}
            ${i.servingG && html`<button class="chip" style="height:26px;font-size:12.5px" onClick=${() => patch(i.id, (x) => ({ ...x, g: i.servingG }))}>1 serving · ${fmt(i.servingG)} g</button>`}</div>`}
          ${i.lookupNote && html`<span class="tiny faint">${i.lookupNote}</span>`}
          ${(i.status === 'unverified' || i.status === 'label_bad') && html`<div class="row wrap" style="gap:6px">
            ${ai.web && html`<button class="btn xs soft" onClick=${() => lookup(i)}><${Icon} n="search" cls="sm" />Find label online</button>`}
            ${isWeb && html`<button class="btn xs soft" onClick=${() => setScanFor(i)}><${Icon} n="barcode" cls="sm" />Scan barcode</button>`}
            ${ai.images && html`<label class="btn xs soft"><${Icon} n="camera" cls="sm" />Photo of label<input type="file" accept="image/*" hidden onChange=${(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) labelPhoto(i, f); }} /></label>`}
          </div>`}
          ${working[i.id] && html`<span class="small muted" aria-live="polite">${working[i.id]}</span>`}
        </div>`;
      })}</div></div>
      <div class="row between"><b>Total</b><span class="num"><b>${fmt(tot.k)} kcal</b> · ${fmt(tot.p)}P ${fmt(tot.c)}C ${fmt(tot.f)}F</span></div>
      ${note && html`<span class="hint">${note}</span>`}
      ${unverified > 0 && html`<span class="small" style="color:var(--warn)">${unverified} branded item${unverified > 1 ? 's are' : ' is'} still an estimate. Verify ${unverified > 1 ? 'them' : 'it'} once and it's exact from then on.</span>`}
      <span class="hint">Change any weight you know better; the numbers follow. Official labels are saved to your foods.</span>
      <button class="btn block" onClick=${addAll}>Add all to ${mealName(meal)}</button>`}
    ${scanFor && html`<${Scanner} onCode=${(c) => barcode(scanFor, c)} onClose=${() => setScanFor(null)} />`}
  </div>`;
}

/* ───────────── barcode result ───────────── */

export function BarcodeSheet({ code, date, meal }) {
  const s = useStore();
  const ai = useAI();
  const own = ownByBarcode(code, s.library);
  const [state1, setState1] = useState(own ? { kind: 'own' } : { kind: 'loading' });
  useEffect(() => {
    if (own) return;
    let alive = true;
    lookupBarcode(code).then((p) => {
      if (!alive) return;
      if (!p) setState1({ kind: 'missing' });
      else if (p.complete && p.check.ok) setState1({ kind: 'found', p });
      else setState1({ kind: 'suspect', p });
    }).catch((e) => alive && setState1({ kind: 'error', msg: String(e?.message || e) }));
    return () => { alive = false; };
  }, [code]);
  if (state1.kind === 'own') return html`<${FoodEditor} food=${{ ...own, own: true }} date=${date} meal=${meal} />`;
  if (state1.kind === 'found') return html`<${FoodEditor} food=${{ ...state1.p, saveOnAdd: true }} date=${date} meal=${meal} />`;
  const p = state1.p;
  return html`<${Sheet} title=${`Barcode ${code}`}>
    ${state1.kind === 'loading' && html`<span class="muted">Looking it up…</span>`}
    ${state1.kind === 'error' && html`<span class="err">${state1.msg}</span>`}
    ${state1.kind === 'missing' && html`<b>Not in the barcode database yet</b><span class="small muted">Save it from the label once; the next scan finds it instantly.</span>`}
    ${state1.kind === 'suspect' && html`<b>${p.name}${p.brand ? ` · ${p.brand}` : ''}</b>
      <span class="small" style="color:var(--warn)">${p.complete ? `The listed numbers don't add up (${fmt(p.kcal)} kcal listed, the macros suggest about ${fmt(p.check.fromMacros)}). Check them against your pack.` : 'This listing is missing nutrition values.'}</span>`}
    <div class="col">
      <button class="btn block" onClick=${() => openSheet('customFood', { date, meal, code, prefill: p ? { name: p.name, brand: p.brand, basis: '100', k: p.kcal, p: p.p, c: p.c, f: p.f, fb: p.fb, servingG: p.portions?.[0]?.[1] || null } : null })}>
        <${Icon} n="label" cls="sm" />${p ? 'Check and save from the label' : 'Save from the label'}</button>
      ${ai.web && html`<button class="btn soft block" onClick=${() => openSheet('lookup', { query: p ? `${p.brand} ${p.name}` : '', code, date, meal })}><${Icon} n="search" cls="sm" />Find the official label online</button>`}
    </div>
  <//>`;
}

/* ───────────── official label, found online ───────────── */

export function LookupSheet({ query, code, date, meal, replace }) {
  const [q, setQ] = useState(query || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [r, setR] = useState(null);
  const ctl = useRef(null);
  useEffect(() => { if ((query || '').trim().length > 2) run(); return () => ctl.current?.abort(); }, []);
  const run = async () => {
    ctl.current?.abort(); ctl.current = new AbortController();
    setBusy(true); setErr(''); setR(null);
    try {
      const res = await lookupProduct(q, { signal: ctl.current.signal });
      if (!res.found) setErr("Couldn't find that exact product's label online. Try the full name as it appears on the pack, or scan the barcode.");
      setR(res);
    } catch (x) { setErr(aiErrorText(x)); }
    setBusy(false);
  };
  const chk = r?.found ? labelCheck(r.per100) : null;
  const food = r?.found ? asOwnFood({ name: r.name, brand: r.brand, code: code || '', src: 'web', per100: r.per100, source: r.source,
    portions: r.servingG ? [[r.servingLabel ? `1 serving (${r.servingLabel})` : '1 serving', r.servingG]] : [] }) : null;
  const use = () => {
    const saved = saveOwn(food);
    if (replace) {
      updateDay(date, (d) => { const i = (d.foods || []).findIndex((x) => x.id === replace.id); if (i >= 0) d.foods[i] = { ...makeEntry(saved, replace.g || saved.portions?.[0]?.[1] || 100, replace.meal), id: replace.id, t: replace.t }; });
      toast('Entry updated from the official label'); closeSheet();
    } else openSheet('editor', { food: { ...saved, own: true }, date, meal });
  };
  return html`<${Sheet} title="Find the official label" full foot=${food && html`<button class="btn block" onClick=${use}>${replace ? 'Use these values' : 'Save and log'}</button>`}>
    <form class="row" onSubmit=${(e) => { e.preventDefault(); if (q.trim().length > 2) run(); }}>
      <input id="lk-q" class="input grow" value=${q} onInput=${(e) => setQ(e.target.value)} placeholder="Brand and product, e.g. Carman's low carb granola peanut butter" />
      <button class="btn" disabled=${busy || q.trim().length < 3}>Find</button>
    </form>
    ${busy && html`<div class="card"><b>Searching the manufacturer and supermarket listings…</b><span class="small faint">Usually 10–40 seconds.</span></div>`}
    ${err && html`<span class="err">${err}</span>`}
    ${food && html`
      <div class="col tight"><h2 class="h3">${food.name}</h2><span class="small faint">${food.brand}${r.source?.url ? html` · <a href=${r.source.url} target="_blank" rel="noopener noreferrer">${r.source.name || 'source'}</a>` : ''}</span></div>
      <dl class="kv card">
        <dt>Energy</dt><dd>${fmt(food.kcal)} kcal / 100 g</dd><dt>Protein</dt><dd>${fmt(food.p, 1)} g</dd><dt>Carbohydrate</dt><dd>${fmt(food.c, 1)} g</dd>
        <dt>Fat</dt><dd>${fmt(food.f, 1)} g</dd><dt>Fibre</dt><dd>${fmt(food.fb, 1)} g</dd>${r.servingG && html`<dt>Serving</dt><dd>${fmt(r.servingG)} g</dd>`}
      </dl>
      ${chk && !chk.ok && html`<span class="small" style="color:var(--warn)">These numbers don't add up (macros suggest about ${fmt(chk.fromMacros)} kcal per 100 g). Compare with your pack before saving.</span>`}
      ${r.note && html`<span class="hint">${r.note}</span>`}
      <span class="hint">Found online by Claude. Open the source to double-check, especially if your pack looks different.</span>`}
  <//>`;
}

/* ───────────── a food from its label ───────────── */

export function CustomFoodSheet({ date, meal, food: existing, code, prefill }) {
  const ai = useAI();
  const [f, setF] = useState(() => existing
    ? { name: existing.name, brand: existing.brand || '', basis: '100', servingG: existing.portions?.[0]?.[1] || null, servingLabel: existing.portions?.[0]?.[0]?.replace(/^1 serving \(?|\)$/g, '') || '', k: existing.kcal, p: existing.p, c: existing.c, f: existing.f, fb: existing.fb }
    : { name: '', brand: '', basis: 'serving', servingG: null, servingLabel: '', k: null, p: null, c: null, f: null, fb: null, ...(prefill || {}) });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (p) => setF((x) => ({ ...x, ...p }));

  const onFile = async (e) => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    setBusy(true); setErr('');
    try {
      const r = await readLabel(file);
      if (!r.readable || (!r.per100 && !r.perServing)) setErr('Could not read the numbers. Try a sharper, straight-on photo of the nutrition table.');
      else if (r.per100) set({ name: f.name || r.name, brand: f.brand || r.brand, basis: '100', servingG: r.servingG || f.servingG, servingLabel: r.servingLabel, k: r.per100.kcal, p: r.per100.p, c: r.per100.c, f: r.per100.f, fb: r.per100.fb });
      else set({ name: f.name || r.name, brand: f.brand || r.brand, basis: 'serving', servingG: r.servingG, servingLabel: r.servingLabel, k: r.perServing.kcal, p: r.perServing.p, c: r.perServing.c, f: r.perServing.f, fb: r.perServing.fb });
    } catch (x) { setErr(aiErrorText(x)); }
    setBusy(false);
  };

  const factor = f.basis === '100' ? 1 : f.servingG > 0 ? 100 / f.servingG : 0;
  const valid = f.name.trim() && f.k != null && factor > 0;
  const per100 = { kcal: (f.k || 0) * factor, p: (f.p || 0) * factor, c: (f.c || 0) * factor, f: (f.f || 0) * factor, fb: (f.fb || 0) * factor };
  const chk = valid ? labelCheck(per100) : { ok: true };
  const save = (andLog) => {
    const food = saveOwn(asOwnFood({ key: existing?.key, name: f.name.trim(), brand: f.brand.trim(), code: code || existing?.code || '', src: 'label', per100,
      portions: f.servingG > 0 ? [[f.servingLabel ? `1 serving (${f.servingLabel})` : '1 serving', f.servingG]] : [] }));
    if (andLog) openSheet('editor', { food: { ...food, own: true }, date, meal });
    else { toast('Saved to your foods'); closeSheet(); }
  };
  return html`<${Sheet} title=${existing ? 'Edit food' : 'Food from its label'} full
    foot=${html`${!existing && html`<button class="btn ghost" disabled=${!valid} onClick=${() => save(false)}>Save</button>`}<button class="btn grow" disabled=${!valid} onClick=${() => save(!existing)}>${existing ? 'Save' : 'Save and log'}</button>`}>
    ${code && html`<span class="pill" style="align-self:flex-start"><${Icon} n="barcode" cls="sm" />${code}</span>`}
    ${ai.images && html`<label class="btn soft block"><${Icon} n="camera" />${busy ? 'Reading the label…' : 'Read a photo of the label'}<input type="file" accept="image/*" hidden onChange=${onFile} /></label>`}
    ${err && html`<span class="err">${err}</span>`}
    <div class="grid2">
      <div class="field"><label for="cf-n">Name</label><input id="cf-n" class="input" value=${f.name} onInput=${(e) => set({ name: e.target.value })} placeholder="Low carb granola" /></div>
      <div class="field"><label for="cf-b">Brand</label><input id="cf-b" class="input" value=${f.brand} onInput=${(e) => set({ brand: e.target.value })} placeholder="Optional" /></div>
    </div>
    <div class="field"><span class="lbl">The numbers you're entering are</span><${Seg} value=${f.basis} options=${[['100', 'Per 100 g / ml'], ['serving', 'Per serving']]} onChange=${(v) => set({ basis: v })} /></div>
    <div class="grid2">
      <div class="field"><label for="cf-sg">Serving size</label><${NumInput} id="cf-sg" value=${f.servingG} unit="g" onValue=${(v) => set({ servingG: v })} /></div>
      <div class="field"><label for="cf-sl">Serving name</label><input id="cf-sl" class="input" value=${f.servingLabel} onInput=${(e) => set({ servingLabel: e.target.value })} placeholder="1 bar" /></div>
      <div class="field"><label for="cf-k">Energy</label><${NumInput} id="cf-k" value=${f.k} unit="kcal" onValue=${(v) => set({ k: v })} /></div>
      <div class="field"><label for="cf-kj">or kJ</label><${NumInput} id="cf-kj" value=${f.k != null ? Math.round(f.k * 4.184) : null} unit="kJ" onValue=${(v) => set({ k: v != null ? +(v / 4.184).toFixed(1) : null })} /></div>
      <div class="field"><label for="cf-p">Protein</label><${NumInput} id="cf-p" value=${f.p} unit="g" onValue=${(v) => set({ p: v })} /></div>
      <div class="field"><label for="cf-c">Carbohydrate</label><${NumInput} id="cf-c" value=${f.c} unit="g" onValue=${(v) => set({ c: v })} /></div>
      <div class="field"><label for="cf-f">Fat</label><${NumInput} id="cf-f" value=${f.f} unit="g" onValue=${(v) => set({ f: v })} /></div>
      <div class="field"><label for="cf-fb">Fibre</label><${NumInput} id="cf-fb" value=${f.fb} unit="g" onValue=${(v) => set({ fb: v })} /></div>
    </div>
    ${f.basis === 'serving' && !(f.servingG > 0) && html`<span class="hint">Add the serving size in grams so any amount can be logged exactly.</span>`}
    ${!chk.ok && html`<span class="small" style="color:var(--warn)">${chk.reason === 'impossible' ? "These numbers aren't possible per 100 g. Did you enter per-pack values, or kJ as kcal?" : `These numbers don't add up: the macros suggest about ${fmt(chk.fromMacros)} kcal per 100 g. Check for a typo, or kJ entered as kcal.`}</span>`}
    <span class="hint">Australian and New Zealand labels show energy in kJ; type it in the kJ box. Check against the pack before saving: labels are the most accurate number you'll get for packaged food.</span>
  <//>`;
}

/* ───────────── recipes ───────────── */

export function RecipeSheet({ recipe }) {
  const s = useStore();
  const { ready } = useFoods();
  const [r, setR] = useState(() => recipe ? JSON.parse(JSON.stringify(recipe)) : { key: 'r_' + uid(), name: '', items: [], servings: 1, cookedG: null });
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(null);
  const [g, setG] = useState(100);
  const results = useMemo(() => (ready && q.trim().length > 1 ? search(q, s.library).filter((f) => f.key !== r.key).slice(0, 12) : []), [q, ready]);
  const set = (p) => setR((x) => ({ ...x, ...p }));
  const per = recipePer100(r);
  const total = r.items.reduce((a, i) => ({ k: a.k + i.k, p: a.p + i.p, g: a.g + i.g }), { k: 0, p: 0, g: 0 });
  const save = () => { setLibrary((lib) => { const i = lib.recipes.findIndex((x) => x.key === r.key); if (i >= 0) lib.recipes[i] = r; else lib.recipes.unshift(r); }); toast('Recipe saved'); closeSheet(); };
  return html`<${Sheet} title=${recipe ? 'Edit recipe' : 'New recipe'} full foot=${html`<button class="btn block" disabled=${!r.name.trim() || !r.items.length} onClick=${save}>Save recipe</button>`}>
    <div class="field"><label for="rc-n">Recipe name</label><input id="rc-n" class="input" value=${r.name} onInput=${(e) => set({ name: e.target.value })} placeholder="Chicken rice bowl" /></div>
    <div class="card flush"><div class="list">
      ${!r.items.length && html`<div class="item"><span class="faint small">Add each ingredient with its raw weight.</span></div>`}
      ${r.items.map((i, n) => html`<div class="item"><div class="grow"><div class="t">${i.name}</div><div class="s">${fmt(i.g)} g · ${fmt(i.k)} kcal · ${fmt(i.p, 1)}P</div></div>
        <button class="icon-btn" aria-label="Remove" onClick=${() => set({ items: r.items.filter((_, j) => j !== n) })}><${Icon} n="x" cls="sm" /></button></div>`)}
    </div></div>
    ${adding ? html`<div class="card">
        <b>${adding.name}</b>
        <div class="row"><div class="grow"><${NumInput} id="rc-g" value=${g} unit="g" autofocus onValue=${(v) => setG(v || 0)} /></div>
        <button class="btn" disabled=${!(g > 0)} onClick=${() => { const e = makeEntry(adding, g, 's'); set({ items: [...r.items, { fid: adding.key, name: adding.name, g: e.g, k: e.k, p: e.p, c: e.c, f: e.f, fb: e.fb, est: e.est }] }); setAdding(null); setQ(''); }}>Add</button>
        <button class="btn ghost" onClick=${() => setAdding(null)}>Cancel</button></div></div>`
      : html`<div class="search"><${Icon} n="search" /><input id="rc-q" class="input" placeholder="Add an ingredient" value=${q} onInput=${(e) => setQ(e.target.value)} /></div>
        ${results.length > 0 && html`<div class="card flush"><div class="list">${results.map((f) => html`<button class="item" onClick=${() => { setAdding(f); setG(f.portions?.[0]?.[1] || 100); }}><div class="grow"><div class="t">${f.name}</div><div class="s">${per100Line(f)}</div></div></button>`)}</div></div>`}`}
    <div class="grid2">
      <div class="field"><label for="rc-s">Servings it makes</label><${NumInput} id="rc-s" value=${r.servings} onValue=${(v) => set({ servings: Math.max(1, Math.round(v || 1)) })} /></div>
      <div class="field"><label for="rc-cw">Cooked weight (optional)</label><${NumInput} id="rc-cw" value=${r.cookedG} unit="g" onValue=${(v) => set({ cookedG: v })} /></div>
    </div>
    <span class="hint">Weigh the whole pot after cooking and enter it above. Then log your bowl by weight and it is exact, however much water cooked off.</span>
    ${r.items.length > 0 && html`<div class="card"><dl class="kv">
      <dt>Whole recipe</dt><dd>${fmt(total.k)} kcal · ${fmt(total.p)} g protein</dd>
      <dt>Per serving</dt><dd>${fmt(total.k / r.servings)} kcal · ${fmt(total.p / r.servings)} g protein</dd>
      <dt>Per 100 g</dt><dd>${fmt(per.kcal)} kcal · ${fmt(per.p, 1)} g protein</dd>
    </dl></div>`}
  <//>`;
}
