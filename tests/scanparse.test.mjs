import test from 'node:test';
import assert from 'node:assert/strict';
import { parseScanText } from '../app/scanparse.js';
import { rfmBodyFat } from '../app/engine.js';

// Layout 1: label and value on one line (typical of exported tables).
const EVOLT_TABLE = `EVOLT 360 BODY SCAN REPORT
Scan Date: 05/11/2026 07:42
Weight 67.4 kg
Body Fat Mass 13.9 kg
Body Fat Percentage 20.6 %
Lean Body Mass 53.5 kg
Skeletal Muscle Mass 30.2 kg
Visceral Fat Level 6
Total Body Water 39.1 kg
BMR 1,612 kcal
BMI 22.8`;

// Layout 2: big numbers above small labels (infographic pages).
const EVOLT_CARDS = `Evolt Active
Your results 5 Nov 2026
67.4 kg
Weight
20.6 %
Body Fat
13.9 kg
Body Fat Mass
53.5 kg
Lean Body Mass
30.2 kg
Skeletal Muscle Mass
6
Visceral Fat`;

const INBODY = `InBody 570  Test Date / Time 2026.10.02
Weight 85.2 lbs?`; // nonsense on purpose: lb with no kg value present nearby

const DEXA = `Hologic DXA Total Body Composition
Scan date: Oct 3, 2026
Total Mass (kg) 82.1
Fat Mass (kg) 19.6
Lean + BMC Fat-Free Mass 62.5 kg
Total Body Fat % 23.9`;

test('Evolt table layout', () => {
  const r = parseScanText(EVOLT_TABLE);
  assert.equal(r.device, 'Evolt 360');
  assert.equal(r.date, '2026-11-05');
  assert.deepEqual([r.weightKg, r.fatKg, r.bf, r.leanKg, r.smmKg, r.visceral, r.tbwKg, r.bmr], [67.4, 13.9, 20.6, 53.5, 30.2, 6, 39.1, 1612]);
  assert.equal(r.confidence, 'high');
});

test('Evolt card layout: numbers above labels', () => {
  const r = parseScanText(EVOLT_CARDS);
  assert.equal(r.device, 'Evolt 360');
  assert.equal(r.date, '2026-11-05');
  assert.equal(r.weightKg, 67.4);
  assert.equal(r.bf, 20.6);
  assert.equal(r.fatKg, 13.9);
  assert.equal(r.leanKg, 53.5);
  assert.equal(r.smmKg, 30.2);
  assert.equal(r.visceral, 6);
  assert.equal(r.confidence, 'high');
});

test('DEXA wording, US date, derived values', () => {
  const r = parseScanText(DEXA);
  assert.equal(r.device, 'DEXA');
  assert.equal(r.date, '2026-10-03');
  assert.equal(r.fatKg, 19.6);
  assert.equal(r.leanKg, 62.5);
  assert.equal(r.bf, 23.9);
});

test('only weight and fat mass: percentage and lean derived', () => {
  const r = parseScanText('Weight 80 kg\nFat Mass 20 kg');
  assert.equal(r.bf, 25);
  assert.equal(r.leanKg, 60);
  assert.deepEqual(r.derived, ['bf', 'leanKg']);
});

test('inconsistent numbers lower confidence', () => {
  const r = parseScanText('Weight 80 kg\nBody Fat Mass 20 kg\nLean Body Mass 70 kg\nBody Fat % 25');
  assert.equal(r.confidence, 'low');
  assert.ok(r.issues.length);
});

test('nothing recognisable', () => {
  assert.equal(parseScanText(INBODY).confidence, 'none');
  assert.equal(parseScanText('').confidence, 'none');
});

test('waist-only body fat (RFM)', () => {
  // 172 cm man, 84 cm waist → 64 − 20 × 2.048 ≈ 23.0 %
  assert.ok(Math.abs(rfmBodyFat({ sex: 'm', heightCm: 172, waistCm: 84 }) - 23.0) < 0.1);
  assert.ok(Math.abs(rfmBodyFat({ sex: 'f', heightCm: 165, waistCm: 75 }) - 32.0) < 0.1);
  assert.equal(rfmBodyFat({ sex: 'm', heightCm: 172, waistCm: 0 }), null);
});
