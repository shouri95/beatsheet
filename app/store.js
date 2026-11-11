// Where your data lives.
//
// Inside Claude (the published artifact) everything is saved to the
// artifact's private per-person database, so it follows you across devices.
// In the installed app it is saved on this device in IndexedDB (older
// localStorage data is moved over on first launch). Both use the same
// documents:
//   profile  — you, your goal, your targets, your program settings
//   library  — your own foods (from labels, barcodes, lookups) and recipes
//   days/<YYYY-MM-DD> — one document per day: food, weigh-in, steps, sleep, workout
//
// Secrets (your Anthropic API key, Google sign-in tokens) are kept apart in
// `secrets`, never synced and never included in backups.

const LS = 'plates:v1:';
const listeners = new Set();
export const state = {
  ready: false, mode: 'local', note: null,
  profile: null, library: { foods: [], recipes: [] }, days: {},
};

let frame = 0;
let version = 0;
export const getVersion = () => version;
function emit() {
  version++;
  if (frame) return;
  frame = requestAnimationFrame(() => { frame = 0; listeners.forEach((fn) => fn(state)); });
}
export const subscribe = (fn) => (listeners.add(fn), () => listeners.delete(fn));

/* ───────────── write queue (one write in flight per document) ───────────── */

let backend = null;
const pending = new Map();   // path → latest data
const timers = new Map();
const inflight = new Set();
let onError = () => {};
export const setErrorHandler = (fn) => { onError = fn; };

function queue(path, data, delay = 450) {
  pending.set(path, data);
  clearTimeout(timers.get(path));
  timers.set(path, setTimeout(() => flush(path), delay));
}
async function flush(path) {
  timers.delete(path);
  if (inflight.has(path) || !pending.has(path)) return;
  const data = pending.get(path);
  pending.delete(path);
  inflight.add(path);
  try { await backend.write(path, data); }
  catch (e) { onError(e); }
  finally {
    inflight.delete(path);
    if (pending.has(path)) flush(path);
  }
}
export const busy = (path) => pending.has(path) || inflight.has(path) || timers.has(path);
export function flushAll() { for (const p of [...timers.keys()]) { clearTimeout(timers.get(p)); flush(p); } }
if (typeof window !== 'undefined') window.addEventListener('pagehide', flushAll);

/* ───────────── backends ───────────── */

/* ───────────── IndexedDB (installed app) ───────────── */

const IDB_NAME = 'plates';
function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => { const db = req.result; if (!db.objectStoreNames.contains('docs')) db.createObjectStore('docs'); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('blocked'));
  });
}
const tx = (db, mode, fn) => new Promise((resolve, reject) => {
  const t = db.transaction('docs', mode);
  const st = t.objectStore('docs');
  const out = fn(st);
  t.oncomplete = () => resolve(out?.result ?? out);
  t.onerror = () => reject(t.error);
  t.onabort = () => reject(t.error);
});

async function idbBackend() {
  const db = await idbOpen();
  return {
    mode: 'local',
    async load() {
      const all = await new Promise((resolve, reject) => {
        const out = {};
        const t = db.transaction('docs', 'readonly');
        const req = t.objectStore('docs').openCursor();
        req.onsuccess = () => { const c = req.result; if (c) { out[c.key] = c.value; c.continue(); } else resolve(out); };
        req.onerror = () => reject(req.error);
      });
      // First launch after the switch: move anything left in localStorage.
      if (!all.profile) {
        const ls = readLocalStorage();
        if (ls.profile) {
          await tx(db, 'readwrite', (st) => { for (const [k, v] of Object.entries(ls.docs)) st.put(v, k); });
          Object.assign(all, ls.docs);
        }
      }
      state.profile = all.profile || null;
      state.library = all.library || { foods: [], recipes: [] };
      state.days = {};
      for (const [k, v] of Object.entries(all)) if (k.startsWith('days/')) state.days[k.slice(5)] = v;
    },
    async write(path, data) {
      await tx(db, 'readwrite', (st) => (data == null ? st.delete(path) : st.put(data, path)));
    },
  };
}

function readLocalStorage() {
  const docs = {};
  let profile = null;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(LS)) continue;
      const v = JSON.parse(localStorage.getItem(k));
      docs[k.slice(LS.length)] = v;
      if (k === LS + 'profile') profile = v;
    }
  } catch { /* storage blocked */ }
  return { profile, docs };
}

// Fallback when IndexedDB is unavailable (some private windows).
function localBackend() {
  return {
    mode: 'local',
    load() {
      const { docs } = readLocalStorage();
      state.profile = docs.profile || null;
      state.library = docs.library || { foods: [], recipes: [] };
      state.days = {};
      for (const [k, v] of Object.entries(docs)) if (k.startsWith('days/')) state.days[k.slice(5)] = v;
    },
    async write(path, data) {
      try {
        if (data == null) localStorage.removeItem(LS + path);
        else localStorage.setItem(LS + path, JSON.stringify(data));
      } catch (e) { throw { code: 'local_storage', message: String(e?.message || e) }; }
    },
  };
}

