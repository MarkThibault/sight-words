// Offline play and updates with a real service worker (sw.js and js/offline.js), as an installed app gets them.
// Offline play is off on localhost, so each test runs its own server at 127.0.0.1. The server can switch to the
// next version: the same files with the version raised, as .github/scripts/bump-version.sh does on every merge.
'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const { test, expect, WORDS, openApp, savedProgress, starred } = require('./helpers');

const ROOT = path.join(__dirname, '..');
const OLD = fs.readFileSync(path.join(ROOT, 'js', 'config.js'), 'utf8').match(/^const APP_VERSION = '([\d.]+)'/m)[1];
const NEW = OLD.replace(/\d+$/, (patch) => Number(patch) + 1);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.wav': 'audio/wav', '.svg': 'image/svg+xml' };

// The version bump's changes, made as each file is served.
const bumped = (text) => text.replaceAll(`?v=${OLD}`, `?v=${NEW}`)
  .replace(`const APP_VERSION = '${OLD}'`, `const APP_VERSION = '${NEW}'`)
  .replace(`const SW_VERSION = '${OLD}'`, `const SW_VERSION = '${NEW}'`);

async function startServer() {
  const server = http.createServer((req, res) => {
    const { pathname } = new URL(req.url, 'http://127.0.0.1');
    const file = path.join(ROOT, decodeURIComponent(pathname), pathname.endsWith('/') ? 'index.html' : '');
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404);
      res.end();
      return;
    }
    let body = fs.readFileSync(file);
    if (server.version === NEW && /\.(html|js)$/.test(file)) body = bumped(body.toString());
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(body);
  });
  server.version = OLD;
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return server;
}

let server;
test.beforeEach(async () => { server = await startServer(); });
test.afterEach(() => new Promise((resolve) => server.close(resolve)));

const progress = { words: starred(WORDS.slice(0, 3)), medals: 4 };

// Opens the app from the test server and waits until offline play has saved it and taken charge of the page.
async function installApp(page) {
  await openApp(page, { progress, url: `http://127.0.0.1:${server.address().port}/` });
  await page.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 30_000 });
  await expect(page.locator('#app-version')).toHaveText(`v${OLD}`);
}

test('with no connection, the installed app still opens and plays its recordings', async ({ page, context }) => {
  await installApp(page);
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#start-btn')).toBeEnabled();

  await page.locator('#start-btn').click();
  await expect(page.locator('#progress-mini')).toHaveText(`⭐ 3 / ${WORDS.length}`); // the saved stars
  const word = await page.evaluate(() => readingRound.word);
  const clipSaved = await page.evaluate((w) => fetch(`${wordClip(w)}?v=${APP_VERSION}`).then((r) => r.ok), word); // as loadClip asks
  expect(clipSaved).toBe(true);
});

test('a new version downloads in the background, the Update button installs it, and progress stays', async ({ page }) => {
  await installApp(page);

  // A merge publishes the next version. The home screen checks for it each time it appears (no more than once a
  // minute, so the test skips the wait).
  server.version = NEW;
  await page.evaluate(() => { lastUpdateCheck = 0; });
  await page.locator('#start-btn').click();
  await page.locator('#home-btn').click();

  await expect(page.locator('#update-btn')).toBeVisible({ timeout: 30_000 });
  const before = await savedProgress(page);
  await page.locator('#update-btn').click();
  await expect(page.locator('#app-version')).toHaveText(`v${NEW}`, { timeout: 15_000 });
  expect(await page.evaluate(() => APP_VERSION)).toBe(NEW);
  expect(await savedProgress(page)).toEqual(before);
  // Only the new version's saved copy is kept (and the font's)
  expect((await page.evaluate(() => caches.keys())).sort()).toEqual([`sight-words-${NEW}`, 'sight-words-fonts'].sort());
});

test('a new version that finished downloading installs by itself when the app is next opened', async ({ page, context }) => {
  await installApp(page);
  server.version = NEW;
  await page.evaluate(() => { lastUpdateCheck = 0; });
  await page.locator('#start-btn').click();
  await page.locator('#home-btn').click();
  await expect(page.locator('#update-btn')).toBeVisible({ timeout: 30_000 });

  // Closed without tapping Update, then opened again
  const url = page.url();
  const reopened = await context.newPage();
  const errors = [];
  reopened.on('pageerror', (err) => errors.push(err.message));
  reopened.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.close();
  await reopened.goto(url, { waitUntil: 'domcontentloaded' });
  await expect(reopened.locator('#app-version')).toHaveText(`v${NEW}`, { timeout: 15_000 });
  expect(await savedProgress(reopened)).toEqual(expect.objectContaining({ medals: 4 }));
  expect(errors, 'script errors on the reopened page').toEqual([]);
});
