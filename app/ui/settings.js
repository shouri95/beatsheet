// Plan & settings: edit your profile and goal, training setup, units, data.
import { useState, useEffect } from 'preact/hooks';
import { html, useStore, Icon, Seg, Choice, fmt, fmtW, fmtHeight, unitW, toast, Sheet, openSheet, closeSheet, fullDate } from './kit.js';
import * as E from '../engine.js';
import { setProfile, exportAll, importAll, resetAll, state } from '../store.js';
import { EQUIPMENT, LEVELS, SPLITS } from '../program.js';
import { computePlan, targetsFrom, currentWeight } from '../coach.js';
import { isWeb, isArtifact, isIOS, isStandalone, appUrl } from '../env.js';
import { getSecrets, setSecrets } from '../store.js';
import { healthStatus, saveClient, startConnect, disconnect, syncHealth, finishWithCode, describe } from '../health.js';
import { apiModule, resetAi } from '../ai.js';

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

    ${isWeb && html`<${FitbitCard} />`}
    ${isWeb && html`<${AiCard} />`}
    <${AppCard} />

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

/* ───────────── Fitbit ───────────── */

function Copy({ text }) {
  const [ok, setOk] = useState(false);
  return html`<div class="copyline"><code>${text}</code><button class="btn xs soft" onClick=${async () => { try { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1500); } catch { /* select instead */ } }}>${ok ? 'Copied' : 'Copy'}</button></div>`;
}

function FitbitCard() {
  useStore();
  const st = healthStatus();
  const sec = getSecrets();
  const [open, setOpen] = useState(!st.configured);
  const [id, setId] = useState(sec.gClientId || '');
  const [secret, setSecret] = useState(sec.gClientSecret || '');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [paste, setPaste] = useState('');
  const redirect = appUrl();
  const validId = /\.apps\.googleusercontent\.com$/.test(id.trim());

  const connect = async () => {
    saveClient({ clientId: id, clientSecret: secret });
    setBusy('Opening Google…');
    try { await startConnect(); } catch (e) { setBusy(''); setMsg(String(e?.message || e)); }
  };
  const sync = async () => {
    setBusy('Syncing…'); setMsg('');
    try { const r = await syncHealth({ days: 30 }); setMsg(r.changed ? `Updated ${r.changed} day${r.changed > 1 ? 's' : ''}.` : 'Everything is up to date.'); }
    catch (e) { setMsg(e.message || describe(e)); }
    setBusy('');
  };
  const finish = async () => {
    setBusy('Finishing sign-in…'); setMsg('');
    try { await finishWithCode(paste); setPaste(''); setMsg('Connected.'); await syncHealth(); }
    catch (e) { setMsg(e.message || describe(e)); }
    setBusy('');
  };

  return html`<section class="card">
    <div class="row between"><b>Fitbit</b>${st.connected ? html`<span class="pill good"><${Icon} n="check" cls="sm" />Connected</span>` : html`<span class="pill">Not connected</span>`}</div>
    <span class="small muted">Steps, sleep, resting heart rate, workouts and scale weigh-ins sync on their own whenever you open Plates. Fitbit data now comes through the Google Health API, which needs a free Google Cloud project of your own. You set it up once.</span>
    ${st.connected && html`<div class="row wrap">
      <button class="btn sm" disabled=${!!busy} onClick=${sync}><${Icon} n="sync" cls="sm" />${busy || 'Sync now'}</button>
      <span class="tiny faint">${st.lastSync ? `Last sync ${new Date(st.lastSync).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}` : 'Not synced yet'}</span></div>
      ${st.error && html`<span class="small" style="color:var(--warn)">${st.error}</span>`}`}
    ${msg && html`<span class="small">${msg}</span>`}
    ${!st.connected && isIOS && !isStandalone() && html`<span class="small" style="color:var(--warn)">Add Plates to your Home Screen first and connect from there: Safari and the Home Screen app keep separate data on iPhone.</span>`}
    <button class="btn xs ghost" style="align-self:flex-start" onClick=${() => setOpen(!open)}>${open ? 'Hide setup' : st.connected ? 'Setup details' : 'Show setup'}</button>
    ${open && html`<ol class="setup">
      <li>On a computer, open <a href="https://console.cloud.google.com/projectcreate" target="_blank" rel="noopener noreferrer">Google Cloud</a> signed in with the Google account your Fitbit uses. Create a project called <b>Plates</b>.</li>
      <li>Open <a href="https://console.cloud.google.com/apis/library/health.googleapis.com" target="_blank" rel="noopener noreferrer">Google Health API</a> and press <b>Enable</b>.</li>
      <li>Go to <a href="https://console.cloud.google.com/auth/overview" target="_blank" rel="noopener noreferrer">Google Auth Platform</a> → Get started. App name Plates, your email, Audience <b>External</b>, accept the policy.</li>
      <li><b>Audience</b> → Test users → add your own Gmail address.</li>
      <li><b>Data Access</b> → Add or remove scopes → search "Google Health API" → tick these three, then Update and Save:
        <span class="tiny">activity_and_fitness.readonly · sleep.readonly · health_metrics_and_measurements.readonly</span></li>
      <li><b>Clients</b> → Create client → type <b>Web application</b>. Under Authorized redirect URIs add exactly:<${Copy} text=${redirect} />Create, then copy the Client ID and Client secret below.</li>
      <li>Optional, recommended: <b>Audience</b> → Publish app. While it's in Testing, Google signs you out every 7 days. Published but unverified is fine for your own account; you'll see a "Google hasn't verified this app" screen once. Tap Advanced → Go to Plates.</li>
    </ol>
    <div class="field"><label for="g-id">Client ID</label><input id="g-id" class="input" value=${id} onInput=${(e) => setId(e.target.value)} placeholder="…apps.googleusercontent.com" autocomplete="off" autocapitalize="off" spellcheck="false" /></div>
    <div class="field"><label for="g-secret">Client secret</label><input id="g-secret" class="input" type="password" value=${secret} onInput=${(e) => setSecret(e.target.value)} placeholder="GOCSPX-…" autocomplete="off" /></div>
    <span class="hint">Both stay on this phone. The secret belongs to your own Google project, so keeping it here is safe for a personal app.</span>
    <div class="row wrap">
      <button class="btn" disabled=${!validId || secret.trim().length < 8 || !!busy} onClick=${connect}>${st.connected ? 'Reconnect' : 'Connect Fitbit'}</button>
      ${st.connected && html`<button class="btn ghost" onClick=${() => { disconnect(); setMsg('Disconnected.'); }}>Disconnect</button>`}
    </div>
    <details><summary class="small">Sign-in finished in Safari instead?</summary>
      <div class="col" style="margin-top:8px"><span class="small muted">Paste the code Safari showed you.</span>
        <div class="row"><input id="g-code" class="input grow" value=${paste} onInput=${(e) => setPaste(e.target.value)} placeholder="4/0Ab…" autocomplete="off" /><button class="btn" disabled=${paste.trim().length < 10 || !!busy} onClick=${finish}>Finish</button></div></div>
    </details>`}
  </section>`;
}

