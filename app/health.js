// Fitbit data through the Google Health API (the Fitbit Web API was turned off
// on 2 November 2026). You create your own Google Cloud OAuth client once; its
// ID and secret, and the sign-in tokens, stay on this device.
//
// Flow: authorization code + PKCE, full-page redirect back to this app, code
// exchanged at Google's token endpoint from the browser, refresh token kept so
// later syncs need no sign-in.
import { getSecrets, setSecrets, state, updateDay } from './store.js';
import { appUrl } from './env.js';
import { addDays, dateKey } from './engine.js';
import { mapRollup, pickSteps, pickCalories, mapSleep, mapWeight, mapRestingHr, mapExercise, mergeIntoDays, dateObj } from './health-map.js';

const API = 'https://health.googleapis.com/v4/users/me';
const AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN = 'https://oauth2.googleapis.com/token';
const G = 'https://www.googleapis.com/auth/googlehealth.';
export const SCOPES = [`${G}activity_and_fitness.readonly`, `${G}sleep.readonly`, `${G}health_metrics_and_measurements.readonly`];

export const healthStatus = () => {
  const s = getSecrets();
  return { configured: !!(s.gClientId && s.gClientSecret), connected: !!s.gRefresh, lastSync: s.gLastSync || null, error: s.gError || null, redirect: appUrl() };
};

export function saveClient({ clientId, clientSecret }) {
  setSecrets({ gClientId: clientId.trim(), gClientSecret: clientSecret.trim() });
}
export function disconnect() {
  const s = getSecrets();
  if (s.gAccess) fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(s.gRefresh || s.gAccess)}`, { method: 'POST' }).catch(() => {});
  setSecrets({ gRefresh: null, gAccess: null, gAccessExp: null, gLastSync: null, gError: null, gPending: null });
}

/* ───────────── sign-in ───────────── */

const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const randomString = (n = 48) => b64url(crypto.getRandomValues(new Uint8Array(n)));

export async function startConnect() {
  const s = getSecrets();
  if (!s.gClientId) throw new Error('Add your Google client ID first.');
  const verifier = randomString(48);
  const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  const st = randomString(16);
  setSecrets({ gPending: { verifier, state: st, at: Date.now() } });
  const q = new URLSearchParams({
    client_id: s.gClientId, redirect_uri: appUrl(), response_type: 'code', scope: SCOPES.join(' '),
    access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true', state: st,
    code_challenge: challenge, code_challenge_method: 'S256',
  });
  location.href = `${AUTH}?${q}`;
}

async function tokenRequest(params) {
  const s = getSecrets();
  const res = await fetch(TOKEN, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: s.gClientId, client_secret: s.gClientSecret, ...params }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw { code: data.error || `http_${res.status}`, message: data.error_description || '' };
  return data;
}

async function exchange(code, verifier) {
  const t = await tokenRequest({ grant_type: 'authorization_code', code, code_verifier: verifier, redirect_uri: appUrl() });
  setSecrets({ gAccess: t.access_token, gAccessExp: Date.now() + (t.expires_in || 3600) * 1000, gRefresh: t.refresh_token || getSecrets().gRefresh, gPending: null, gError: null, gScopes: t.scope || '' });
  if (!getSecrets().gRefresh) throw { code: 'no_refresh', message: 'Google did not return a refresh token.' };
}

// Called on boot. Returns what happened so the app can tell you.
export async function handleRedirect() {
  const u = new URL(location.href);
  const code = u.searchParams.get('code'), st = u.searchParams.get('state'), err = u.searchParams.get('error');
  if (!code && !err) return null;
  const clean = () => { u.searchParams.delete('code'); u.searchParams.delete('state'); u.searchParams.delete('scope'); u.searchParams.delete('error'); u.searchParams.delete('authuser'); u.searchParams.delete('prompt'); history.replaceState(null, '', u.pathname + (u.search || '') + (u.hash || '')); };
  if (err) { clean(); return { ok: false, message: err === 'access_denied' ? 'You cancelled the Google sign-in.' : `Google sign-in failed (${err}).` }; }
  const pending = getSecrets().gPending;
  if (!pending || pending.state !== st) {
    // iOS sometimes finishes sign-in in Safari instead of the Home Screen app.
    clean();
    return { ok: false, orphan: code, message: 'Sign-in finished in a different window. Copy the code below into Plates on your Home Screen: Plan & settings → Fitbit → Paste sign-in code.' };
  }
  clean();
  try { await exchange(code, pending.verifier); await verifyAccount(); return { ok: true }; }
  catch (e) { setSecrets({ gError: describe(e) }); return { ok: false, message: describe(e) }; }
}

// Finish a sign-in whose redirect landed in another window.
export async function finishWithCode(code) {
  const pending = getSecrets().gPending;
  if (!pending) throw { code: 'no_pending', message: 'Start the sign-in from this app first, then paste the code.' };
  await exchange(code.trim(), pending.verifier);
  await verifyAccount();
}

async function accessToken() {
  const s = getSecrets();
  if (s.gAccess && s.gAccessExp > Date.now() + 60000) return s.gAccess;
  if (!s.gRefresh) throw { code: 'not_connected' };
  try {
    const t = await tokenRequest({ grant_type: 'refresh_token', refresh_token: s.gRefresh });
    setSecrets({ gAccess: t.access_token, gAccessExp: Date.now() + (t.expires_in || 3600) * 1000, ...(t.refresh_token ? { gRefresh: t.refresh_token } : {}) });
    return t.access_token;
  } catch (e) {
    if (e.code === 'invalid_grant') { setSecrets({ gRefresh: null, gAccess: null, gError: 'Your Google sign-in expired. Connect again.' }); throw { code: 'reconnect' }; }
    throw e;
  }
}

async function call(path, { method = 'GET', body, query } = {}) {
  const tok = await accessToken();
  const url = `${API}/${path}${query ? `?${new URLSearchParams(query)}` : ''}`;
  const res = await fetch(url, { method, headers: { Authorization: `Bearer ${tok}`, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const reason = data?.error?.details?.find((d) => d.reason)?.reason;
    throw { code: reason || `http_${res.status}`, status: res.status, message: data?.error?.message || '' };
  }
  return data;
}

async function verifyAccount() {
  try { await call('identity'); }
  catch (e) { if (e.code === 'ACCOUNT_NOT_LINKED') throw { code: 'ACCOUNT_NOT_LINKED' }; throw e; }
}

export function describe(e) {
  switch (e?.code) {
    case 'ACCOUNT_NOT_LINKED': return 'This Google account isn\'t linked to Fitbit yet. Open the Fitbit app, sign in with this Google account, then connect again.';
    case 'MISSING_OAUTH_SCOPE': return 'Some permissions were left unticked. Connect again and allow activity, sleep and health measurements.';
    case 'reconnect': case 'invalid_grant': return 'Your Google sign-in expired. Connect again. (While the Google project is in Testing, this happens every 7 days. Publish it to stop that.)';
    case 'invalid_client': return 'Google didn\'t recognise the client ID or secret. Check both in Plan & settings → Fitbit.';
    case 'redirect_uri_mismatch': return `The redirect address isn't registered. Add ${appUrl()} under Authorized redirect URIs in Google Cloud.`;
    case 'no_refresh': return 'Google didn\'t return a long-lived sign-in. Remove Plates from your Google account permissions, then connect again.';
    case 'http_429': return 'Google is rate-limiting syncs. It will catch up shortly.';
    case 'not_connected': return 'Fitbit isn\'t connected.';
    default: return e?.message ? `Fitbit sync failed: ${e.message}` : 'Fitbit sync failed. Check your connection and try again.';
  }
}

