// Shared by the browser tests: a fresh app with chosen saved progress, failing on any script error.
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const base = require('@playwright/test');

const ROOT = path.join(__dirname, '..');

// Every test fails if the page has a script error or logs one (a missing file shows up here too).
const test = base.test.extend({
  page: async ({ page }, use) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
    await use(page);
    base.expect(errors, 'script errors on the page').toEqual([]);
  },
});

// Opens the app with this saved data, as if it had been played on this device before. Each test starts from a
// fresh browser, so nothing carries over between tests. The grown-up tip is marked as seen, so it stays out of the way.
// `progress` is saved progress in the shape described at the top of js/progress.js.
async function openApp(page, { progress, offWords, stickerSpots, stickerSeed } = {}) {
  const saved = {
    'sightWords.grownupTipSeen.v1': '1',
    'sightWords.progress.v1': progress && JSON.stringify(progress),
    'sightWords.offWords.v1': offWords && JSON.stringify(offWords),
    'sightWords.stickerSpots.v1': stickerSpots && JSON.stringify(stickerSpots),
    'sightWords.stickerSeed.v1': stickerSeed && String(stickerSeed),
  };
  await page.addInitScript((data) => {
    if (sessionStorage.getItem('test.seeded')) return; // only before the first load, not after a reload
    sessionStorage.setItem('test.seeded', '1');
    for (const [key, value] of Object.entries(data)) if (value) localStorage.setItem(key, value);
  }, saved);
  await page.goto('/');
  await base.expect(page.locator('#start-btn')).toBeEnabled();
}

const savedProgress = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('sightWords.progress.v1')));
const savedItem = (page, key) => page.evaluate((k) => localStorage.getItem(k), key);

// The app's own word list and sticker sets, read from its files, so the tests follow any change to them.
const WORDS = JSON.parse(fs.readFileSync(path.join(ROOT, 'words.json'), 'utf8'));
const { STICKER_SETS, SET_SIZE, STICKER_EMOJI, MEDALS_PER_TROPHY } = vm.runInNewContext(
  `${fs.readFileSync(path.join(ROOT, 'js', 'config.js'), 'utf8')};({ STICKER_SETS, SET_SIZE, STICKER_EMOJI, MEDALS_PER_TROPHY })`);

// Saved word progress with a star on each of these words, earned one after another in this order.
// `more(word, i)` adds to a word's entry, such as its sticker.
function starred(words, more = () => ({})) {
  return Object.fromEntries(words.map((word, i) =>
    [word, { heard: 1, known: true, knownAt: 1_700_000_000_000 + i * 1000, lastSeen: null, ...more(word, i) }]));
}

// The ⚙️ button opens the Grown-up corner after a press and hold.
async function openGrownupCorner(page) {
  const box = await page.locator('#settings-btn').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(1000);
  await page.mouse.up();
  await base.expect(page.locator('#parent-panel')).toBeVisible();
}

module.exports = { test, expect: base.expect, WORDS, STICKER_SETS, SET_SIZE, STICKER_EMOJI, MEDALS_PER_TROPHY, openApp, savedProgress, savedItem, starred, openGrownupCorner };
