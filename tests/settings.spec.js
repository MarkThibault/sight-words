// The Grown-up corner's Settings page switches: sound effects off, and Calmer animations. Both are kept apart from
// progress, so they stay after a reload and a reset.
'use strict';

const { test, expect, SHORT_GAME, openApp, exactly, savedItem, openGrownupCorner } = require('./helpers');

const settings = async (page) => JSON.parse(await savedItem(page, 'sightWords.settings.v1'));

async function resetAll(page) {
  await openGrownupCorner(page, 'settings');
  await page.locator('#reset-btn').click();
  await page.locator('#reset-yes').click();
  await page.locator('#panel-close').click();
}

test('with sound effects off, a wrong tap plays no boop but the word is still said, and it stays off', async ({ page }) => {
  await openApp(page, { offWords: SHORT_GAME });
  await openGrownupCorner(page, 'settings');
  await expect(page.locator('#effects-switch')).toBeChecked();
  await page.locator('#effects-switch').click();
  await page.locator('#panel-close').click();
  expect(await settings(page)).toEqual({ soundEffects: false });

  // Every effect and clip played from here on
  await page.evaluate(() => {
    window.played = [];
    Object.entries(SOUND_EFFECTS).forEach(([name, effect]) => {
      const play = effect.play;
      effect.play = (...args) => { played.push(name); return play(...args); };
    });
    const playWord = playClip;
    playClip = (path, ...rest) => { played.push(path); return playWord(path, ...rest); };
  });
  await page.locator('#listen-btn').click();
  const target = await page.evaluate(() => listenRound.target);
  await page.evaluate(() => { played.length = 0; });
  await page.locator('#listen-choices .listen-choice').filter({ hasNotText: exactly(target) }).first().click();
  await expect.poll(() => page.evaluate(() => played)).toEqual([expect.stringContaining(`${target}.`)]);
  await page.locator('#listen-home-btn').click();

  await resetAll(page);
  await page.reload();
  await openGrownupCorner(page, 'settings');
  await expect(page.locator('#effects-switch')).not.toBeChecked();
});

test('Calmer animations skips the confetti and flying, and stays on after a reload and a reset', async ({ page }) => {
  await openApp(page);
  await openGrownupCorner(page, 'settings');
  await expect(page.locator('#calm-switch')).not.toBeChecked();
  await page.locator('#calm-switch').click();
  await page.locator('#panel-close').click();
  expect(await settings(page)).toEqual({ calm: true });
  await expect(page.locator('html')).toHaveClass(/calm/);
  await page.evaluate(() => confetti());
  await expect(page.locator('.confetti')).toHaveCount(0);

  await resetAll(page);
  await page.reload();
  await expect(page.locator('#start-btn')).toBeEnabled();
  expect(await page.evaluate(() => reduceMotion)).toBe(true);
  await expect(page.locator('html')).toHaveClass(/calm/);
  await openGrownupCorner(page, 'settings');
  await page.locator('#calm-switch').click(); // off again
  await page.locator('#panel-close').click();
  await page.evaluate(() => confetti());
  await expect(page.locator('.confetti').first()).toBeAttached();
});

test('on a device set to reduce motion, Calmer animations is on and can\'t be turned off', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openApp(page);
  await openGrownupCorner(page, 'settings');
  await expect(page.locator('#calm-switch')).toBeChecked();
  await expect(page.locator('#calm-switch')).toBeDisabled();
  await expect(page.locator('#calm-tip')).toContainText('this device is set to reduce motion');
});
