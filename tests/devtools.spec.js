// The 🛠️ panel's jumps (localhost only): each stops just short of a reward so the real one plays next, and
// "Restore my progress" puts back exactly what was saved before the first jump.
'use strict';

const { test, expect, WORDS, STICKER_SETS, SET_SIZE, SHORT_GAME, openApp, savedProgress, starred, exactly } = require('./helpers');

const savedNow = (page) => page.evaluate(() =>
  Object.fromEntries(Object.keys(localStorage).filter((k) => k.startsWith('sightWords.')).sort().map((k) => [k, localStorage.getItem(k)])));

test('"Next game earns a trophy", then a game, plays the trophy and prize; Restore puts everything back', async ({ page }) => {
  await openApp(page, { progress: { words: starred(WORDS.slice(0, 2)), medals: 4 }, offWords: SHORT_GAME });
  const before = await savedNow(page);

  await page.locator('#dev-btn').click();
  await page.locator('#dev-trophy-next').click();
  await expect(page.locator('#dev-note')).toContainText('earn a trophy');
  expect((await savedProgress(page)).medals).toBe(9); // one short of the first trophy

  // A real game: any medal completes the trophy, and "Pick your prize!" follows
  await page.locator('#dev-btn').click();
  await page.locator('#listen-btn').click();
  const total = await page.evaluate(() => listenRound.total);
  for (let i = 0; i < total; i++) {
    await expect(page.locator('#listen-count')).toHaveText(`${i + 1} / ${total}`);
    const target = await page.evaluate(() => listenRound.target);
    await page.locator('#listen-choices .listen-choice').filter({ hasText: exactly(target) }).click();
  }
  await expect(page.locator('#sticker-hint')).toContainText('New trophy! You have 1!', { timeout: 15_000 });
  await expect(page.locator('#prize-card')).toBeVisible({ timeout: 10_000 });
  await page.locator('#prize-later').click();

  // Restore: exactly the saved progress from before the jump
  await page.locator('#dev-btn').click();
  await page.locator('#dev-restore').click();
  await expect(page.locator('#start-btn')).toBeEnabled();
  expect(await savedNow(page)).toEqual(before);
  expect(await page.evaluate(() => localStorage.getItem('devTools.progressBackup'))).toBeNull();
  await page.locator('#dev-btn').click();
  await expect(page.locator('#dev-restore')).toBeHidden();
});

test('"One star from a set", then I know it!, finishes the set with its celebration', async ({ page }) => {
  const [beach] = STICKER_SETS;
  await openApp(page);
  await page.locator('#dev-btn').click();
  await page.locator('#dev-set-next').click();
  await expect(page.locator('#dev-note')).toContainText(`One more star finishes ${beach.name}`);
  const progress = await savedProgress(page);
  const beachStickers = Object.values(progress.words).filter((s) => s.known && s.set === 'beach').map((s) => s.sticker);
  expect(beachStickers).toEqual(beach.stickers.slice(0, SET_SIZE - 1));

  // A real star from Missing words finishes the set
  await page.locator('#dev-btn').click();
  await page.locator('#missing-btn').click();
  await page.locator('#know-btn').click();
  await page.locator('#home-btn').click();
  await expect(page.locator('#scene-celebration-title')).toHaveText('🎉 Beach set complete!', { timeout: 10_000 });
  expect((await savedProgress(page)).scenes).toEqual(['beach']);
});

test('the 🛠️ panel closes on a tap outside it, and stays open for taps inside it', async ({ page }) => {
  await openApp(page);
  const panel = page.locator('#dev-panel');
  await page.locator('#dev-btn').click();
  await expect(panel).toBeVisible();

  await panel.locator('[data-status="ready"]').click(); // inside: stays open
  await expect(panel).toBeVisible();
  await page.mouse.click(4, 400); // outside: an empty spot at the left edge
  await expect(panel).toBeHidden();

  // 🛠️ itself still opens and closes it
  await page.locator('#dev-btn').click();
  await expect(panel).toBeVisible();
  await page.locator('#dev-btn').click();
  await expect(panel).toBeHidden();
});
