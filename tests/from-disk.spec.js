// Opening index.html straight from disk (double-clicking it) still works, with the built-in word list.
// It catches a script that only works through a server, such as a module or a file added in the wrong order.
'use strict';

const path = require('path');
const { pathToFileURL } = require('url');
const base = require('@playwright/test');
const { FALLBACK_WORDS } = require('./helpers');

const { test, expect } = base;

test('the app starts from disk and plays a word from the built-in list', async ({ page }) => {
  // From disk the browser blocks loading words.json and the recordings, and logs that, so only script errors fail here
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  await page.goto(pathToFileURL(path.join(__dirname, '..', 'index.html')).href);

  await expect(page.locator('#start-btn')).toBeEnabled();
  expect(await page.evaluate(() => state.allWords)).toEqual(FALLBACK_WORDS);
  await page.locator('#start-btn').click();
  await expect(page.locator('#practice')).toBeVisible();
  expect(FALLBACK_WORDS).toContain(await page.locator('#word').textContent());
  expect(errors, 'script errors on the page').toEqual([]);
});
