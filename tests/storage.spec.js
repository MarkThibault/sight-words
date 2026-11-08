// Keeping progress: an installed app asks the browser to keep its saved data, so it isn't cleared when the device runs
// low on space. A browser tab never asks, because some browsers (Firefox) would show the parent a pop-up for it.
'use strict';

const { test, expect, openApp } = require('./helpers');

// Stands in for running installed (or in a browser tab), and for the browser's answer, counting each time it's asked.
const fakeDevice = (page, { installed, alreadyKept = false }) => page.addInitScript(({ installed, alreadyKept }) => {
  window.keepAsked = 0;
  const realMatchMedia = window.matchMedia.bind(window);
  window.matchMedia = (query) => (query.includes('display-mode')
    ? { matches: installed && query.includes('standalone'), media: query, addEventListener() {}, removeEventListener() {} }
    : realMatchMedia(query));
  navigator.storage.persisted = async () => alreadyKept;
  navigator.storage.persist = async () => { window.keepAsked += 1; return true; };
}, { installed, alreadyKept });

const timesAsked = (page) => page.evaluate(() => window.keepAsked);

test('installed, the app asks the browser to keep its progress', async ({ page }) => {
  await fakeDevice(page, { installed: true });
  await openApp(page);
  await expect.poll(() => timesAsked(page)).toBe(1);
});

test('in a browser tab, it never asks', async ({ page }) => {
  await fakeDevice(page, { installed: false });
  await openApp(page);
  await page.waitForTimeout(500);
  expect(await timesAsked(page)).toBe(0);
});

test('once the browser keeps it, the app doesn\'t ask again', async ({ page }) => {
  await fakeDevice(page, { installed: true, alreadyKept: true });
  await openApp(page);
  await page.waitForTimeout(500);
  expect(await timesAsked(page)).toBe(0);
});
