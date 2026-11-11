// Plates — app shell: boot the store, route between tabs, host the sheets.
import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { html, useStore, useUI, Icon, Toast, openSheet, toast } from './ui/kit.js';
import { boot, setErrorHandler } from './store.js';
import { Onboarding } from './ui/onboard.js';
import { Today } from './ui/today.js';
import { Train, ExerciseSheet, LibrarySheet, SessionSheet, ConfirmDiscard, Summary } from './ui/train.js';
import { Progress } from './ui/progress.js';
import { Coach } from './ui/coachview.js';
import { Settings, ConfirmImport, ConfirmReset } from './ui/settings.js';
import { LogSheet, FoodEditor, EntrySheet, CustomFoodSheet, RecipeSheet, mealNow } from './ui/food.js';
import { dateKey } from './engine.js';

const TABS = ['today', 'train', 'progress', 'coach', 'profile'];
const fromHash = () => { const h = location.hash.slice(1); return TABS.includes(h) ? h : 'today'; };

const SHEETS = {
  log: LogSheet, editor: FoodEditor, entry: EntrySheet, customFood: CustomFoodSheet, recipe: RecipeSheet,
  exercise: ExerciseSheet, library: LibrarySheet, session: SessionSheet, confirmDiscard: ConfirmDiscard, summary: Summary,
  confirmImport: ConfirmImport, confirmReset: ConfirmReset,
};

function SheetHost() {
  const ui = useUI();
  if (!ui.sheet) return null;
  const C = SHEETS[ui.sheet.name];
  return C ? html`<${C} key=${ui.sheet.key} ...${ui.sheet.props} />` : null;
}

function App() {
  const s = useStore();
  const [tab, setTab] = useState(fromHash);
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    const f = () => setTab(fromHash());
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  const go = (t) => { setTab(t); try { history.replaceState(null, '', '#' + t); } catch { location.hash = t; } window.scrollTo(0, 0); };

  if (!s.ready) return html`<div class="app"><div class="splash"><div class="mark">PLATES</div><span class="faint small">Loading your log…</span></div></div>`;
  if (!s.profile || editing) return html`<div class="app"><${Onboarding} existing=${editing ? s.profile : null} onDone=${() => { setEditing(false); go('today'); }} /></div><${Toast} />`;

  const Page = { today: Today, train: Train, progress: Progress, coach: Coach, profile: Settings }[tab] || Today;
  const NavLink = ({ id, label, icon }) => html`<a href=${'#' + id} aria-current=${tab === id || (id === 'coach' && tab === 'profile') ? 'page' : undefined} onClick=${(e) => { e.preventDefault(); go(id); }}><${Icon} n=${icon} />${label}</a>`;
  return html`
    ${s.note === 'signed_out' && html`<div class="app" style="padding-bottom:0"><div class="pill warn" style="align-self:flex-start">Not signed in: saving to this browser only</div></div>`}
    ${s.note === 'slow' && html`<div class="app" style="padding-bottom:0"><div class="pill warn" style="align-self:flex-start">Your saved data is taking a while to load. It may be out of date.</div></div>`}
    <main class="app"><${Page} go=${go} onEdit=${() => setEditing(true)} /></main>
    <nav class="nav" aria-label="Main"><div class="nav-in">
      <${NavLink} id="today" label="Today" icon="today" />
      <${NavLink} id="train" label="Train" icon="train" />
      <button class="tab" aria-label="Log food" onClick=${() => openSheet('log', { date: dateKey(), meal: mealNow() })}><span class="fab"><${Icon} n="plus" /></span></button>
      <${NavLink} id="progress" label="Progress" icon="progress" />
      <${NavLink} id="coach" label="Coach" icon="coach" />
    </div></nav>
    <${SheetHost} />
    <${Toast} />`;
}

setErrorHandler((e) => {
  const code = e?.code;
  if (code === 'quota_exceeded') toast('Storage is full. Export a backup and delete old days.');
  else if (code === 'local_storage') toast('This browser blocked saving. Export a backup before closing.');
  else if (code === 'invalid_argument') toast('Could not save: this page is view-only for you.');
  else toast('Could not save that change. It will retry on the next edit.');
});

render(html`<${App} />`, document.getElementById('root'));
boot();
