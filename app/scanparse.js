// Reading the numbers out of a body-composition report's text (Evolt 360,
// InBody, Tanita, DEXA and similar). Pure; tested in tests/scanparse.test.mjs.
//
// Reports lay numbers out differently: "Body Fat Mass 14.2 kg" on one line,
// or a big "14.2" above a small "Body Fat Mass" label. So for each metric we
// look right after the label, then on the line below, then the line above,
// and only accept values in a plausible range. Missing values are derived
// where the maths allows, and the set is cross-checked before it's trusted.

const LB = 0.45359237;

// [key, label patterns, unit kind, plausible range]
const METRICS = [
  ['weightKg', [/\b(?:body\s*)?weight\b(?!\s*(?:control|goal|target|change))/i, /\bbody\s*mass\b(?!\s*index)/i], 'mass', [30, 300]],
  ['bf', [/\b(?:percent(?:age)?\s*(?:of\s*)?body\s*fat|body\s*fat\s*(?:percent(?:age)?|%)|PBF|fat\s*%|%\s*body\s*fat|total\s*body\s*fat\s*%?)\b/i, /\bbody\s*fat\b(?!\s*mass)/i], 'pct', [3, 70]],
  ['fatKg', [/\b(?:body\s*)?fat\s*mass\b(?!\s*index)/i, /\btotal\s*(?:body\s*)?fat\s*(?:mass)?\s*\((?:kg|lbs?)\)/i], 'mass', [1, 200]],
  ['leanKg', [/\blean\s*body\s*mass\b/i, /\bfat[\s-]*free\s*mass\b/i, /\blean\s*(?:soft\s*tissue\s*)?mass\b/i, /\bLBM\b/, /\bFFM\b/], 'mass', [20, 160]],
  ['smmKg', [/\bskeletal\s*muscle\s*mass\b/i, /\bSMM\b/], 'mass', [10, 90]],
  ['visceral', [/\bvisceral\s*fat(?:\s*(?:level|rating|score|area|mass))?\b/i, /\bVFL\b/], 'any', [0.5, 300]],
  ['bmr', [/\b(?:BMR|basal\s*metabolic\s*rate|resting\s*metabolic\s*rate)\b/i], 'kcal', [700, 4500]],
  ['tbwKg', [/\btotal\s*body\s*water\b/i, /\bTBW\b/], 'mass', [15, 100]],
];

const NUM = String.raw`(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d{1,4}(?:[.,]\d{1,2})?)`;
const UNIT = String.raw`\s*(kg|kgs|lbs?|%|kcal|cal|cm2|cm²|level)?`;

function toNumber(s) { const t = String(s); return /^\d{1,3}(?:,\d{3})+/.test(t) ? parseFloat(t.replace(/,/g, '')) : parseFloat(t.replace(',', '.')); }

function convert(v, unit, kind, lbDefault) {
  const u = (unit || '').toLowerCase();
  if (kind === 'mass') return u.startsWith('lb') || (!u && lbDefault) ? v * LB : v;
  return v;
}

const VALUE_LINE = new RegExp(String.raw`^[<>~]?\s*` + NUM + UNIT + String.raw`\s*$`, 'i');

// Find the first plausible number for a label: same line after the label,
// then the line where this report puts values (above or below the label).
function findValue(lines, pats, kind, [lo, hi], lbDefault, above) {
  for (const pat of pats) {
    for (let i = 0; i < lines.length; i++) {
      const m = pat.exec(lines[i]);
      if (!m) continue;
      const after = lines[i].slice(m.index + m[0].length);
      const tries = above ? [after, lines[i - 1] || '', lines[i + 1] || ''] : [after, lines[i + 1] || '', lines[i - 1] || ''];
      for (const t of tries) {
        const re = new RegExp(NUM + UNIT, 'gi');
        let mm;
        while ((mm = re.exec(t))) {
          const unit = mm[2] || '';
          if (kind === 'pct' && unit && unit !== '%') continue;
          if (kind === 'mass' && unit && !/^(kg|kgs|lbs?)$/i.test(unit)) continue;
          if (kind === 'kcal' && unit && !/^(kcal|cal)$/i.test(unit)) continue;
          const v = convert(toNumber(mm[1]), unit, kind, lbDefault);
          if (v >= lo && v <= hi) return { v, unit };
        }
      }
    }
  }
  return null;
}

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const pad = (n) => String(n).padStart(2, '0');
// Day-first unless the numbers only make sense month-first (Evolt is used in AU/NZ/UK).
function findDate(text, dayFirst = true) {
  const ok = (y, m, d) => y >= 2010 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31;
  let m = /\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/.exec(text);
  if (m && ok(+m[1], +m[2], +m[3])) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  m = /\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?,?\s+(20\d{2})\b/i.exec(text);
  if (m) return `${m[3]}-${pad(MONTHS[m[2].toLowerCase()])}-${pad(m[1])}`;
  m = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2}),?\s+(20\d{2})\b/i.exec(text);
  if (m) return `${m[3]}-${pad(MONTHS[m[1].toLowerCase()])}-${pad(m[2])}`;
  m = /\b(\d{1,2})[/.](\d{1,2})[/.](20\d{2})\b/.exec(text);
  if (m) {
    let [d, mo] = dayFirst ? [+m[1], +m[2]] : [+m[2], +m[1]];
    if (mo > 12 && d <= 12) [d, mo] = [mo, d];
    if (ok(+m[3], mo, d)) return `${m[3]}-${pad(mo)}-${pad(d)}`;
  }
  return '';
}

