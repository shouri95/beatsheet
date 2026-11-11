// Logging food: search the USDA table or your own foods, weigh it, add it.
// Claude can estimate a described or photographed meal, and read labels.
import { useState, useEffect, useMemo, useRef } from 'preact/hooks';
import { html, Sheet, Seg, NumInput, Icon, fmt, closeSheet, openSheet, toast, useStore, parseNum } from './kit.js';
import { loadFoods, search, recentFoods, makeEntry, findByKey, libraryFoods, recipePer100 } from '../foods.js';
import { updateDay, setLibrary, state } from '../store.js';
import { getSample, canUseImages, describeMeal, photoMeal, readLabel, aiErrorText } from '../ai.js';
import { dateKey } from '../engine.js';

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

function useAI() {
  const [s, setS] = useState({ text: false, images: false });
  useEffect(() => { getSample().then(async (x) => setS({ text: !!x, images: x ? await canUseImages() : false })); }, []);
  return s;
}

const per100Line = (f) => `${fmt(f.kcal)} kcal · ${fmt(f.p, 1)}P ${fmt(f.c, 1)}C ${fmt(f.f, 1)}F per 100 g`;
const Badge = ({ f }) => f.src === 'typ' ? html`<span class="pill warn">Typical</span>` : f.src === 'recipe' ? html`<span class="pill">Recipe</span>` : f.own ? html`<span class="pill">Yours</span>` : f.curated ? null : html`<span class="pill">USDA</span>`;

/* ───────────── the log sheet ───────────── */

export function LogSheet({ date = dateKey(), meal: meal0 }) {
  const s = useStore();
  const [tab, setTab] = useState('search');
  const [meal, setMeal] = useState(meal0 || mealNow());
  const [picked, setPicked] = useState(null);
  const ai = useAI();
  if (picked) return html`<${FoodEditor} food=${picked} date=${date} meal=${meal} onBack=${() => setPicked(null)} onMeal=${setMeal} />`;
  const tabs = [['search', 'Search'], ...(ai.text ? [['describe', 'Describe']] : []), ...(ai.images ? [['photo', 'Photo']] : []), ['quick', 'Quick add']];
  return html`<${Sheet} title=${`Add to ${mealName(meal)}`} full>
    <${Seg} value=${meal} options=${MEALS.map(([k, n]) => [k, n])} onChange=${setMeal} label="Meal" />
    ${tabs.length > 1 && html`<div class="chips">${tabs.map(([k, n]) => html`<button class="chip" aria-pressed=${String(tab === k)} onClick=${() => setTab(k)}>${n}</button>`)}</div>`}
    ${tab === 'search' && html`<${SearchTab} lib=${s.library} days=${s.days} onPick=${setPicked} date=${date} meal=${meal} ai=${ai} />`}
    ${tab === 'describe' && html`<${AiTab} mode="text" date=${date} meal=${meal} />`}
    ${tab === 'photo' && html`<${AiTab} mode="photo" date=${date} meal=${meal} />`}
    ${tab === 'quick' && html`<${QuickTab} date=${date} meal=${meal} />`}
  <//>`;
}

