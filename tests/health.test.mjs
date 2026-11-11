import test from 'node:test';
import assert from 'node:assert/strict';
import * as H from '../app/health-map.js';

test('daily step roll-ups map to dates; unworn days are skipped', () => {
  const res = { rollupDataPoints: [
    { civilStartTime: { date: { year: 2026, month: 11, day: 10 } }, steps: { countSum: '9432' } },
    { civilStartTime: { date: { year: 2026, month: 11, day: 9 } } },
    { civilStartTime: { date: { year: 2026, month: 11, day: 8 } }, steps: { countSum: '0' } },
  ] };
  assert.deepEqual(H.mapRollup(res, H.pickSteps), { '2026-11-10': 9432, '2026-11-08': 0 });
});

test('sleep: main sleep filed under the wake-up day, naps ignored', () => {
  const pts = [
    { sleep: { interval: { startTime: '2026-03-03T20:57:30Z', startUtcOffset: '39600s', endTime: '2026-03-04T04:41:30Z', endUtcOffset: '39600s' },
      metadata: { mainSleep: true }, summary: { minutesInSleepPeriod: '464', minutesAsleep: '407', minutesAwake: '57', stagesSummary: [{ type: 'DEEP', minutes: '114' }, { type: 'REM', minutes: '94' }, { type: 'LIGHT', minutes: '198' }] } } },
    { sleep: { interval: { startTime: '2026-03-04T03:00:00Z', startUtcOffset: '39600s', endTime: '2026-03-04T03:40:00Z', endUtcOffset: '39600s' }, metadata: { nap: true }, summary: { minutesAsleep: '38' } } },
  ];
  const out = H.mapSleep(pts);
  // 04:41 UTC + 11 h = 15:41 local on 4 March
  assert.deepEqual(Object.keys(out), ['2026-03-04']);
  assert.deepEqual(out['2026-03-04'], { asleep: 407, inBed: 464, awake: 57, deep: 114, rem: 94, light: 198, start: '07:57', end: '15:41' });
});

test('weight: latest sample of each day, grams to kg', () => {
  const pts = [
    { weight: { weightGrams: 67200, sampleTime: { physicalTime: '2026-11-10T21:00:00Z', utcOffset: '39600s' } } },
    { weight: { weightGrams: 67450, sampleTime: { physicalTime: '2026-11-10T23:00:00Z', utcOffset: '39600s', civilTime: { date: { year: 2026, month: 11, day: 11 } } } } },
  ];
  assert.deepEqual(H.mapWeight(pts), { '2026-11-11': 67.45 });
});

test('exercise: cardio minutes counted, lifting kept as a session only', () => {
  const pts = [
    { exercise: { exerciseType: 'WALKING', displayName: 'Walk', activeDuration: '1800s', interval: { startTime: '2026-11-10T08:00:00Z', startUtcOffset: '0s', endTime: '2026-11-10T08:31:00Z', civilStartTime: { date: { year: 2026, month: 11, day: 10 } } }, metricsSummary: { caloriesKcal: 140.4 } } },
    { exercise: { exerciseType: 'WEIGHTLIFTING', displayName: 'Weights', activeDuration: '3000s', interval: { startTime: '2026-11-10T18:00:00Z', startUtcOffset: '0s', endTime: '2026-11-10T19:00:00Z', civilStartTime: { date: { year: 2026, month: 11, day: 10 } } } } },
  ];
  const out = H.mapExercise(pts)['2026-11-10'];
  assert.equal(out.cardioMin, 30);
  assert.equal(out.sessions.length, 2);
  assert.equal(out.sessions[0].kcal, 140);
});

test('merge never overwrites what you typed yourself', () => {
  const days = { '2026-11-10': { weight: 67, steps: 5000, stepsSrc: 'manual', cardioMin: 20, cardioSrc: 'manual' }, '2026-11-09': { weight: 66.8, weightSrc: 'fitbit' } };
  const ch = H.mergeIntoDays(days, {
    steps: { '2026-11-10': 9000, '2026-11-09': 8000 }, weight: { '2026-11-10': 67.3, '2026-11-09': 66.6 },
    exercise: { '2026-11-10': { cardioMin: 30, sessions: [{ type: 'WALKING', min: 30 }] } }, rhr: { '2026-11-10': 58 },
  });
  assert.equal(ch['2026-11-10'].steps, 5000);
  assert.equal(ch['2026-11-10'].weight, 67);
  assert.equal(ch['2026-11-10'].cardioMin, 20);
  assert.equal(ch['2026-11-10'].rhr, 58);
  assert.equal(ch['2026-11-09'].steps, 8000);
  assert.equal(ch['2026-11-09'].weight, 66.6);
  // nothing new → no change
  assert.deepEqual(H.mergeIntoDays({ '2026-11-09': { steps: 8000, stepsSrc: 'fitbit' } }, { steps: { '2026-11-09': 8000 } }), {});
});
