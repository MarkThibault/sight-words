// Listen & tap and Build the word: practice that earns medals, never stars or stickers, and takes turns.
'use strict';

const { test, expect, WORDS, SET_SIZE, STICKER_SETS, SHORT_GAME, openApp, savedProgress, starred, exactly, openGrownupCorner } = require('./helpers');

// Stars and stickers, which the games must never change.
const stickersOf = (progress) => Object.fromEntries(Object.entries(progress.words).map(([w, s]) => [w, [s.known, s.sticker, s.set]]));
const someStars = () => ({ words: starred(WORDS.slice(0, 3)) });

test('Listen & tap: a wrong tap gets another try, and finishing earns a medal but no stars', async ({ page }) => {
  await openApp(page, { progress: someStars(), offWords: SHORT_GAME });
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
    // A cheer with the word's points (one off for the wrong tap), or the medal on the last word
    await expect(page.locator('#toast')).toContainText(i === total - 1 ? '🥈 A silver medal!' : `+${i === 0 ? 3 : 4} points`);
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
  await openApp(page, { progress: someStars(), offWords: SHORT_GAME });
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
    await expect(page.locator('#toast')).toContainText(i === total - 1 ? '🥇 A gold medal!' : '+5 points');
  }

  await expect(page.locator('#home')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('#sticker-hint')).toContainText('You earned a gold medal!');
  const after = await savedProgress(page);
  expect(after.medals).toBe(3);
  expect(after.lastGame).toEqual({ game: 'build', inARow: 1 });
  expect(stickersOf(after)).toEqual(before);
});

test('Build the word: a wrong tile gets the soft boop, stays in the tray, and the sound wanted plays next', async ({ page }) => {
  await openApp(page, { offWords: SHORT_GAME });
  await page.locator('#build-btn').click();
  await page.waitForFunction(() => buildRound && !buildRound.busy && buildRound.next === 0);
  // Every clip played from here on, to hear (by name) what follows the boop
  await page.evaluate(() => {
    const play = playClip;
    window.clipsPlayed = [];
    playClip = (path, ...rest) => { clipsPlayed.push(path); return play(path, ...rest); };
  });
  const [letters, id] = await page.evaluate(() => buildRound.parts[0]);
  const tiles = page.locator('#build-tiles .build-tile');
  const wrong = tiles.filter({ hasNotText: exactly(letters) }).first();
  await wrong.click();

  await expect(wrong).toHaveClass(/wiggle/);
  await expect(wrong).not.toHaveClass(/used/); // still in the tray
  expect(await page.evaluate(() => [buildRound.next, buildRound.wordPoints])).toEqual([0, 4]); // one point off
  await page.waitForFunction((clip) => clipsPlayed.includes(clip), `audio/sounds/${id}.wav`);

  // And the right one still goes in
  await tiles.filter({ hasText: exactly(letters) }).first().click();
  await expect(page.locator('#build-slots .build-slot').first()).toHaveClass(/filled|silent/);
});