function SearchTab({ lib, days, onPick, date, meal, ai }) {
  const { ready, err } = useFoods();
  const [q, setQ] = useState('');
  const recents = useMemo(() => recentFoods(days, date), [days, date]);
  const results = useMemo(() => (ready && q.trim().length > 1 ? search(q, lib, recents.map((r) => r.fid)) : []), [q, ready, lib, recents]);
  const ref = useRef();
  useEffect(() => { setTimeout(() => ref.current?.focus(), 80); }, []);
  const own = libraryFoods(lib);

  const quickRepeat = (e) => {
    updateDay(date, (d) => { (d.foods ||= []).push({ ...e, id: uid(), meal, t: Date.now() }); });
    toast(`Added ${e.name}`); closeSheet();
  };

  return html`
    <div class="search"><${Icon} n="search" /><input ref=${ref} id="food-q" class="input" placeholder="Search 6,400 foods" value=${q} onInput=${(e) => setQ(e.target.value)} autocomplete="off" /></div>
    ${err && html`<span class="err">${err}</span>`}
    ${q.trim().length > 1 ? html`
      <div class="card flush"><div class="list">
        ${!ready && html`<div class="item"><span class="faint">Loading the food database…</span></div>`}
        ${ready && !results.length && html`<div class="item"><span class="faint">No match. Try fewer words, or add it from its label.</span></div>`}
        ${results.map((f) => html`<button class="item" onClick=${() => onPick(f)}>
          <div class="grow"><div class="t">${f.name}</div><div class="s">${per100Line(f)}</div></div><${Badge} f=${f} /></button>`)}
      </div></div>`
    : html`
      ${recents.length > 0 && html`<div class="col tight"><div class="eyebrow">Recent</div>
        <div class="card flush"><div class="list">${recents.map((e) => html`
          <div class="item">
            <button class="grow" style="all:unset;cursor:pointer;min-width:0" onClick=${() => { const f = findByKey(e.fid, lib); if (f) onPick({ ...f, lastG: e.g }); else quickRepeat(e); }}>
              <div class="t ellipsis">${e.name}</div><div class="s">${fmt(e.g)} g · ${fmt(e.k)} kcal</div></button>
            <button class="icon-btn solid" aria-label=${`Add ${e.name} again`} onClick=${() => quickRepeat(e)}><${Icon} n="plus" /></button>
          </div>`)}</div></div></div>`}
      ${own.length > 0 && html`<div class="col tight"><div class="eyebrow">Your foods & recipes</div>
        <div class="card flush"><div class="list">${own.slice(0, 20).map((f) => html`<button class="item" onClick=${() => onPick(f)}>
          <div class="grow"><div class="t">${f.name}</div><div class="s">${per100Line(f)}</div></div><${Badge} f=${f} /></button>`)}</div></div></div>`}
      <div class="grid2">
        <button class="btn soft" onClick=${() => openSheet('customFood', { date, meal })}><${Icon} n="label" />From a label</button>
        <button class="btn soft" onClick=${() => openSheet('recipe', {})}><${Icon} n="book" />New recipe</button>
      </div>
      <p class="hint">For accuracy that holds up: weigh food raw or cooked on a kitchen scale and pick the matching entry ("cooked" vs "uncooked" matters a lot for rice, pasta and meat). Packaged food: scan or copy its label once and it is saved for good.${ai.text ? ' Eating out? Use Describe or Photo for a good estimate.' : ''}</p>
    `}`;
}

/* ───────────── amount editor ───────────── */

export function FoodEditor({ food, date, meal, onBack, onMeal, entry }) {
  const s = useStore();
  const portions = food.portions || [];
  const initialG = entry?.g || food.lastG || portions[0]?.[1] || 100;
  const [g, setG] = useState(initialG);
  const [unit, setUnit] = useState('g');
  const [m, setM] = useState(entry?.meal || meal);
  const valid = g > 0 && g < 5000;
  const e = makeEntry(food, valid ? g : 0, m);
  const add = () => {
    if (entry) {
      updateDay(date, (d) => { const i = (d.foods || []).findIndex((x) => x.id === entry.id); if (i >= 0) d.foods[i] = { ...e, id: entry.id, t: entry.t }; });
      toast('Updated');
    } else {
      updateDay(date, (d) => { (d.foods ||= []).push(e); });
      toast(`Added ${food.name} · ${fmt(e.k)} kcal`, { label: 'Undo', fn: () => updateDay(date, (d) => { d.foods = (d.foods || []).filter((x) => x.id !== e.id); }) });
    }
    closeSheet();
  };
  const shown = unit === 'oz' ? +(g / OZ).toFixed(2) : +(+g).toFixed(1);
  return html`<${Sheet} title=${entry ? 'Edit entry' : 'How much?'} full
    left=${onBack && html`<button class="icon-btn solid" onClick=${onBack} aria-label="Back"><${Icon} n="back" /></button>`}
    foot=${html`<button class="btn block" disabled=${!valid} onClick=${add}>${entry ? 'Save' : `Add to ${mealName(m)}`}</button>`}>
    <div class="col tight"><h2 class="h3">${food.name}</h2><span class="small faint">${food.group || ''} ${food.src === 'typ' ? '· typical value, check your label' : food.src === 'usda' ? '· USDA' : ''}</span></div>
    <div class="row">
      <div class="grow"><${NumInput} id="amt" big value=${shown} unit=${unit} autofocus onValue=${(v) => setG(v == null ? 0 : unit === 'oz' ? v * OZ : v)} /></div>
      <div style="width:112px"><${Seg} value=${unit} options=${[['g', 'g'], ['oz', 'oz']]} onChange=${setUnit} label="Unit" /></div>
    </div>
    ${portions.length > 0 && html`<div class="chips">${portions.map(([l, pg]) => html`<button class="chip" onClick=${() => setG(pg)}>${l} · ${fmt(pg)} g</button>`)}
      ${portions[0] && html`<button class="chip" onClick=${() => setG(portions[0][1] * 2)}>2 × ${portions[0][0].replace(/^1 /, '')}</button>`}</div>`}
    <div class="card">
      <div class="row between"><span class="display" style="font-size:44px">${fmt(e.k)}</span><span class="faint">kcal</span></div>
      <div class="grid3">
        <div class="stat"><span class="v" style="color:inherit">${fmt(e.p, 1)}<small>g</small></span><span class="l"><i style="display:inline-block;width:8px;height:8px;border-radius:9px;background:var(--pro);margin-right:5px"></i>Protein</span></div>
        <div class="stat"><span class="v">${fmt(e.c, 1)}<small>g</small></span><span class="l"><i style="display:inline-block;width:8px;height:8px;border-radius:9px;background:var(--carb);margin-right:5px"></i>Carbs</span></div>
        <div class="stat"><span class="v">${fmt(e.f, 1)}<small>g</small></span><span class="l"><i style="display:inline-block;width:8px;height:8px;border-radius:9px;background:var(--fat);margin-right:5px"></i>Fat</span></div>
      </div>
      <span class="tiny faint">${fmt(e.fb, 1)} g fiber · ${per100Line(food)}</span>
    </div>
    ${!entry && html`<${Seg} value=${m} options=${MEALS} onChange=${(v) => { setM(v); onMeal?.(v); }} label="Meal" />`}
  <//>`;
}

