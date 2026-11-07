// The home screen at phone and tablet sizes: stickers stay out from behind the title and buttons.
'use strict';

const { test, expect, WORDS, STICKER_SETS, openApp, starred } = require('./helpers');

// With all 31 stickers, short phones run out of room and stickers overlap the buttons (a known limit), so this
// uses a number that should always fit.
const STICKERS = 12;
const withStickers = { progress: { words: starred(WORDS.slice(0, STICKERS)) }, stickerSeed: 7 };

// Which sticker covers which part of the screen (by the part's id), and how many stickers sit somewhere other than
// where they'd be placed for the screen as it is now: more than 0 means the screen changed after they were placed.
const checkStickers = (page) => page.evaluate(() => {
  const parts = [els.homeCenter, els.starCount, els.trophyMeter, els.settingsBtn, els.playToggle, els.recorderBtn,
    els.shuffleBtn, els.scenesBtn, els.trophyBtn, els.appVersion, els.updateBtn, els.devBtn].filter((el) => !el.hidden);
  const hits = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  const stickers = [...els.board.querySelectorAll('.sticker')];
  const covering = stickers.flatMap((sticker) => {
    const art = sticker.querySelector('.sticker-art').getBoundingClientRect();
    return parts.filter((part) => hits(art, part.getBoundingClientRect())).map((part) => `${sticker.dataset.key} on #${part.id}`);
  });
  const keys = boardStickers().map((s) => s.key);
  const slots = stickerSlots(keys.length);
  const outOfPlace = stickers.filter((el) => {
    const slot = slots[keys.indexOf(el.dataset.key)];
    return Math.abs(parseFloat(el.style.left) - slot.x) > 1 || Math.abs(parseFloat(el.style.top) - slot.y) > 1;
  }).length;
  return { covering, outOfPlace };
});

test(`${STICKERS} stickers stay off the title, buttons and pills`, async ({ page }) => {
  await openApp(page, withStickers);
  await expect(page.locator('#sticker-board .sticker')).toHaveCount(STICKERS);
  await page.waitForLoadState('load'); // every font has arrived
  expect(await checkStickers(page)).toEqual({ covering: [], outOfPlace: 0 });
});

// On a slow first visit, the stickers are placed before the Andika font arrives, and the title changes size when it
// does. The stickers have to move out of its way. A wide backup font makes the change big enough to matter.
test('stickers move out of the way when the font arrives late', async ({ page }) => {
  await page.route(/style\.css/, async (route) => {
    const response = await route.fetch();
    const css = (await response.text()).replace(/(--font: 'Andika'),[^;]*;/, "$1, 'Courier New', monospace;");
    await route.fulfill({ response, body: css });
  });
  let fontMayArrive;
  const held = new Promise((resolve) => { fontMayArrive = resolve; });
  await page.route(/fonts\.gstatic\.com/, async (route) => { await held; await route.continue(); });

  await openApp(page, withStickers);
  await expect(page.locator('#sticker-board .sticker')).toHaveCount(STICKERS);
  const before = await page.evaluate(() => els.homeCenter.getBoundingClientRect().height);
  fontMayArrive();
  await page.waitForLoadState('load');
  await expect.poll(() => page.evaluate(() => els.homeCenter.getBoundingClientRect().height)).not.toBe(before);
  await expect.poll(() => checkStickers(page)).toEqual({ covering: [], outOfPlace: 0 });
});

// Outside sticker play, 🏆 🎲 and 🖼️ are tucked away behind the 🐵/🙈 switch, and slide out beside it when it opens.
// Stickers are placed while they're tucked away, so the spot they slide into has to be kept clear too.
test('in sticker play, stickers stay out from behind 🏆 🎲 and 🖼️', async ({ page }) => {
  // Their scenes are already unlocked (so 🖼️ shows), or "set complete!" would play over the screen and catch the tap
  const scenes = STICKER_SETS.map((set) => set.id);
  await openApp(page, { progress: { words: starred(WORDS.slice(0, 20)), scenes }, stickerSeed: 7 });
  await page.waitForLoadState('load');
  await page.locator('#play-toggle').click();
  await expect(page.locator('#scenes-btn')).toBeVisible();
  await page.waitForFunction(() => document.getAnimations().length === 0); // the buttons have finished sliding out

  const behind = await page.evaluate(() => {
    const hits = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    return [els.trophyBtn, els.shuffleBtn, els.scenesBtn, els.playToggle].flatMap((button) => [...els.board.querySelectorAll('.sticker')]
      .filter((sticker) => hits(sticker.querySelector('.sticker-art').getBoundingClientRect(), button.getBoundingClientRect()))
      .map((sticker) => `${sticker.dataset.key} behind #${button.id}`));
  });
  expect(behind).toEqual([]);
});