/* ───────────── AI (Anthropic API key) ───────────── */

function AiCard() {
  useStore();
  const sec = getSecrets();
  const [key, setKey] = useState(sec.anthropicKey || '');
  const [models, setModels] = useState([]);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { apiModule().then((m) => m && setModels(m.MODELS)).catch(() => {}); }, []);
  const save = async () => {
    setSecrets({ anthropicKey: key.trim() || null }); resetAi();
    if (!key.trim()) { setMsg('Key removed. Search, barcode and label entry still work.'); return; }
    setBusy(true); setMsg('Checking the key…');
    try { const m = await apiModule(); await m.testKey(); setMsg('Key works. Meal descriptions, photos, labels and online label lookups are on.'); }
    catch (e) { setMsg(e?.code === 'bad_key' ? 'That key was rejected. Copy it again from the Anthropic Console.' : e?.code === 'offline' ? "You're offline; the key is saved and will be checked next time." : `Couldn't check the key: ${e?.message || e?.code}`); }
    setBusy(false);
  };
  const model = sec.anthropicModel || 'claude-opus-5-5';
  return html`<section class="card">
    <div class="row between"><b>AI features</b>${sec.anthropicKey ? html`<span class="pill good">On</span>` : html`<span class="pill">Off</span>`}</div>
    <span class="small muted">With your own Anthropic API key, Plates can estimate a described or photographed meal, read nutrition labels and body-scan reports, look up a branded product's official label online, and answer coaching questions. Usage is billed to your Anthropic account.</span>
    <div class="field"><label for="ak">Anthropic API key</label><input id="ak" class="input" type="password" value=${key} onInput=${(e) => setKey(e.target.value)} placeholder="sk-ant-…" autocomplete="off" /></div>
    <span class="hint">Create one at console.anthropic.com → API Keys. It's stored only on this phone and sent only to Anthropic.</span>
    <div class="row"><button class="btn sm" disabled=${busy || key.trim() === (sec.anthropicKey || '')} onClick=${save}>${key.trim() ? 'Save key' : 'Remove key'}</button></div>
    ${msg && html`<span class="small">${msg}</span>`}
    ${models.length > 0 && sec.anthropicKey && html`<div class="field"><span class="lbl">Model</span>
      <${Choice} value=${model} options=${models} onChange=${(v) => { setSecrets({ anthropicModel: v }); resetAi(); }} /></div>`}
  </section>`;
}

/* ───────────── app preferences ───────────── */

function AppCard() {
  const s = useStore();
  const prefs = s.profile.prefs || {};
  const set = (patch) => setProfile({ prefs: { ...prefs, ...patch } });
  return html`<section class="card">
    <b>App</b>
    ${!isArtifact && html`<label class="row between toggle"><span><b>Open food logging on launch</b><br /><span class="small faint">The Home Screen icon goes straight to "What are you eating?"</span></span>
      <input type="checkbox" checked=${prefs.launchLog !== false} onChange=${(e) => set({ launchLog: e.target.checked })} /></label>`}
    <label class="row between toggle"><span><b>Earn back calories for extra steps</b><br /><span class="small faint">Half of what you burn walking above your usual daily steps, up to 250 kcal.</span></span>
      <input type="checkbox" checked=${prefs.stepCredit !== false} onChange=${(e) => set({ stepCredit: e.target.checked })} /></label>
  </section>`;
}