/* ───────────── edit a logged entry ───────────── */

export function EntrySheet({ date, entry }) {
  const s = useStore();
  const food = findByKey(entry.fid, s.library);
  const [g, setG] = useState(entry.g);
  const [m, setM] = useState(entry.meal);
  const [, force] = useState(0);
  useEffect(() => { loadFoods().then(() => force(1)).catch(() => {}); }, []);
  const f2 = findByKey(entry.fid, s.library) || food;
  if (f2 && entry.src !== 'ai' && entry.src !== 'quick') return html`<${FoodEditor} food=${f2} date=${date} meal=${entry.meal} entry=${entry} />`;
  const k = entry.g > 0 ? g / entry.g : 1;
  const save = () => {
    updateDay(date, (d) => { const i = (d.foods || []).findIndex((x) => x.id === entry.id); if (i >= 0) d.foods[i] = { ...entry, g, meal: m, k: Math.round(entry.k * k), p: +(entry.p * k).toFixed(1), c: +(entry.c * k).toFixed(1), f: +(entry.f * k).toFixed(1), fb: +((entry.fb || 0) * k).toFixed(1) }; });
    closeSheet();
  };
  return html`<${Sheet} title="Edit entry" foot=${html`<button class="btn ghost" onClick=${() => { updateDay(date, (d) => { d.foods = d.foods.filter((x) => x.id !== entry.id); }); closeSheet(); }}><${Icon} n="trash" />Delete</button><button class="btn grow" onClick=${save}>Save</button>`}>
    <h2 class="h3">${entry.name}</h2>
    <span class="small faint">${entry.est ? 'Estimate' : 'Logged'} · scales all values with the amount</span>
    ${entry.g > 0 && html`<${NumInput} id="eg" big value=${g} unit="g" onValue=${(v) => setG(v || 0)} />`}
    <div class="card"><div class="row between"><span class="display" style="font-size:40px">${fmt(entry.k * k)}</span><span class="faint">kcal · ${fmt(entry.p * k, 1)}P ${fmt(entry.c * k, 1)}C ${fmt(entry.f * k, 1)}F</span></div></div>
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
    <span class="hint">Counts as an estimate. For anything you will eat again, save it from its label instead.</span>
    <button class="btn block" disabled=${!(kcal > 0)} onClick=${add}>Add ${kcal > 0 ? `${fmt(kcal)} kcal` : ''}</button>
  </div>`;
}

/* ───────────── Claude estimates ───────────── */

