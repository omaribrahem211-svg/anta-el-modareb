// Run after npm run build: node scripts/verify-match-rendering.mjs
// Requires puppeteer-core available in the environment and a local Chrome binary.
import puppeteer from 'puppeteer-core';
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import http from 'node:http';
const repo = process.cwd();
const out = process.env.PERF_OUT || '/tmp/match-rendering-check';
const site = path.join(out, 'site');
fs.mkdirSync(site, { recursive: true });
const css = fs.readdirSync(path.join(repo, 'dist/assets')).find(f => f.endsWith('.css'));
if (!css) throw new Error('Run npm run build first');
fs.copyFileSync(path.join(repo, 'dist/assets', css), path.join(site, 'style.css'));
for (const kind of ['baseline', 'updated']) {
  await build({
    entryPoints: [path.join(repo, 'scripts/fixtures/match-rendering.tsx')],
    outfile: path.join(site, `${kind}.js`), bundle: true, minify: true, format: 'esm',
    plugins: kind === 'baseline' ? [{ name: 'baseline-pitch', setup(b) {
      b.onLoad({ filter: /OnlineMatchPitch3D\.tsx$/ }, () => ({ contents: execFileSync('git', ['show', '0b83804:src/components/pvp/OnlineMatchPitch3D.tsx'], { encoding: 'utf8' }), loader: 'tsx', resolveDir: path.join(repo, 'src/components/pvp') }));
    } }] : [],
  });
}
const server = http.createServer((req, res) => {
  const path = req.url?.split('?')[0];
  if (path === '/' || path === '/index.html') {
    const bundle = new URL(req.url || '/', 'http://localhost').searchParams.get('baseline') ? 'baseline' : 'updated';
    res.setHeader('Content-Type', 'text/html');
    res.end(`<html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body style="background:#020617;margin:0"><div id="root" style="max-width:430px;margin:auto;padding:8px"></div><script type="module" src="/${bundle}.js"></script></body></html>`);
    return;
  }
  if (!['/baseline.js', '/updated.js', '/style.css'].includes(path)) { res.writeHead(404).end(); return; }
  res.setHeader('Content-Type', path.endsWith('.css') ? 'text/css' : 'application/javascript');
  res.end(fs.readFileSync(site + path));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/`;
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_BIN || '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const results = {};
try {
  for (const kind of ['baseline', 'updated']) {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 1100, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(url + (kind === 'baseline' ? '?baseline=1' : ''), { waitUntil: 'networkidle0' });
    await page.waitForSelector('[aria-label*="رقم"]');
    const client = await page.createCDPSession();
    await client.send('Performance.enable');
    await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const before = (await client.send('Performance.getMetrics')).metrics;
    await new Promise(r => setTimeout(r, 6500));
    const after = (await client.send('Performance.getMetrics')).metrics;
    const diff = name => after.find(m => m.name === name).value - before.find(m => m.name === name).value;
    results[kind] = { layoutCount: diff('LayoutCount'), layoutDurationMs: diff('LayoutDuration') * 1000, recalcStyleMs: diff('RecalcStyleDuration') * 1000, taskDurationMs: diff('TaskDuration') * 1000, errors };
    await page.screenshot({ path: path.join(out, `${kind}-playing.png`), fullPage: true });
    if (kind === 'updated') {
      results[kind].discCount = await page.$$eval('[aria-label*="رقم"]', els => els.length);
      results[kind].transition = await page.$eval('[aria-label*="رقم"]', el => getComputedStyle(el).transitionProperty);
      await page.evaluate(() => window.setMatchMode('paused'));
      await new Promise(r => setTimeout(r, 1000));
      const pos = await page.$eval('[aria-label*="رقم"]', el => el.style.transform);
      await new Promise(r => setTimeout(r, 2600));
      results[kind].pausedStable = pos === await page.$eval('[aria-label*="رقم"]', el => el.style.transform);
      await page.evaluate(() => window.setMatchMode('halftime'));
      await new Promise(r => setTimeout(r, 350));
      await page.screenshot({ path: path.join(out, 'updated-halftime.png'), fullPage: true });
      const start = await page.$$('button');
      const startBtn = [];
      for (const b of start) if ((await b.evaluate(el => el.textContent)).includes('الشوط الثاني')) startBtn.push(b);
      if (startBtn[0]) await startBtn[0].click();
      await page.evaluate(() => window.setMatchMode('finished'));
      await new Promise(r => setTimeout(r, 350));
      await page.screenshot({ path: path.join(out, 'updated-finished.png'), fullPage: true });
      results[kind].finishPanel = await page.$eval('#live-stadium-component', el => el.textContent.includes('تأكيد'));
      results[kind].confirmCallback = await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find(b => b.textContent.includes('تأكيد النتيجة'));
        b?.click();
        return window.confirmed === true;
      });
      await page.evaluate(() => window.setMatchMode('playing'));
      await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'مائل')?.click());
      await new Promise(r => setTimeout(r, 2200));
      results[kind].isometricSpread = await page.$$eval('[aria-label*="رقم"]', els => { const ys = els.map(el => el.getBoundingClientRect().y); return Math.max(...ys) - Math.min(...ys); });
      await page.screenshot({ path: path.join(out, 'updated-isometric.png'), fullPage: true });
      await page.setViewport({ width: 430, height: 1100 });
      await new Promise(r => setTimeout(r, 300));
      results[kind].horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    }
    await page.close();
  }
  const p = await browser.newPage();
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto(url, { waitUntil: 'networkidle0' });
  await p.waitForSelector('[aria-label*="رقم"]');
  results.reducedMotionTransition = await p.$eval('[aria-label*="رقم"]', el => getComputedStyle(el).transitionProperty);
  console.log(JSON.stringify(results, null, 2));
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(results, null, 2));
  if (results.updated.errors.length || results.updated.discCount !== 22 || !results.updated.pausedStable || !results.updated.finishPanel || !results.updated.confirmCallback || results.updated.isometricSpread < 200 || results.updated.horizontalOverflow || results.updated.transition !== 'transform' || results.reducedMotionTransition !== 'none') throw new Error('Rendering regression');
  if (results.updated.layoutCount >= results.baseline.layoutCount) throw new Error('Expected layout-work reduction not observed');
  console.log('ALL CHECKS PASSED. Evidence: ' + out);
} finally { await browser.close(); server.close(); }
