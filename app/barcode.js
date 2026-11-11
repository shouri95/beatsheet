// Barcode decoding for food packaging (EAN-13, EAN-8, UPC-A, UPC-E).
// Loaded on demand. Uses the browser's BarcodeDetector where it exists
// (Android Chrome) and the ZXing decoder elsewhere (iPhone Safari).
import { MultiFormatReader, BinaryBitmap, HybridBinarizer, RGBLuminanceSource, DecodeHintType, BarcodeFormat } from '@zxing/library';

const RETAIL = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];

export async function createDecoder() {
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      const supported = await window.BarcodeDetector.getSupportedFormats();
      const formats = RETAIL.filter((f) => supported.includes(f));
      if (formats.length) {
        const det = new window.BarcodeDetector({ formats });
        return { native: true, async decode(source) { const r = await det.detect(source); return r[0]?.rawValue || null; } };
      }
    } catch { /* fall through to ZXing */ }
  }
  const reader = new MultiFormatReader();
  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E]);
  hints.set(DecodeHintType.TRY_HARDER, true);
  reader.setHints(hints);
  return {
    native: false,
    // source: a canvas holding the current frame
    async decode(canvas) {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const { width, height } = canvas;
      const rgba = ctx.getImageData(0, 0, width, height).data;
      const lum = new Uint8ClampedArray(width * height);
      for (let i = 0, j = 0; j < lum.length; i += 4, j++) lum[j] = (rgba[i] * 77 + rgba[i + 1] * 150 + rgba[i + 2] * 29) >> 8;
      try {
        return reader.decodeWithState(new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(lum, width, height)))).getText();
      } catch { return null; }
    },
  };
}

// Check digit validation so a misread never looks up the wrong product.
export function validBarcode(code) {
  const d = String(code).replace(/\D/g, '');
  if (![8, 12, 13].includes(d.length)) return false;
  const digits = d.split('').map(Number);
  const check = digits.pop();
  let sum = 0;
  digits.reverse().forEach((x, i) => { sum += x * (i % 2 === 0 ? 3 : 1); });
  return (10 - (sum % 10)) % 10 === check;
}
