// Builds the app into dist/:
//   dist/index.html     standalone page (GitHub Pages, any static host, or open locally via a server)
//   dist/artifact.html  the same app as a Claude artifact page body
//   dist/data/, dist/media/  food table and exercise photos, served next to the page
//
//   npm run build          one build
//   npm run dev            rebuild on change and serve http://localhost:4173
import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
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

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const a = path.join(src, e.name), b = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(a, b);
    else if (!e.name.endsWith('.js')) fs.copyFileSync(a, b);
  }
}

async function build() {
  const t0 = Date.now();
  const out = await esbuild.build({
    entryPoints: [path.join(app, 'main.js')], bundle: true, format: 'iife', minify: true, target: ['es2020', 'safari15'],
    write: false, legalComments: 'none', jsx: 'preserve',
  });
  const js = out.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  const css = (await esbuild.transform(fs.readFileSync(path.join(app, 'styles.css'), 'utf8'), { loader: 'css', minify: true })).code;
  fs.mkdirSync(dist, { recursive: true });
  const body = `<div id="root"></div>\n<script>${js}</script>`;
  fs.writeFileSync(path.join(dist, 'index.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#f3f3ef" media="(prefers-color-scheme: light)"><meta name="theme-color" content="#101113" media="(prefers-color-scheme: dark)">
<meta name="apple-mobile-web-app-capable" content="yes">
${HEAD}
<style>${css}</style></head><body>
${body}
</body></html>`);
  fs.writeFileSync(path.join(dist, 'artifact.html'), `${HEAD}
<meta name="claude:viewport-fit-sides" content="cover">
<style>${css}</style>
${body}
`);
  copyDir(path.join(app, 'data'), path.join(dist, 'data'));
  copyDir(path.join(app, 'media'), path.join(dist, 'media'));
  console.log(`built dist/ in ${Date.now() - t0} ms · page ${(fs.statSync(path.join(dist, 'index.html')).size / 1024).toFixed(0)} KB`);
}

await build();

if (watch) {
  let timer;
  fs.watch(app, { recursive: true }, () => { clearTimeout(timer); timer = setTimeout(() => build().catch((e) => console.error(e.message)), 120); });
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.css': 'text/css' };
  http.createServer((req, res) => {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const f = path.join(dist, p === '/' ? 'index.html' : p);
    if (!f.startsWith(dist) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(f).pipe(res);
  }).listen(4173, () => console.log('serving http://localhost:4173'));
}
