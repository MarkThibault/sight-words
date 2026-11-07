// Trophies: every MEDALS_PER_TROPHY medals earns one, and each lets the child pick a prize sticker for the board.
'use strict';

const { test, expect, WORDS, STICKER_SETS, STICKER_EMOJI, MEDALS_PER_TROPHY, openApp, savedProgress, starred, exactly } = require('./helpers');

// Plays a whole game of Listen & tap, tapping the right word every time.
async function playListen(page) {
  await page.locator('#listen-btn').click();
  const total = await page.evaluate(() => listenRound.total);
  for (let i = 0; i < total; i++) {
    await expect(page.locator('#listen-count')).toHaveText(`${i + 1} / ${total}`);
    const target = await page.evaluate(() => listenRound.target);
    await page.locator('#listen-choices .listen-choice').filter({ hasText: exactly(target) }).click();
  }
  await expect(page.locator('#home')).toBeVisible({ timeout: 15_000 });
}

test('a game that completes a trophy offers a prize sticker that isn\'t on the board yet', async ({ page }) => {
  // One trophy already, with its prize 🐱 picked, and a 🐶 sticker earned before sticker sets.
  // One more game reaches the second trophy, whatever medal it earns.
  const oldSticker = '🐶';
  const firstPrize = '🐱';
  await openApp(page, {
    progress: {
      words: starred(WORDS.slice(0, 1), () => ({ sticker: oldSticker })),
      medals: 2 * MEDALS_PER_TROPHY - 1,
      prizes: [{ emoji: firstPrize, at: 1_700_000_000_000 }],
    },
  });
  await playListen(page);
  await expect(page.locator('#sticker-hint')).toContainText('New trophy! You have 2!');

  // "Pick your prize!" shows by itself, with every sticker outside the sets that isn't on the board
  await expect(page.locator('#prize-card')).toBeVisible({ timeout: 10_000 });
  const choices = await page.locator('#prize-list .prize-choice').allTextContents();
  expect(choices).toEqual(STICKER_EMOJI.filter((e) => e !== oldSticker && e !== firstPrize));
  const setStickers = STICKER_SETS.flatMap((set) => set.stickers);
  expect(choices.filter((e) => setStickers.includes(e))).toEqual([]);

  // Tapping one asks first, and "Choose again" goes back to the grid
  const [maybe, chosen] = choices;
  await page.locator('#prize-list .prize-choice').filter({ hasText: maybe }).click();
  await expect(page.locator('#prize-chosen')).toHaveText(maybe);
  await page.locator('#prize-back').click();
  await page.locator('#prize-list .prize-choice').filter({ hasText: chosen }).click();
  await page.locator('#prize-yes').click();
  await expect(page.locator('#prize-card')).toBeHidden();

  const progress = await savedProgress(page);
  expect(progress.prizes.map((p) => p.emoji)).toEqual([firstPrize, chosen]);
  expect(progress.words[WORDS[0]]).toMatchObject({ known: true, sticker: oldSticker }); // stars untouched
  await expect(page.locator('#trophy-badge')).toBeHidden(); // nothing left to pick

  // It waits in the 🐵/🙈 switch, then pops onto the board with a 🏆 tag instead of a word
  await expect(page.locator('#play-badge')).toHaveText('1', { timeout: 10_000 });
  await page.locator('#play-toggle').click();
  const prize = page.locator('#sticker-board .sticker').filter({ has: page.locator('.sticker-art', { hasText: chosen }) });
  await expect(prize.locator('.sticker-word')).toHaveText('🏆');
});

test('"Later" saves the prize, and My Trophies offers it again', async ({ page }) => {
  await openApp(page, { progress: { words: {}, medals: MEDALS_PER_TROPHY - 1 } });
  await playListen(page);
  await expect(page.locator('#prize-card')).toBeVisible({ timeout: 10_000 });
  await page.locator('#prize-later').click();
  await expect(page.locator('#prize-card')).toBeHidden();

  // The trophy pill glows, and the 🐵/🙈 switch counts the prize waiting inside it
  await expect(page.locator('#trophy-meter')).toHaveClass(/glow/);
  await expect(page.locator('#play-badge')).toHaveText('1');
  await page.locator('#trophy-meter').click();
  await expect(page.locator('#prize-btn')).toBeVisible();
  await page.locator('#prize-btn').click();
  await expect(page.locator('#prize-card')).toBeVisible();
  expect((await savedProgress(page)).prizes).toBeUndefined();
});
