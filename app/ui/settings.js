// Plan & settings: edit your profile and goal, training setup, units, data.
import { useState } from 'preact/hooks';
import { html, useStore, Icon, Seg, Choice, fmt, fmtW, fmtHeight, unitW, toast, Sheet, openSheet, closeSheet, fullDate } from './kit.js';
import * as E from '../engine.js';
import { setProfile, exportAll, importAll, resetAll, state } from '../store.js';
import { EQUIPMENT, LEVELS, SPLITS } from '../program.js';
import { computePlan, targetsFrom, currentWeight } from '../coach.js';

async function saveFile(name, text) {
  const c = window.claude;
  if (c?.use) {
    const dl = await c.use('downloads').catch(() => null);
    if (dl) { await dl.save({ filename: name, data: text }); return 'saved'; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  return 'saved';
}

export function Settings({ go, onEdit }) {
  const s = useStore();
  const p = s.profile;
  const u = unitW(p);
  const cw = currentWeight(p, s.days);
  const [msg, setMsg] = useState('');

  const retrain = (patch) => {
    const prof = { ...p, train: { ...p.train, ...patch } };
    const plan = computePlan(prof, s.days);
    setProfile({ train: prof.train, targets: targetsFrom(plan) });
    toast('Training updated');
  };
  const doExport = async () => {
    try { await saveFile(`plates-backup-${E.dateKey()}.json`, JSON.stringify(exportAll())); setMsg('Backup saved.'); }
    catch (e) { setMsg(e?.code === 'declined' ? 'Backup cancelled.' : 'Could not save the file here. Try again in a browser tab.'); }
  };
  const doImport = (e) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try { const data = JSON.parse(rd.result); openSheet('confirmImport', { data }); }
      catch { setMsg('That file is not a Plates backup.'); }
    };
    rd.readAsText(f);
  };

  return html`
    <header class="page-head"><div class="row"><button class="icon-btn solid" onClick=${() => go('coach')} aria-label="Back"><${Icon} n="back" /></button><h1 class="h1">Plan & settings</h1></div></header>

    <section class="card">
      <div class="row between"><b>You & your goal</b><button class="btn xs soft" onClick=${onEdit}><${Icon} n="edit" cls="sm" />Edit</button></div>
      <dl class="kv">
        <dt>Sex · age · height</dt><dd>${p.sex === 'f' ? 'Female' : 'Male'} · ${E.ageOf(p)} · ${fmtHeight(p.heightCm, p.units)}</dd>
        <dt>Trend weight</dt><dd>${fmtW(cw.kg, u)}</dd>
        <dt>Goal</dt><dd>${fmtW(p.goal.targetKg, u)} by ${fullDate(E.addDays(p.goal.startDate, Math.round(p.goal.weeks * 7)))}</dd>
        <dt>Daily life</dt><dd>${E.ACTIVITY.find((a) => a.id === p.activity)?.label}</dd>
        <dt>Targets</dt><dd>${fmt(p.targets.kcal)} kcal · ${p.targets.p} g protein</dd>
      </dl>
    </section>

    <section class="card">
      <b>Training</b>
      <div class="field"><span class="lbl">Days per week</span>
        <div class="chips">${[2, 3, 4, 5, 6].map((n) => html`<button class="chip" aria-pressed=${String(p.train.days === n)} onClick=${() => retrain({ days: n })}>${n}</button>`)}</div>
        <span class="hint">${SPLITS[p.train.days].name}</span></div>
      <div class="field"><span class="lbl">Equipment</span><${Choice} value=${p.train.equipment} options=${Object.entries(EQUIPMENT).map(([id, e]) => ({ id, ...e }))} onChange=${(v) => retrain({ equipment: v })} /></div>
      <div class="field"><span class="lbl">Experience</span><${Seg} value=${p.train.level} options=${Object.entries(LEVELS).map(([id, e]) => [id, e.label.split(' ')[0] === 'New' ? 'New' : e.label.split(' ')[0]])} onChange=${(v) => retrain({ level: v })} /></div>
      ${Object.keys(p.train.swaps || {}).length > 0 && html`<button class="btn xs ghost" style="align-self:flex-start" onClick=${() => retrain({ swaps: {} })}>Reset exercise swaps</button>`}
    </section>

    <section class="card">
      <b>Units</b>
      <${Seg} value=${p.units?.h === 'in' ? 'us' : 'metric'} options=${[['metric', 'kg · cm'], ['us', 'lb · in']]} onChange=${(v) => setProfile({ units: v === 'us' ? { w: 'lb', h: 'in' } : { w: 'kg', h: 'cm' } })} />
      <span class="hint">Food is always weighed in grams (ounces available when logging), because that is how the database is measured.</span>
    </section>

    <section class="card">
      <b>Your data</b>
      <span class="small muted">${s.mode === 'db' ? 'Saved privately to your Claude account. Only you can see it, on any device where you open this page.' : 'Saved in this browser only. Export a backup now and then, or open the app inside Claude to sync across devices.'}</span>
      <div class="row wrap">
        <button class="btn sm soft" onClick=${doExport}><${Icon} n="download" cls="sm" />Export backup</button>
        <label class="btn sm soft"><${Icon} n="upload" cls="sm" />Import backup<input type="file" accept="application/json,.json" hidden onChange=${doImport} /></label>
      </div>
      ${msg && html`<span class="hint">${msg}</span>`}
      <button class="btn xs ghost" style="align-self:flex-start;color:var(--bad)" onClick=${() => openSheet('confirmReset', {})}><${Icon} n="trash" cls="sm" />Delete everything</button>
    </section>

    <section class="card small muted">
      <b style="color:var(--ink)">About</b>
      <span>Nutrition values: USDA National Nutrient Database for Standard Reference (public domain). Exercise photos: Free Exercise DB (public domain). Form videos are YouTube tutorials by their creators.</span>
      <span>Formulas: Mifflin–St Jeor and Katch–McArdle for resting burn, US Navy method for tape-measure body fat, Epley for estimated 1-rep max, and an adaptive estimate of your burn from intake and weight trend.</span>
      <span>Plates gives general fitness guidance, not medical advice.</span>
    </section>
  `;
}

