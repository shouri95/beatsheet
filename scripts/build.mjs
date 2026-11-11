// Builds the app into dist/:
//   dist/index.html        the installable app (GitHub Pages or any static host)
//   dist/assets/           its JavaScript, split so the barcode decoder and the
//                          Anthropic SDK load only when used
//   dist/sw.js             offline support
//   dist/manifest.webmanifest, dist/icons/
//   dist/artifact.html     the same app as a Claude artifact page body (one
//                          file, without the web-only features)
//   dist/data/, dist/media/  food table and exercise photos, shared by both
//
//   npm run build          one build
//   npm run dev            rebuild on change and serve http://localhost:4173
import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const app = path.join(root, 'app');
const dist = path.join(root, 'dist');
const watch = process.argv.includes('--watch');

const FONTS = 'https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@600;700;800;900&family=Instrument+Sans:wght@400;500;600;700&display=swap';
const HEAD = `<title>Plates</title>
<meta name="description" content="Food tracking, a strength program and a coach that adjusts your plan every week.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">`;

function copyDir(src, dst, skip = (n) => n.endsWith('.js')) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const a = path.join(src, e.name), b = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(a, b, skip);
    else if (!skip(e.name)) fs.copyFileSync(a, b);
  }
}
const list = (dir, base = dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? list(path.join(dir, e.name), base) : [path.relative(base, path.join(dir, e.name))]));

async function build() {
  const t0 = Date.now();
  fs.rmSync(dist, { recursive: true, force: true });
  fs.mkdirSync(dist, { recursive: true });
  const css = (await esbuild.transform(fs.readFileSync(path.join(app, 'styles.css'), 'utf8'), { loader: 'css', minify: true })).code;
  const common = { bundle: true, minify: true, target: ['es2020', 'safari15'], legalComments: 'none' };

  // 1. The installable app: ES modules with code splitting.
  const web = await esbuild.build({
    ...common, entryPoints: { app: path.join(app, 'main.js') }, format: 'esm', splitting: true,
    outdir: path.join(dist, 'assets'), entryNames: '[name]-[hash]', chunkNames: 'c-[hash]', metafile: true,
    define: { __WEB__: 'true' },
  });
  const entry = Object.entries(web.metafile.outputs).find(([, o]) => o.entryPoint)[0];
  const entryUrl = path.relative(dist, path.join(root, entry)).split(path.sep).join('/');
  fs.writeFileSync(path.join(dist, 'index.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#f3f3ef" media="(prefers-color-scheme: light)"><meta name="theme-color" content="#101113" media="(prefers-color-scheme: dark)">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default"><meta name="apple-mobile-web-app-title" content="Plates">
<link rel="manifest" href="manifest.webmanifest"><link rel="apple-touch-icon" href="icons/apple-touch-icon.png"><link rel="icon" type="image/png" href="icons/favicon-32.png">
${HEAD}
<style>${css}</style></head><body>
<div id="root"></div>
<script type="module" src="${entryUrl}"></script>
</body></html>`);
  fs.copyFileSync(path.join(app, 'manifest.webmanifest'), path.join(dist, 'manifest.webmanifest'));
  copyDir(path.join(app, 'icons'), path.join(dist, 'icons'), () => false);
  copyDir(path.join(app, 'data'), path.join(dist, 'data'));
  copyDir(path.join(app, 'media'), path.join(dist, 'media'));

  // 2. The artifact: one IIFE inlined in the page, web-only code removed.
  // Modules that only work outside Claude are replaced with empty stubs.
  const webOnly = { name: 'web-only', setup(b) {
    b.onResolve({ filter: /(^|\/)(ai-api|barcode)\.js$/ }, (a) => ({ path: a.path, namespace: 'stub' }));
    b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'export {};', loader: 'js' }));
  } };
  const art = await esbuild.build({ ...common, entryPoints: [path.join(app, 'main.js')], format: 'iife', write: false, define: { __WEB__: 'false' }, plugins: [webOnly] });
  const js = art.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  fs.writeFileSync(path.join(dist, 'artifact.html'), `${HEAD}
<meta name="claude:viewport-fit-sides" content="cover">
<style>${css}</style>
<div id="root"></div>
<script>${js}</script>
`);

  // 3. Service worker: precache the app shell, the food table and the icons.
  const shell = ['./', 'index.html', 'manifest.webmanifest', 'data/foods.json',
    ...list(path.join(dist, 'assets')).map((f) => `assets/${f}`), ...list(path.join(dist, 'icons')).map((f) => `icons/${f}`)];
  const hash = crypto.createHash('sha256');
  for (const f of shell.filter((x) => x !== './')) hash.update(fs.readFileSync(path.join(dist, f)));
  const version = hash.digest('hex').slice(0, 12);
  fs.writeFileSync(path.join(dist, 'sw.js'), fs.readFileSync(path.join(app, 'sw.template.js'), 'utf8')
    .replace('__VERSION__', version).replace('__SHELL__', JSON.stringify(shell)));

  const kb = (f) => (fs.statSync(f).size / 1024).toFixed(0);
  const chunks = list(path.join(dist, 'assets')).map((f) => `${f} ${kb(path.join(dist, 'assets', f))} KB`).join(', ');
  console.log(`built dist/ in ${Date.now() - t0} ms · ${chunks} · artifact ${kb(path.join(dist, 'artifact.html'))} KB · sw ${version}`);
}

await build();

if (watch) {
  let timer;
  fs.watch(app, { recursive: true }, () => { clearTimeout(timer); timer = setTimeout(() => build().catch((e) => console.error(e.message)), 150); });
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.css': 'text/css', '.webmanifest': 'application/manifest+json' };
  http.createServer((req, res) => {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const f = path.join(dist, p === '/' ? 'index.html' : p);
    if (!f.startsWith(dist) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(f).pipe(res);
  }).listen(4173, () => console.log('serving http://localhost:4173'));
}
