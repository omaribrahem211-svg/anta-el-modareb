// Run after npm run build: node scripts/verify-coach-card-rendering.mjs
// Test environment needs puppeteer-core and Chrome. No app dependency added.
import puppeteer from 'puppeteer-core';
import { build } from 'esbuild';
import fs from 'node:fs';
import http from 'node:http';
const out = '/tmp/coach-card-check';
fs.mkdirSync(out, { recursive: true });
await build({ entryPoints: ['scripts/fixtures/coach-card-rendering.tsx'], outfile: out + '/card.js', bundle: true, format: 'esm' });
const css = fs.readdirSync('dist/assets').find(n => n.endsWith('.css'));
fs.copyFileSync('dist/assets/' + css, out + '/style.css');
const server = http.createServer((req, res) => {
  if (req.url.startsWith('/card.js')) { res.setHeader('Content-Type', 'application/javascript'); res.end(fs.readFileSync(out + '/card.js')); }
  else if (req.url.startsWith('/style.css')) { res.setHeader('Content-Type', 'text/css'); res.end(fs.readFileSync(out + '/style.css')); }
  else res.end('<html dir="rtl"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body style="background:#020617"><div id="root"></div><script type="module" src="/card.js"></script></body></html>');
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_BIN || '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const results = [];
try {
  for (const premium of [false, true]) for (const width of [320, 390]) for (const long of [false, true]) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.setViewport({ width, height: 1000, deviceScaleFactor: 1 });
    await page.goto(`http://127.0.0.1:${server.address().port}/?premium=${premium ? 1 : 0}&long=${long ? 1 : ''}`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#official_coach_card');
    const layout = await page.evaluate(() => {
      const card = document.querySelector('#official_coach_card');
      const name = card.querySelector('[data-coach-name]');
      const badge = card.querySelector('[data-coach-status]');
      const club = card.querySelector('[data-coach-club]');
      const cr = card.getBoundingClientRect(), nr = name.getBoundingClientRect(), br = badge.getBoundingClientRect();
      return { status: badge.dataset.coachStatus, label: badge.textContent, badgeInside: br.left >= cr.left && br.right <= cr.right, separated: br.top >= nr.bottom, nameFull: name.scrollWidth <= name.clientWidth, clubFull: club.scrollWidth <= club.clientWidth, clubText: club.textContent, noOverflow: card.scrollWidth <= card.clientWidth };
    });
    if (layout.status !== (premium ? 'premium' : 'regular') || !layout.label.includes(premium ? 'مدرب مميز' : 'مدرب عادي') || !layout.badgeInside || !layout.separated || !layout.nameFull || !layout.clubFull || !layout.noOverflow || errors.length) throw new Error(JSON.stringify({ width, premium, long, layout, errors }));
    if (width === 390 && !long) await page.screenshot({ path: out + `/card-${premium ? 'premium' : 'regular'}.png`, fullPage: true });
    results.push({ width, premium, long, ...layout });
    await page.close();
  }
  fs.writeFileSync(out + '/results.json', JSON.stringify(results, null, 2));
  console.log('ALL 8 RTL CARD CHECKS PASSED: regular/premium, 320/390px, normal/long names. ' + out);
} finally { await browser.close(); server.close(); }