test('after two games of one kind in a row, it waits until something else is finished', async ({ page }) => {
  // Every word has a star but one. Their scenes are already unlocked, or "set complete!" would play over the home
  // screen and catch the taps.
  const scenes = STICKER_SETS.map((set) => set.id);
  await openApp(page, { progress: { words: starred(WORDS.slice(1)), scenes, lastGame: { game: 'listen', inARow: 2 } } });
  const listen = page.locator('#listen-btn');
  await expect(listen).toHaveClass(/waiting/);
  await expect(page.locator('#listen-note')).toHaveText('🔄 Play something else first');
  await expect(page.locator('#build-btn')).not.toHaveClass(/waiting/);

  // A tap stays on the home screen and wiggles the things that can be played instead.
  // The waiting button stays tappable on purpose (aria-disabled, not disabled), so this tap is forced.
  await listen.click({ force: true });
  await expect(page.locator('#home')).toBeVisible();
  for (const id of ['#start-btn', '#checkup-btn', '#timed-btn', '#build-btn']) await expect(page.locator(id)).toHaveClass(/wiggle/);
  await expect(listen).not.toHaveClass(/wiggle/);

  // Finishing a reading round opens it again
  await page.evaluate(() => { state.devRoundWords = 1; }); // a one-word round
  await page.locator('#start-btn').click();
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

  await openGrownupCorner(page, 'settings');
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

test('"Hear it again" sits below the cards in both games', async ({ page }) => {
  await openApp(page);
  const box = (selector) => page.locator(selector).evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom };
  });

  await page.locator('#listen-btn').click();
  await expect(page.locator('#listen-choices .listen-choice').first()).toBeVisible();
  expect((await box('#listen-again')).top).toBeGreaterThanOrEqual((await box('#listen-choices')).bottom);
  await expect(page.locator('#listen-again')).toBeInViewport({ ratio: 1 });
  await page.locator('#listen-home-btn').click();

  await page.locator('#build-btn').click();
  await expect(page.locator('#build-tiles .build-tile').first()).toBeVisible();
  const again = await box('#build-again');
  expect(again.top).toBeGreaterThanOrEqual((await box('#build-slots')).bottom); // under the word...
  expect(again.bottom).toBeLessThanOrEqual((await box('#build-tiles')).top); // ...above the tiles
  await expect(page.locator('#build-again')).toBeInViewport({ ratio: 1 });
});

test('Build the word shows blanks, not the letters, and a right tile fills its blank', async ({ page }) => {
  await openApp(page, { offWords: WORDS.filter((w) => w !== 'said') });
  await page.locator('#build-btn').click();
  await page.waitForFunction(() => buildRound && !buildRound.busy && buildRound.next === 0);
  const slots = page.locator('#build-slots .build-slot');
  await expect(slots).toHaveCount(3);
  // Each blank is an underline, with its letters hidden
  const look = (i) => slots.nth(i).evaluate((el) => ({ color: getComputedStyle(el).color, line: getComputedStyle(el).textDecorationLine }));
  expect(await look(0)).toEqual({ color: 'rgba(0, 0, 0, 0)', line: 'underline' });
  await expect(slots.first()).toHaveClass(/blank/);

  await page.locator('#build-tiles .build-tile').filter({ hasText: exactly('s') }).first().click();
  await expect(slots.first()).toHaveClass(/filled/);
  await expect(slots.first()).not.toHaveClass(/blank/);
  expect((await look(0)).color).not.toBe('rgba(0, 0, 0, 0)');
  expect((await look(1)).color).toBe('rgba(0, 0, 0, 0)');
});

test('tapping the word in Build the word sounds out the placed parts and the first blank, then stops', async ({ page }) => {
  await openApp(page, { offWords: WORDS.filter((w) => w !== 'said') });
  await page.locator('#build-btn').click();
  await page.waitForFunction(() => buildRound && !buildRound.busy && buildRound.next === 0);
  await page.locator('#build-tiles .build-tile').filter({ hasText: exactly('s') }).first().click();
  await page.locator('#build-tiles .build-tile').filter({ hasText: exactly('ai') }).first().click();
  await page.waitForTimeout(1500); // the last tile's sound is over

  // Every clip played from here on, and each part lit as its sound plays
  await page.evaluate(() => {
    const play = playClip;
    window.clipsPlayed = [];
    window.litParts = [];
    playClip = (path, ...rest) => {
      clipsPlayed.push(path);
      litParts.push([...document.querySelectorAll('#build-slots .build-slot.on')].map((el) => el.dataset.part));
      return play(path, ...rest);
    };
  });
  await page.locator('#build-slots').click();
  await page.waitForFunction(() => clipsPlayed.length === 3);
  await page.waitForTimeout(1500); // and nothing after: no whole word
  expect(await page.evaluate(() => clipsPlayed)).toEqual(['audio/sounds/S.wav', 'audio/sounds/E.wav', 'audio/sounds/D.wav']);
  expect(await page.evaluate(() => litParts)).toEqual([['0'], ['1'], ['2']]); // the blank lights up for its sound
  await expect(page.locator('#build-slots .build-slot.on')).toHaveCount(0);
  // Nothing was placed or scored by listening
  expect(await page.evaluate(() => [buildRound.next, buildRound.wordPoints])).toEqual([2, 5]);
});