/* ───────────── secrets (this device only) ───────────── */

const SECRETS = 'plates:secrets';
export function getSecrets() { try { return JSON.parse(localStorage.getItem(SECRETS)) || {}; } catch { return {}; } }
export function setSecrets(patch) {
  const next = { ...getSecrets(), ...patch };
  for (const k of Object.keys(next)) if (next[k] == null) delete next[k];
  try { localStorage.setItem(SECRETS, JSON.stringify(next)); } catch { /* storage blocked */ }
  emit();
  return next;
}

function dbBackend(db, uid) {
  const base = `data/users/${uid}`;
  const ref = (path) => (path.startsWith('days/') ? db.doc(`${base}/profile/days/${path.slice(5)}`) : db.doc(`${base}/${path}`));
  return {
    mode: 'db',
    start(done) {
      const seen = { profile: false, library: false, days: false };
      const mark = (k) => { if (!seen[k]) { seen[k] = true; if (seen.profile && seen.library && seen.days) done(); } };
      ref('profile').onSnapshot((s) => {
        if (!busy('profile')) state.profile = s.exists ? clean(s.data()) : null;
        mark('profile'); emit();
      }, (e) => { onError(e); mark('profile'); });
      ref('library').onSnapshot((s) => {
        if (!busy('library')) state.library = s.exists ? clean(s.data()) : { foods: [], recipes: [] };
        mark('library'); emit();
      }, (e) => { onError(e); mark('library'); });
      db.doc(`${base}/profile`).collection('days').onSnapshot((snap) => {
        const days = { ...state.days };
        for (const ch of snap.docChanges()) {
          const k = ch.doc.id;
          if (busy('days/' + k)) continue;
          if (ch.type === 'removed') delete days[k];
          else days[k] = clean(ch.doc.data());
        }
        state.days = days;
        mark('days'); emit();
      }, (e) => { onError(e); mark('days'); });
    },
    async write(path, data) {
      if (data == null) return ref(path).delete();
      return ref(path).set(data);
    },
  };
}
// Snapshots are frozen; the app edits copies.
const clean = (x) => JSON.parse(JSON.stringify(x || {}));

/* ───────────── boot ───────────── */

export async function boot() {
  const claude = typeof window !== 'undefined' ? window.claude : null;
  if (claude && typeof claude.use === 'function') {
    try {
      const [db, user] = await Promise.all([claude.use('db'), claude.use('user')]);
      const uid = user ? await user.id() : null;
      if (db && uid) {
        backend = dbBackend(db, uid);
        state.mode = 'db';
        await new Promise((resolve) => {
          const t = setTimeout(() => { state.note = 'slow'; resolve(); }, 10000);
          backend.start(() => { clearTimeout(t); resolve(); });
        });
        state.ready = true; emit();
        return;
      }
      state.note = 'signed_out';
    } catch { state.note = 'signed_out'; }
  }
  try {
    if (typeof indexedDB === 'undefined') throw new Error('no idb');
    backend = await idbBackend();
    await backend.load();
  } catch {
    backend = localBackend();
    backend.load();
  }
  state.mode = 'local';
  // Ask the browser not to clear this data under storage pressure.
  try { await navigator.storage?.persist?.(); } catch { /* optional */ }
  state.ready = true; emit();
}

/* ───────────── mutations ───────────── */

export function setProfile(patch) {
  state.profile = { ...(state.profile || {}), ...patch, updated: Date.now() };
  queue('profile', state.profile);
  emit();
}

export function setLibrary(fn) {
  const lib = clean(state.library);
  lib.foods ||= []; lib.recipes ||= [];
  fn(lib);
  state.library = lib;
  queue('library', lib);
  emit();
}

export function updateDay(key, fn) {
  const d = clean(state.days[key]);
  fn(d);
  state.days = { ...state.days, [key]: d };
  queue('days/' + key, d);
  emit();
}

export function exportAll() {
  return { app: 'plates', v: 1, exported: new Date().toISOString(), profile: state.profile, library: state.library, days: state.days };
}

export async function importAll(data, onProgress) {
  if (!data || data.app !== 'plates' || !data.profile) throw new Error('This file is not a Plates backup.');
  state.profile = data.profile; state.library = data.library || { foods: [], recipes: [] };
  state.days = data.days || {};
  emit();
  await backend.write('profile', state.profile);
  await backend.write('library', state.library);
  const keys = Object.keys(state.days);
  for (let i = 0; i < keys.length; i++) {
    await backend.write('days/' + keys[i], state.days[keys[i]]);
    onProgress?.(i + 1, keys.length);
  }
}

export async function resetAll() {
  const keys = Object.keys(state.days);
  for (const k of keys) await backend.write('days/' + k, null);
  await backend.write('library', null);
  await backend.write('profile', null);
  state.profile = null; state.library = { foods: [], recipes: [] }; state.days = {};
  emit();
}
