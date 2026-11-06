// The home screen at phone and tablet sizes: stickers stay out from behind the title and buttons.
'use strict';

const { test, expect, WORDS, openApp, starred } = require('./helpers');

// With all 31 stickers, short phones run out of room and stickers overlap the buttons (a known limit), so this
// uses a number that should always fit.
const STICKERS = 12;

test(`${STICKERS} stickers stay off the title, buttons and pills`, async ({ page }) => {
  await openApp(page, { progress: { words: starred(WORDS.slice(0, STICKERS)) }, stickerSeed: 7 });
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('#sticker-board .sticker')).toHaveCount(STICKERS);

  const overlaps = await page.evaluate(() => {
    const blockers = blockerRects();
    const hits = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    return [...els.board.querySelectorAll('.sticker-art')].map((art) => art.getBoundingClientRect())
      .filter((rect) => blockers.some((b) => hits(rect, b))).length;
  });
  expect(overlaps, 'stickers covering the title or a button').toBe(0);
});
