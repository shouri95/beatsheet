// Reading a body-scan PDF on the phone (pdf.js), loaded on demand. Most scan
// apps (Evolt Active, InBody, DEXA clinics) export PDFs with real text, so
// the numbers can be read without any AI or network.
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { parseScanText } from './scanparse.js';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('assets/pdf.worker.min.mjs', document.baseURI).href;

async function open(file) {
  const data = new Uint8Array(await file.arrayBuffer());
  return pdfjs.getDocument({ data, isEvalSupported: false, disableFontFace: true }).promise;
}

// Two readings of each page: items in the order the PDF draws them (keeps a
// card's number next to its label), and items grouped into visual lines.
async function readings(doc, maxPages = 6) {
  const stream = [], rows = [];
  for (let n = 1; n <= Math.min(doc.numPages, maxPages); n++) {
    const page = await doc.getPage(n);
    const tc = await page.getTextContent();
    const items = tc.items.filter((i) => i.str && i.str.trim()).map((i) => ({ s: i.str.trim(), x: i.transform[4], y: i.transform[5], h: Math.abs(i.transform[3]) || i.height || 10, eol: i.hasEOL }));
    // Stream order; join pieces that sit on the same baseline next to each other.
    let line = '', prev = null;
    for (const it of items) {
      if (prev && Math.abs(prev.y - it.y) < Math.max(2, Math.min(prev.h, it.h) * 0.4) && !prev.eol) line += ' ' + it.s;
      else { if (line) stream.push(line); line = it.s; }
      prev = it;
    }
    if (line) stream.push(line);
    // Visual lines, top to bottom, left to right.
    const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
    const lines = [];
    for (const it of sorted) {
      const last = lines[lines.length - 1];
      if (last && Math.abs(last.y - it.y) <= Math.max(2, Math.min(last.h, it.h) * 0.5)) last.items.push(it);
      else lines.push({ y: it.y, h: it.h, items: [it] });
    }
    for (const l of lines) rows.push(l.items.sort((a, b) => a.x - b.x).map((i) => i.s).join(' '));
  }
  return [stream.join('\n'), rows.join('\n')];
}

const RANK = { high: 3, medium: 2, low: 1, none: 0 };
const filled = (r) => ['weightKg', 'bf', 'fatKg', 'leanKg', 'smmKg', 'visceral', 'bmr'].filter((k) => r[k] != null).length;

export async function readScanPdf(file) {
  const doc = await open(file);
  const [a, b] = await readings(doc);
  const ra = parseScanText(a), rb = parseScanText(b);
  const best = RANK[ra.confidence] !== RANK[rb.confidence] ? (RANK[ra.confidence] > RANK[rb.confidence] ? ra : rb) : filled(ra) >= filled(rb) ? ra : rb;
  return { ...best, pages: doc.numPages, hasText: (a + b).replace(/\s/g, '').length > 40 };
}

// First pages as JPEG images, for photo-style reading when a PDF has no text.
export async function pdfToImages(file, maxPages = 2) {
  const doc = await open(file);
  const out = [];
  for (let n = 1; n <= Math.min(doc.numPages, maxPages); n++) {
    const page = await doc.getPage(n);
    const vp = page.getViewport({ scale: Math.min(2, 1600 / page.getViewport({ scale: 1 }).width) });
    const cv = document.createElement('canvas');
    cv.width = Math.round(vp.width); cv.height = Math.round(vp.height);
    await page.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
    out.push(await new Promise((res) => cv.toBlob(res, 'image/jpeg', 0.85)));
  }
  return out;
}
