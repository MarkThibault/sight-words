// Listen & tap and Build the word: practice that earns medals, never stars or stickers, and takes turns.
'use strict';

const { test, expect, WORDS, SET_SIZE, openApp, savedProgress, starred, exactly, openGrownupCorner } = require('./helpers');

// Stars and stickers, which the games must never change.
const stickersOf = (progress) => Object.fromEntries(Object.entries(progress.words).map(([w, s]) => [w, [s.known, s.sticker, s.set]]));
const someStars = () => ({ words: starred(WORDS.slice(0, 3)) });

test('Listen & tap: a wrong tap gets another try, and finishing earns a medal but no stars', async ({ page }) => {
  await openApp(page, { progress: someStars() });
  const before = stickersOf(await savedProgress(page));

  await page.locator('#listen-btn').click();
  const total = await page.evaluate(() => listenRound.total);
  for (let i = 0; i < total; i++) {
    await expect(page.locator('#listen-count')).toHaveText(`${i + 1} / ${total}`);
    const target = await page.evaluate(() => listenRound.target);
    const choices = page.locator('#listen-choices .listen-choice');
    if (i === 0) {
      // A wrong tap: that choice is out, and they keep looking
      const wrong = choices.filter({ hasNotText: exactly(target) }).first();
      await wrong.click();
      await expect(wrong).toHaveClass(/wrong/);
      await expect(wrong).toBeDisabled();
    }
    await choices.filter({ hasText: exactly(target) }).click();
  }

  await expect(page.locator('#home')).toBeVisible({ timeout: 15_000 });
  // One wrong tap out of every word right: silver, worth 2 medals
  await expect(page.locator('#sticker-hint')).toContainText('You earned a silver medal!');
  const after = await savedProgress(page);
  expect(after.medals).toBe(2);
  expect(after.lastGame).toEqual({ game: 'listen', inARow: 1 });
  expect(stickersOf(after)).toEqual(before);
});

test('Build the word: putting every part in order earns gold, but no stars', async ({ page }) => {
  await openApp(page, { progress: someStars() });
  const before = stickersOf(await savedProgress(page));

  await page.locator('#build-btn').click();
  const total = await page.evaluate(() => buildRound.total);
  for (let i = 0; i < total; i++) {
    await expect(page.locator('#build-count')).toHaveText(`${i + 1} / ${total}`);
    await page.waitForFunction(() => buildRound && !buildRound.busy && buildRound.next === 0);
    const parts = await page.evaluate(() => buildRound.parts.map(([letters]) => letters));
    for (const letters of parts) {
      await page.locator('#build-tiles .build-tile:not(.used)').filter({ hasText: exactly(letters) }).first().click();
    }
    await expect(page.locator('#build-slots')).toHaveClass(/right/);
  }

  await expect(page.locator('#home')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('#sticker-hint')).toContainText('You earned a gold medal!');
  const after = await savedProgress(page);
  expect(after.medals).toBe(3);
  expect(after.lastGame).toEqual({ game: 'build', inARow: 1 });
  expect(stickersOf(after)).toEqual(before);
});

test('after two games of one kind in a row, it waits until something else is finished', async ({ page }) => {
  // Every word has a star but one, so Missing words is a one-word reading round
  await openApp(page, { progress: { words: starred(WORDS.slice(1)), lastGame: { game: 'listen', inARow: 2 } } });
  const listen = page.locator('#listen-btn');
  await expect(listen).toHaveClass(/waiting/);
  await expect(page.locator('#listen-note')).toHaveText('🔄 Play something else first');
  await expect(page.locator('#build-btn')).not.toHaveClass(/waiting/);

  // A tap stays on the home screen and wiggles the things that can be played instead.
  // The waiting button stays tappable on purpose (aria-disabled, not disabled), so this tap is forced.
  await listen.click({ force: true });
  await expect(page.locator('#home')).toBeVisible();
  for (const id of ['#start-btn', '#missing-btn', '#timed-btn', '#build-btn']) await expect(page.locator(id)).toHaveClass(/wiggle/);
  await expect(listen).not.toHaveClass(/wiggle/);

  // Finishing a reading round opens it again
  await page.locator('#missing-btn').click();
  await page.locator('#know-btn').click();
  await expect(page.locator('#home')).toBeVisible();
  await expect(listen).not.toHaveClass(/waiting/);
  expect((await savedProgress(page)).lastGame).toBeUndefined();
});

test('Reset all progress clears every reward but keeps turned-off words off', async ({ page }) => {
  const offWord = WORDS[WORDS.length - 1];
  await openApp(page, {
    progress: {
      words: starred(WORDS.slice(0, SET_SIZE + 1)),
      medals: 23, prizes: [{ emoji: '🐶', at: 1_700_000_000_000 }], scenes: ['beach'], scene: 'beach',
      bestTime: { ms: 95_000, count: WORDS.length - 1 }, lastGame: { game: 'build', inARow: 2 },
    },
    offWords: [offWord],
    stickerSpots: { [WORDS[0]]: [0.1, 0.1, 1_700_000_000_000] },
    stickerSeed: 42,
  });
  await expect(page.locator('#home')).toHaveAttribute('data-bg', 'beach');

  await openGrownupCorner(page);
  await page.locator('#reset-btn').click();
  await page.locator('#reset-yes').click();
  await page.locator('#panel-close').click();

  const progress = await savedProgress(page);
  expect(Object.values(progress.words).filter((s) => s.known)).toEqual([]);
  for (const key of ['medals', 'prizes', 'scenes', 'scene', 'bestTime', 'lastGame']) expect(progress).not.toHaveProperty(key);
  const saved = await page.evaluate(() => ({ ...localStorage }));
  expect(saved).not.toHaveProperty('sightWords.stickerSpots.v1');
  expect(saved).not.toHaveProperty('sightWords.stickerSeed.v1');
  expect(JSON.parse(saved['sightWords.offWords.v1'])).toEqual([offWord]);

  // The board goes back to the dots with no stickers
  await expect(page.locator('#home')).toHaveAttribute('data-bg', 'dots');
  await expect(page.locator('#sticker-board .sticker')).toHaveCount(0);
  await expect(page.locator('#build-btn')).not.toHaveClass(/waiting/);
});
