// The 🖼️ scene tray: unlocked scenes can be picked as the background, and locked ones point back to reading.
'use strict';

const { test, expect, WORDS, STICKER_SETS, SET_SIZE, openApp, savedProgress, starred } = require('./helpers');

const [beach, space] = STICKER_SETS;
const thumb = (page, name) => page.locator(`#scene-list .scene-thumb[aria-label^="${name}"]`);

test('a new scene is tagged until the tray is opened, and picking one changes the background', async ({ page }) => {
  await openApp(page, {
    progress: {
      words: starred(WORDS.slice(0, SET_SIZE), (word, i) => ({ sticker: beach.stickers[i], set: 'beach' })),
      scenes: ['beach'], scenesToTry: ['beach'],
    },
  });
  await expect(page.locator('#home')).toHaveAttribute('data-bg', 'dots');
  await page.locator('#play-toggle').click(); // 🖼️ is beside the switch in sticker play
  await expect(page.locator('#scenes-badge')).toHaveText('1');

  // Opening the tray: the new scene is tagged "New!" this once, and the count clears
  await page.locator('#scenes-btn').click();
  await expect(page.locator('#scene-tray')).toBeVisible();
  await expect(thumb(page, beach.name).locator('.thumb-new')).toHaveText('New!');
  await expect(page.locator('#scenes-badge')).toBeHidden();
  expect((await savedProgress(page)).scenesToTry).toBeUndefined();

  // A locked scene wiggles and says how to unlock it, and the tray stays open
  await thumb(page, space.name).click();
  await expect(thumb(page, space.name).locator('.thumb-lock')).toHaveClass(/wiggle/);
  await expect(page.locator('#scene-hint')).toHaveText('Learn more words to unlock more scenes!');
  await expect(page.locator('#scene-tray')).toBeVisible();

  // Picking the unlocked one closes the tray and changes the background, and it's saved
  await thumb(page, beach.name).click();
  await expect(page.locator('#scene-tray')).toBeHidden();
  await expect(page.locator('#home')).toHaveAttribute('data-bg', 'beach');
  expect((await savedProgress(page)).scene).toBe('beach');

  // Next time, no "New!" tag, and the dots are always there to go back to
  await page.locator('#scenes-btn').click();
  await expect(page.locator('#scene-list .thumb-new')).toHaveCount(0);
  await thumb(page, 'Dots').click();
  await expect(page.locator('#home')).toHaveAttribute('data-bg', 'dots');
  expect((await savedProgress(page)).scene).toBeUndefined();
});
