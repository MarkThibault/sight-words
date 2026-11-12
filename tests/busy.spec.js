// Things that wait while the child is busy: a downloaded update installing by itself, and new stickers flying into
// the 🐵/🙈 switch. Neither may interrupt sticker play, another screen, a pop-up or a "set complete!" celebration.
'use strict';

const { test, expect, WORDS, openApp } = require('./helpers');

// Offline play (and so real updates) is off on localhost, so the tests stand in a downloaded version that's
// waiting, and ask the app what it does on being reopened (js/offline.js).
const reopenWithUpdateWaiting = (page) => page.evaluate(() => {
  swRegistration = { waiting: { postMessage() {} }, update: () => Promise.resolve() };
  updateOnReopen();
  return installingUpdate;
});

test('a waiting update installs on reopening only when nothing is in the way', async ({ page }) => {
  await openApp(page);
  const updateButton = page.locator('#update-btn');

  // Sticker play: it waits, with the Update button on offer
  await page.locator('#play-toggle').click();
  expect(await reopenWithUpdateWaiting(page)).toBe(false);
  await page.locator('#play-toggle').click();
  await expect(updateButton).toBeVisible();

  // A pop-up open
  await page.locator('#trophy-meter').click();
  expect(await reopenWithUpdateWaiting(page)).toBe(false);
  await page.locator('#trophy-close').click();

  // Another screen
  await page.locator('#start-btn').click();
  expect(await reopenWithUpdateWaiting(page)).toBe(false);
  await page.locator('#home-btn').click();

  // A "set complete!" celebration
  await page.evaluate(() => { state.celebrating = true; });
  expect(await reopenWithUpdateWaiting(page)).toBe(false);
  await page.evaluate(() => { state.celebrating = false; });

  // Nothing in the way: it installs straight away
  expect(await reopenWithUpdateWaiting(page)).toBe(true);
  await expect(page.locator('#app-version')).toHaveText('Updating…');
});

test('new stickers wait to fly in while My Trophies is open', async ({ page }) => {
  await openApp(page, { offWords: WORDS.slice(2) });
  await page.locator('#start-btn').click();
  await page.locator('#know-btn').click();

  // Straight home and into My Trophies, before the new sticker takes off. Both taps happen in one step: as two
  // separate clicks, a busy computer can take longer between them than the app waits (FLY_IN_DELAY_MS), and the
  // sticker flies before My Trophies opens.
  await page.evaluate(() => {
    els.homeBtn.click();
    els.trophyMeter.click();
  });
  await expect(page.locator('#trophy-panel')).toBeVisible();
  await page.waitForTimeout(2500); // longer than a fly-in takes
  await expect(page.locator('body > .sticker.flying')).toHaveCount(0);
  await page.locator('#trophy-close').click();
  await expect(page.locator('#play-badge')).toBeHidden(); // still waiting for the next visit home

  // The next time the home screen shows, it flies in and the switch counts it
  await page.locator('#start-btn').click();
  await page.locator('#home-btn').click();
  await expect(page.locator('body > .sticker.flying')).toHaveCount(1);
  await expect(page.locator('#play-badge')).toHaveText('1', { timeout: 5_000 });
});
