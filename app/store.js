// Where your data lives.
//
// Inside Claude (the published artifact) everything is saved to the
// artifact's private per-person database, so it follows you across devices.
// Anywhere else (a local copy, GitHub Pages) it is saved in this browser's
// localStorage. Both paths use the same three documents:
//   profile  — you, your goal, your targets, your program settings
//   library  — your own foods (from labels) and recipes
//   days/<YYYY-MM-DD> — one document per day: food, weigh-in, steps, workout

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

function localBackend() {
  const read = (k) => { try { const v = localStorage.getItem(LS + k); return v ? JSON.parse(v) : null; } catch { return null; } };
  return {
    mode: 'local',
    load() {
      state.profile = read('profile');
      state.library = read('library') || { foods: [], recipes: [] };
      const days = {};
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(LS + 'days/')) days[k.slice(LS.length + 5)] = read(k.slice(LS.length));
        }
      } catch { /* storage blocked: start empty */ }
      state.days = days;
    },
    async write(path, data) {
      try {
        if (data == null) localStorage.removeItem(LS + path);
        else localStorage.setItem(LS + path, JSON.stringify(data));
      } catch (e) { throw { code: 'local_storage', message: String(e?.message || e) }; }
    },
  };
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
  backend = localBackend();
  backend.load();
  state.mode = 'local';
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