/* ───────────── sync ───────────── */

const rollupBody = (from, to) => ({ range: { start: { date: dateObj(from) }, end: { date: dateObj(addDays(to, 1)) } }, windowSizeDays: 1, pageSize: 90 });

async function listAll(type, filter, pageSize, method = 'dataPoints') {
  const out = [];
  let pageToken;
  for (let i = 0; i < 8; i++) {
    const res = await call(`dataTypes/${type}/${method}`, { query: { filter, pageSize: String(pageSize), ...(pageToken ? { pageToken } : {}) } });
    out.push(...(res.dataPoints || []));
    pageToken = res.nextPageToken;
    if (!pageToken) break;
  }
  return out;
}

let syncing = null;
// Pull the last `days` days and fold them into your log.
export function syncHealth({ days: n } = {}) {
  if (syncing) return syncing;
  syncing = (async () => {
    const today = dateKey();
    const first = !getSecrets().gLastSync;
    const span = n || (first ? 60 : 10);
    const from = addDays(today, -(span - 1));
    const results = { steps: {}, sleep: {}, weight: {}, rhr: {}, burn: {}, exercise: {} };
    const errors = [];
    const tryIt = async (name, fn) => { try { results[name] = await fn(); } catch (e) { errors.push(e); } };
    await Promise.all([
      tryIt('steps', async () => mapRollup(await call('dataTypes/steps/dataPoints:dailyRollUp', { method: 'POST', body: rollupBody(from, today) }), pickSteps)),
      tryIt('burn', async () => mapRollup(await call('dataTypes/total-calories/dataPoints:dailyRollUp', { method: 'POST', body: rollupBody(span > 14 ? addDays(today, -13) : from, today) }), pickCalories)),
      tryIt('sleep', async () => mapSleep(await listAll('sleep', `sleep.interval.civil_end_time >= "${from}"`, 25, 'dataPoints:reconcile'))),
      tryIt('weight', async () => mapWeight(await listAll('weight', `weight.sample_time.civil_time >= "${from}"`, 500))),
      tryIt('rhr', async () => mapRestingHr(await listAll('daily-resting-heart-rate', `daily_resting_heart_rate.date >= "${from}"`, 100))),
      tryIt('exercise', async () => mapExercise(await listAll('exercise', `exercise.interval.civil_start_time >= "${from}"`, 25))),
    ]);
    const fatal = errors.find((e) => ['reconnect', 'not_connected', 'invalid_client', 'ACCOUNT_NOT_LINKED'].includes(e.code));
    if (fatal || errors.length === 6) { const msg = describe(fatal || errors[0]); setSecrets({ gError: msg }); throw { code: (fatal || errors[0]).code, message: msg }; }
    const changes = mergeIntoDays(state.days, results);
    for (const [k, d] of Object.entries(changes)) updateDay(k, (day) => Object.assign(day, d));
    setSecrets({ gLastSync: Date.now(), gError: errors.length ? describe(errors[0]) : null });
    return { changed: Object.keys(changes).length, partial: errors.length > 0 };
  })().finally(() => { syncing = null; });
  return syncing;
}

// Sync when the app opens or comes back to the foreground, at most every 10 minutes.
export function autoSync(onDone) {
  const run = () => {
    const s = healthStatus();
    if (!s.connected || (s.lastSync && Date.now() - s.lastSync < 10 * 60000)) return;
    syncHealth().then(onDone).catch(() => {});
  };
  run();
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') run(); });
}