function AiTab({ mode, date, meal }) {
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [res, setRes] = useState(null);
  const ctl = useRef(null);
  useEffect(() => () => { ctl.current?.abort(); if (preview) URL.revokeObjectURL(preview); }, []);
  useFoods();

  const run = async () => {
    ctl.current?.abort(); ctl.current = new AbortController();
    setBusy(true); setErr(''); setRes(null);
    try {
      const r = mode === 'photo' ? await photoMeal(file, text, ctl.current.signal) : await describeMeal(text, ctl.current.signal);
      if (!r.items.length) setErr('No foods found in that. Try naming each item.');
      setRes({ ...r, items: r.items.map((i) => ({ ...i, g0: i.g, id: uid() })) });
    } catch (x) { setErr(aiErrorText(x)); }
    setBusy(false);
  };

  const scale = (i) => (i.g0 > 0 ? i.g / i.g0 : 1);
  const tot = res ? res.items.reduce((a, i) => { const k = scale(i); a.k += i.k * k; a.p += i.p * k; a.c += i.c * k; a.f += i.f * k; return a; }, { k: 0, p: 0, c: 0, f: 0 }) : null;
  const addAll = () => {
    updateDay(date, (d) => {
      d.foods ||= [];
      for (const i of res.items) {
        const k = scale(i);
        d.foods.push({ id: uid(), name: i.name, g: Math.round(i.g), k: Math.round(i.k * k), p: +(i.p * k).toFixed(1), c: +(i.c * k).toFixed(1), f: +(i.f * k).toFixed(1), fb: +(i.fb * k).toFixed(1), meal, src: 'ai', est: true, t: Date.now() });
      }
    });
    toast(`Added ${res.items.length} items · ${fmt(tot.k)} kcal`); closeSheet();
  };

  return html`<div class="col">
    ${mode === 'photo' && html`<label class="card" style="cursor:pointer;align-items:center;text-align:center">
      ${preview ? html`<img src=${preview} alt="Your meal" style="border-radius:12px;max-height:240px;object-fit:cover" />` : html`<${Icon} n="camera" /><b>Choose a photo of your meal</b><span class="small faint">Top-down, whole plate in frame, a fork or hand for scale</span>`}
      <input type="file" accept="image/*" hidden onChange=${(e) => { const f = e.target.files?.[0]; if (f) { setFile(f); setPreview(URL.createObjectURL(f)); setRes(null); } }} /></label>`}
    <div class="field"><label for="ai-t">${mode === 'photo' ? 'Anything the photo cannot show? (optional)' : 'What did you eat?'}</label>
      <textarea id="ai-t" class="input" value=${text} onInput=${(e) => setText(e.target.value)} placeholder=${mode === 'photo' ? 'Cooked in about a tablespoon of olive oil' : 'Two eggs scrambled in butter, two slices of sourdough toast, a flat white with whole milk'}></textarea></div>
    <button class="btn block" disabled=${busy || (mode === 'photo' ? !file : text.trim().length < 3)} onClick=${run}>${busy ? 'Estimating… this takes a few seconds' : 'Estimate'}</button>
    ${busy && html`<button class="btn ghost block" onClick=${() => ctl.current?.abort()}>Stop</button>`}
    ${err && html`<span class="err">${err}</span>`}
    ${res && res.items.length > 0 && html`
      <div class="card flush"><div class="list">${res.items.map((i, n) => html`<div class="item">
        <div class="grow"><div class="t">${i.name}</div><div class="s">${fmt(i.k * scale(i))} kcal · ${fmt(i.p * scale(i), 1)}P ${fmt(i.c * scale(i), 1)}C ${fmt(i.f * scale(i), 1)}F ${i.conf === 'low' ? '· rough guess' : ''}</div></div>
        <div style="width:96px"><${NumInput} id=${`ai-g-${i.id}`} value=${Math.round(i.g)} unit="g" onValue=${(v) => setRes((r) => ({ ...r, items: r.items.map((x, j) => (j === n ? { ...x, g: v || 0 } : x)) }))} /></div>
        <button class="icon-btn" aria-label=${`Remove ${i.name}`} onClick=${() => setRes((r) => ({ ...r, items: r.items.filter((_, j) => j !== n) }))}><${Icon} n="x" cls="sm" /></button>
      </div>`)}</div></div>
      <div class="row between"><b>Total</b><span class="num"><b>${fmt(tot.k)} kcal</b> · ${fmt(tot.p)}P ${fmt(tot.c)}C ${fmt(tot.f)}F</span></div>
      ${res.note && html`<span class="hint">${res.note}</span>`}
      <span class="hint">Change any weight you know better; the numbers scale with it. These are logged as estimates.</span>
      <button class="btn block" onClick=${addAll}>Add all to ${mealName(meal)}</button>`}
  </div>`;
}

/* ───────────── a food from its label ───────────── */