export function ConfirmImport({ data }) {
  const [busy, setBusy] = useState('');
  const n = Object.keys(data?.days || {}).length;
  const go = async () => {
    try { setBusy('Importing…'); await importAll(data, (i, t) => setBusy(`Importing ${i} of ${t} days…`)); toast('Backup restored'); closeSheet(); }
    catch (e) { setBusy(String(e?.message || 'Import failed.')); }
  };
  return html`<${Sheet} title="Restore this backup?" foot=${html`<button class="btn ghost grow" onClick=${closeSheet}>Cancel</button><button class="btn grow" disabled=${!!busy && busy.startsWith('Importing')} onClick=${go}>Replace my data</button>`}>
    <p class="muted" style="margin:0">It has ${n} days of logs${data?.exported ? `, exported ${data.exported.slice(0, 10)}` : ''}. Your current profile, foods and days will be replaced.</p>
    ${busy && html`<span class="hint">${busy}</span>`}
  <//>`;
}

export function ConfirmReset() {
  const [text, setText] = useState('');
  return html`<${Sheet} title="Delete everything?" foot=${html`<button class="btn ghost grow" onClick=${closeSheet}>Cancel</button><button class="btn grow" disabled=${text.trim().toLowerCase() !== 'delete'} onClick=${async () => { await resetAll(); closeSheet(); }}>Delete</button>`}>
    <p class="muted" style="margin:0">This removes your profile, every logged day, your foods and recipes. Export a backup first if you might want them back.</p>
    <div class="field"><label for="rst">Type delete to confirm</label><input id="rst" class="input" value=${text} onInput=${(e) => setText(e.target.value)} /></div>
  <//>`;
}