function detectDevice(text) {
  if (/evolt/i.test(text)) return 'Evolt 360';
  if (/inbody/i.test(text)) return 'InBody';
  if (/\b(?:dexa|dxa)\b|hologic|lunar/i.test(text)) return 'DEXA';
  if (/tanita/i.test(text)) return 'Tanita';
  if (/withings/i.test(text)) return 'Withings';
  if (/styku|fit3d/i.test(text)) return '3D scan';
  return '';
}

export function parseScanText(raw, { dayFirst = true } = {}) {
  const text = String(raw || '').replace(/ /g, ' ');
  const lines = text.split(/\r?\n/).map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const lbDefault = /\blbs?\b/i.test(text) && !/\bkg\b/i.test(text);
  const out = { device: detectDevice(text), date: findDate(text, dayFirst) };
  // Does this report print values above their labels (cards) or beside or
  // below them? Decided from the first label found.
  const isLabel = (l) => METRICS.some(([, pats]) => pats.some((p) => p.test(l || '')));
  const isValue = (l) => VALUE_LINE.test(l || '');
  let above = false;
  const first = lines.findIndex(isLabel);
  if (first >= 0) {
    const m = METRICS.flatMap(([, pats]) => pats).map((p) => p.exec(lines[first])).find(Boolean);
    const beside = /\d/.test(lines[first].slice(m.index + m[0].length));
    above = !beside && isValue(lines[first - 1]) && (!isValue(lines[first + 1]) || !isLabel(lines[first - 2]));
  }
  for (const [key, pats, kind, range] of METRICS) {
    const r = findValue(lines, pats, kind, range, lbDefault, above);
    out[key] = r ? Math.round(r.v * 10) / 10 : null;
    if (key === 'visceral' && r) out.visceralUnit = /cm/.test(r.unit || '') ? 'cm²' : 'level';
  }
  // Derive what's missing.
  const derived = [];
  if (out.weightKg && out.fatKg && !out.bf) { out.bf = Math.round((out.fatKg / out.weightKg) * 1000) / 10; derived.push('bf'); }
  if (out.weightKg && out.bf && !out.fatKg) { out.fatKg = Math.round(out.weightKg * out.bf) / 100; derived.push('fatKg'); }
  if (out.weightKg && out.fatKg && !out.leanKg) { out.leanKg = Math.round((out.weightKg - out.fatKg) * 10) / 10; derived.push('leanKg'); }
  if (out.weightKg && out.leanKg && !out.bf) { out.bf = Math.round((1 - out.leanKg / out.weightKg) * 1000) / 10; derived.push('bf'); }
  // Cross-checks: fat + lean ≈ weight, and fat ≈ weight × bf%.
  const issues = [];
  if (out.weightKg && out.fatKg && out.leanKg && Math.abs(out.fatKg + out.leanKg - out.weightKg) > Math.max(1.5, out.weightKg * 0.03)) issues.push('fat + lean ≠ weight');
  if (out.weightKg && out.bf && out.fatKg && Math.abs((out.weightKg * out.bf) / 100 - out.fatKg) > 1.5) issues.push('fat % ≠ fat mass');
  if (out.leanKg && out.smmKg && out.smmKg > out.leanKg) issues.push('muscle > lean mass');
  const core = !!(out.bf || out.leanKg);
  out.derived = derived;
  out.issues = issues;
  out.confidence = !core ? 'none' : issues.length ? 'low' : out.weightKg && out.bf && (out.fatKg || out.leanKg) ? 'high' : 'medium';
  return out;
}