export function CustomFoodSheet({ date, meal, food: existing }) {
  const ai = useAI();
  const [f, setF] = useState(() => existing ? { name: existing.name, brand: existing.brand || '', basis: '100', servingG: existing.portions?.[0]?.[1] || null, servingLabel: existing.portions?.[0]?.[0] || '', k: existing.kcal, p: existing.p, c: existing.c, f: existing.f, fb: existing.fb } : { name: '', brand: '', basis: 'serving', servingG: null, servingLabel: '', k: null, p: null, c: null, f: null, fb: null });
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
      else if (r.per100) set({ name: f.name || r.name, brand: f.brand || r.brand, basis: '100', servingG: r.servingG, servingLabel: r.servingLabel, k: r.per100.kcal, p: r.per100.p, c: r.per100.c, f: r.per100.f, fb: r.per100.fb });
      else set({ name: f.name || r.name, brand: f.brand || r.brand, basis: 'serving', servingG: r.servingG, servingLabel: r.servingLabel, k: r.perServing.kcal, p: r.perServing.p, c: r.perServing.c, f: r.perServing.f, fb: r.perServing.fb });
    } catch (x) { setErr(aiErrorText(x)); }
    setBusy(false);
  };

  const factor = f.basis === '100' ? 1 : f.servingG > 0 ? 100 / f.servingG : 0;
  const valid = f.name.trim() && f.k != null && factor > 0;
  const save = (andLog) => {
    const food = {
      key: existing?.key || 'c_' + uid(), name: f.name.trim(), brand: f.brand.trim(), src: 'label',
      kcal: +(f.k * factor).toFixed(1), p: +((f.p || 0) * factor).toFixed(2), c: +((f.c || 0) * factor).toFixed(2), f: +((f.f || 0) * factor).toFixed(2), fb: +((f.fb || 0) * factor).toFixed(2),
      portions: f.servingG > 0 ? [[f.servingLabel ? `1 serving (${f.servingLabel})` : '1 serving', f.servingG]] : [],
    };
    setLibrary((lib) => { const i = lib.foods.findIndex((x) => x.key === food.key); if (i >= 0) lib.foods[i] = food; else lib.foods.unshift(food); });
    if (andLog) openSheet('editor', { food: { ...food, own: true }, date, meal });
    else { toast('Saved to your foods'); closeSheet(); }
  };
  return html`<${Sheet} title=${existing ? 'Edit food' : 'New food from a label'} full
    foot=${html`${!existing && html`<button class="btn ghost" disabled=${!valid} onClick=${() => save(false)}>Save</button>`}<button class="btn grow" disabled=${!valid} onClick=${() => save(!existing)}>${existing ? 'Save' : 'Save and log'}</button>`}>
    ${ai.images && html`<label class="btn soft block"><${Icon} n="camera" />${busy ? 'Reading the label…' : 'Read a photo of the label'}<input type="file" accept="image/*" hidden onChange=${onFile} /></label>`}
    ${err && html`<span class="err">${err}</span>`}
    <div class="grid2">
      <div class="field"><label for="cf-n">Name</label><input id="cf-n" class="input" value=${f.name} onInput=${(e) => set({ name: e.target.value })} placeholder="Protein bar" /></div>
      <div class="field"><label for="cf-b">Brand</label><input id="cf-b" class="input" value=${f.brand} onInput=${(e) => set({ brand: e.target.value })} placeholder="Optional" /></div>
    </div>
    <div class="field"><span class="lbl">The numbers on the label are</span><${Seg} value=${f.basis} options=${[['serving', 'Per serving'], ['100', 'Per 100 g / ml']]} onChange=${(v) => set({ basis: v })} /></div>
    <div class="grid2">
      <div class="field"><label for="cf-sg">Serving size</label><${NumInput} id="cf-sg" value=${f.servingG} unit="g" onValue=${(v) => set({ servingG: v })} /></div>
      <div class="field"><label for="cf-sl">Serving name</label><input id="cf-sl" class="input" value=${f.servingLabel} onInput=${(e) => set({ servingLabel: e.target.value })} placeholder="1 bar" /></div>
      <div class="field"><label for="cf-k">Calories</label><${NumInput} id="cf-k" value=${f.k} unit="kcal" onValue=${(v) => set({ k: v })} /></div>
      <div class="field"><label for="cf-p">Protein</label><${NumInput} id="cf-p" value=${f.p} unit="g" onValue=${(v) => set({ p: v })} /></div>
      <div class="field"><label for="cf-c">Carbs</label><${NumInput} id="cf-c" value=${f.c} unit="g" onValue=${(v) => set({ c: v })} /></div>
      <div class="field"><label for="cf-f">Fat</label><${NumInput} id="cf-f" value=${f.f} unit="g" onValue=${(v) => set({ f: v })} /></div>
      <div class="field"><label for="cf-fb">Fiber</label><${NumInput} id="cf-fb" value=${f.fb} unit="g" onValue=${(v) => set({ fb: v })} /></div>
    </div>
    ${f.basis === 'serving' && !(f.servingG > 0) && html`<span class="hint">Add the serving size in grams so any amount can be logged exactly.</span>`}
    <span class="hint">Check what you entered against the label before saving. Labels are allowed some rounding, but they are the most accurate number you will get for packaged food.</span>
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
