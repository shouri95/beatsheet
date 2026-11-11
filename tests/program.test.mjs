import test from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../app/program.js';
import { EX, EXERCISES } from '../app/data/exercises.js';
import fs from 'node:fs';

test('every exercise has a photo pair (or says it has none) and a video id', () => {
  for (const e of EXERCISES) {
    assert.match(e.v, /^[A-Za-z0-9_-]{11}$/, e.id);
    if (e.img) for (const f of [0, 1]) assert.ok(fs.existsSync(new URL(`../app/media/ex/${e.id}-${f}.jpg`, import.meta.url)), `${e.id}-${f}.jpg`);
    assert.ok(e.cues.length >= 3 && e.mistake, e.id);
  }
});

test('every split builds a full workout for every equipment and level', () => {
  for (const days of [2, 3, 4, 5, 6]) for (const equipment of ['gym', 'home', 'bw']) for (const level of ['new', 'mid', 'exp']) {
    for (let i = 0; i < days; i++) {
      const w = P.buildWorkout({ days, equipment, level }, i);
      assert.ok(w.items.length >= 4, `${days}/${equipment}/${level}/${i}: ${w.items.length}`);
      const ids = w.items.map((x) => x.id);
      assert.equal(new Set(ids).size, ids.length, 'no duplicate exercises');
      const has = P.EQUIPMENT[equipment].has;
      for (const id of ids) assert.ok(EX[id].need.every((n) => has.includes(n)), `${id} needs ${EX[id].need} at ${equipment}`);
    }
  }
});

test('beginners get easier picks and fewer sets', () => {
  const a = P.buildWorkout({ days: 3, equipment: 'gym', level: 'new' }, 0);
  assert.equal(a.items[0].id, 'goblet_squat');
  assert.ok(a.items.every((x) => x.sets <= 3));
  const b = P.buildWorkout({ days: 3, equipment: 'gym', level: 'mid' }, 0);
  assert.equal(b.items[0].id, 'squat');
});

test('swaps are respected only when the equipment allows them', () => {
  const w = P.buildWorkout({ days: 3, equipment: 'gym', level: 'mid', swaps: { 'Full body A:squat': 'leg_press' } }, 0);
  assert.equal(w.items[0].id, 'leg_press');
  const h = P.buildWorkout({ days: 3, equipment: 'home', level: 'mid', swaps: { 'Full body A:squat': 'leg_press' } }, 0);
  assert.equal(h.items[0].id, 'goblet_squat');
});

test('rotation and blocks', () => {
  const days = { '2026-01-01': { workout: { done: true, idx: 0 } }, '2026-01-03': { workout: { done: true, idx: 1 } } };
  assert.equal(P.nextWorkoutIndex(days, '2026-01-05'), 2);
  assert.equal(P.nextWorkoutIndex({}, '2026-01-05'), 0);
  assert.deepEqual(P.blockWeek('2026-01-01', '2026-01-01'), { week: 1, inBlock: 1, deload: false, rir: 3 });
  assert.equal(P.blockWeek('2026-01-01', '2026-02-01').deload, true);
});

test('double progression', () => {
  const item = { id: 'bench', sets: 3, lo: 6, hi: 10 };
  const h = (w, reps) => ({ date: '2026-01-01', sets: reps.map((r) => ({ w, r, done: true })) });
  assert.equal(P.suggest(item, []).note, 'first');
  const up = P.suggest(item, [h(60, [10, 10, 10])]);
  assert.deepEqual([up.w, up.reps, up.note], [62.5, 6, 'up']);
  const same = P.suggest(item, [h(60, [10, 9, 8])]);
  assert.deepEqual([same.w, same.reps, same.note], [60, 9, 'same']);
  const down = P.suggest(item, [h(60, [5, 4, 4]), h(60, [5, 5, 4])]);
  assert.equal(down.note, 'down');
  assert.equal(down.w, 55);
  const lower = P.suggest({ id: 'squat', sets: 3, lo: 6, hi: 10 }, [h(100, [10, 10, 10])]);
  assert.equal(lower.w, 105);
  const lb = P.suggest(item, [h(60, [10, 10, 10])], { unit: 'lb' });
  assert.ok(Math.abs(lb.w / 0.45359237 - 135) < 0.01, `got ${lb.w / 0.45359237} lb`);
  const dl = P.suggest(item, [h(60, [10, 10, 10])], { deload: true });
  assert.equal(dl.note, 'deload');
  const bw = P.suggest({ id: 'pushup', sets: 3, lo: 8, hi: 15 }, [h(0, [12, 10, 9])]);
  assert.deepEqual([bw.reps, bw.note], [10, 'same']);
});

test('PRs compare against earlier sessions only', () => {
  const days = { '2026-01-01': { workout: { ex: [{ id: 'bench', sets: [{ w: 60, r: 8, done: true }] }] } } };
  const today = { ex: [{ id: 'bench', sets: [{ w: 62.5, r: 8, done: true }] }] };
  const prs = P.findPRs(days, '2026-01-05', today);
  assert.equal(prs.length, 1);
  assert.equal(P.findPRs({}, '2026-01-05', today).length, 0);
});

test('no-dumbbell lunges progress by reps', () => {
  assert.equal(P.loadTypeFor('rear_lunge', 'bw'), 'bw');
  assert.equal(P.loadTypeFor('rear_lunge', 'home'), 'db');
});
