// The home screen at phone and tablet sizes: stickers stay out from behind the title and buttons.
'use strict';

const { test, expect, WORDS, openApp, starred } = require('./helpers');

// With all 31 stickers, short phones run out of room and stickers overlap the buttons (a known limit), so this
// uses a number that should always fit.
const STICKERS = 12;

// What the home screen looks like now: the title's box, whether the Andika font has arrived, and where the stickers
// are compared with where they'd be placed if the board were drawn again now.
const homeLayout = (page) => page.evaluate(() => {
  const center = els.homeCenter.getBoundingClientRect();
  const slots = stickerSlots(boardStickers().length);
  const keys = boardStickers().map((s) => s.key);
  const moved = [...els.board.querySelectorAll('.sticker')].filter((el) => {
    const slot = slots[keys.indexOf(el.dataset.key)];
    return Math.abs(parseFloat(el.style.left) - slot.x) > 1 || Math.abs(parseFloat(el.style.top) - slot.y) > 1;
  }).length;
  return {
    title: `${Math.round(center.width)}×${Math.round(center.height)} at ${Math.round(center.left)},${Math.round(center.top)}`,
    andika: document.fonts.check('16px Andika'),
    stickersNotWhereTheydBeNow: moved,
  };
});

test(`${STICKERS} stickers stay off the title, buttons and pills`, async ({ page }) => {
  await openApp(page, { progress: { words: starred(WORDS.slice(0, STICKERS)) }, stickerSeed: 7 });
  await expect(page.locator('#sticker-board .sticker')).toHaveCount(STICKERS);
  const atStart = await homeLayout(page);
  await page.evaluate(() => document.fonts.ready);

  // Which sticker covers which part of the screen, by the part's id
  const overlaps = await page.evaluate(() => {
    const parts = [els.homeCenter, els.starCount, els.trophyMeter, els.settingsBtn, els.playToggle, els.recorderBtn,
      els.shuffleBtn, els.scenesBtn, els.trophyBtn, els.appVersion, els.updateBtn, els.devBtn].filter((el) => !el.hidden);
    const hits = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    return [...els.board.querySelectorAll('.sticker')].flatMap((sticker) => {
      const art = sticker.querySelector('.sticker-art').getBoundingClientRect();
      return parts.filter((part) => hits(art, part.getBoundingClientRect())).map((part) => `${sticker.dataset.key} on #${part.id}`);
    });
  });
  // If this fails, the details say whether the screen changed after the stickers were placed
  expect(overlaps, `stickers covering the title or a button. At start: ${JSON.stringify(atStart)}. ` +
    `Now: ${JSON.stringify(await homeLayout(page))}`).toEqual([]);
});
