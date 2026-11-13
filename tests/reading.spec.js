// Let's Read, stars and stickers: only "I know it!" earns them, and they fill the sticker sets in order.
'use strict';

const { test, expect, WORDS, STICKER_SETS, SET_SIZE, openApp, savedProgress, starred, panelRow, openGrownupCorner } = require('./helpers');

const [beach, space] = STICKER_SETS;
const knownInOrder = (progress) => Object.entries(progress.words)
  .filter(([, s]) => s.known).sort(([, a], [, b]) => a.knownAt - b.knownAt);

test('a round of Let\'s Read fills the sticker sets in order and unlocks their scenes', async ({ page }) => {
  await openApp(page);
  await page.locator('#start-btn').click();
  const total = await page.evaluate(() => readingRound.total);
  expect(total).toBe(2 * SET_SIZE); // so this round finishes the first two sets

  for (let i = 0; i < total; i++) {
    await expect(page.locator('#know-btn')).toBeEnabled();
    await page.locator('#know-btn').click();
  }
  await expect(page.locator('#home')).toBeVisible();
  await expect(page.locator('#sticker-hint')).toContainText(`You learned ${total} new words!`);

  // Each star took the next sticker of the first set that isn't full, left to right as the star pill shows them
  const progress = await savedProgress(page);
  const known = knownInOrder(progress);
  expect(known.map(([, s]) => s.sticker)).toEqual([...beach.stickers, ...space.stickers]);
  expect(known.map(([, s]) => s.set)).toEqual([...Array(SET_SIZE).fill('beach'), ...Array(SET_SIZE).fill('space')]);
  expect(progress.scenes).toEqual(['beach', 'space']);

  // The new stickers fly into the 🐵/🙈 switch, then each finished set is celebrated
  await expect(page.locator('#scene-celebration-title')).toHaveText('🎉 Beach set complete!', { timeout: 20_000 });
  await expect(page.locator('#scene-celebration-title')).toHaveText('🎉 Outer Space set complete!', { timeout: 10_000 });
  await expect(page.locator('#scene-celebration')).toBeHidden({ timeout: 10_000 });
  // The switch's red bubble counts the stickers waiting inside it and the two new scenes
  await expect(page.locator('#play-badge')).toHaveText(String(total + 2));

  // Sticker play opens the switch, and the stickers pop onto the board
  await expect(page.locator('#sticker-board .sticker')).toHaveCount(0);
  await page.locator('#play-toggle').click();
  await expect(page.locator('#sticker-board .sticker')).toHaveCount(total);
  await expect(page.locator('#scenes-badge')).toHaveText('2');
});

test('a sticker taken away leaves a gap that the next star fills, and the scene stays unlocked', async ({ page }) => {
  const firstSet = WORDS.slice(0, SET_SIZE);
  await openApp(page, {
    progress: { words: starred(firstSet, (word, i) => ({ sticker: beach.stickers[i], set: 'beach' })), scenes: ['beach'] },
  });

  // A grown-up takes away the second sticker of the set
  const gapWord = firstSet[1];
  await openGrownupCorner(page);
  await page.locator('#panel-list li').filter({ hasText: beach.stickers[1] }).locator('.chip').click();
  await page.locator('#panel-close').click();
  let progress = await savedProgress(page);
  expect(progress.words[gapWord].known).toBe(false);
  expect(progress.scenes).toEqual(['beach']);

  // The next star fills the gap before the next set is started
  await page.locator('#missing-btn').click();
  const word = await page.evaluate(() => readingRound.word);
  await page.locator('#know-btn').click();
  await page.locator('#home-btn').click();
  progress = await savedProgress(page);
  expect(progress.words[word]).toMatchObject({ known: true, sticker: beach.stickers[1], set: 'beach' });
  expect(progress.scenes).toEqual(['beach']);
});

test('Next waits until the word has been heard', async ({ page }) => {
  await openApp(page);
  await page.locator('#start-btn').click();
  const first = await page.locator('#word').textContent();
  // Locked Next stays tappable on purpose (aria-disabled, not disabled), so this tap is forced
  await page.locator('#next-btn').click({ force: true });
  await expect(page.locator('#card')).toHaveClass(/wiggle/); // a nudge toward the word
  await expect(page.locator('#word')).toHaveText(first);
  await page.locator('#card').click(); // hearing it
  await page.locator('#next-btn').click();
  await expect(page.locator('#word')).not.toHaveText(first);
  expect((await savedProgress(page)).words[first]).toMatchObject({ heard: 1, known: false });
});

test('a Timed run keeps the best time, which only counts for the same number of words', async ({ page }) => {
  // Two words on, so each run is short
  await openApp(page, { offWords: WORDS.slice(2) });
  await expect(page.locator('#best-time')).toHaveText('No best time yet');
  const timedRun = async (pause) => {
    await page.locator('#timed-btn').click();
    await expect(page.locator('#timer')).toBeVisible();
    for (let i = 0; i < 2; i++) {
      await expect(page.locator('#know-btn')).toBeEnabled();
      await page.waitForTimeout(pause);
      await page.locator('#know-btn').click();
    }
    await expect(page.locator('#home')).toBeVisible();
  };

  // The first run is a new best
  await timedRun(0);
  await expect(page.locator('#sticker-hint')).toContainText('New best time');
  const best = (await savedProgress(page)).bestTime;
  expect(best).toMatchObject({ count: 2 });
  await expect(page.locator('#best-time')).toHaveText(/^Best: \d+:\d\d$/);

  // A slower run shows its time beside the best, and doesn't replace it
  await timedRun(1500);
  await expect(page.locator('#sticker-hint')).toContainText('(best is');
  expect((await savedProgress(page)).bestTime).toEqual(best);

  // With another word turned on, the times don't compare, so it starts fresh
  await openGrownupCorner(page);
  await panelRow(page, WORDS[2]).locator('.word-switch').click();
  await page.locator('#panel-close').click();
  await expect(page.locator('#best-time')).toHaveText('No best time yet');
});

test('stars from an older save get their stickers as the app opens, and drawing the screens saves nothing', async ({ page }) => {
  // Saved before stickers came with the star: three stars, no stickers
  const words = WORDS.slice(0, 3);
  await openApp(page, { progress: { words: starred(words) } });
  const progress = await savedProgress(page);
  expect(words.map((w) => [progress.words[w].sticker, progress.words[w].set]))
    .toEqual(beach.stickers.slice(0, 3).map((sticker) => [sticker, 'beach']));

  // From here on, only earning or changing something saves: drawing the home screen, the Grown-up corner and
  // My Trophies doesn't
  await page.evaluate(() => {
    window.savesWhileLooking = [];
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith('sightWords.')) window.savesWhileLooking.push(key);
      return setItem.call(this, key, value);
    };
    renderHome();
  });
  await openGrownupCorner(page);
  await page.locator('#panel-close').click();
  await page.locator('#trophy-meter').click();
  await page.locator('#trophy-close').click();
  expect(await page.evaluate(() => window.savesWhileLooking)).toEqual([]);
});

test('a new round started straight after "I know it!" still begins at its first word', async ({ page }) => {
  await openApp(page);
  await page.locator('#start-btn').click();
  await page.locator('#know-btn').click();
  // Home and into a new round before "I know it!"'s pause is over
  await page.locator('#home-btn').click();
  await page.locator('#start-btn').click();
  const first = await page.evaluate(() => readingRound.word);
  await page.waitForTimeout(2500); // longer than the "New sticker!" card takes
  await expect(page.locator('#word')).toHaveText(first);
  expect(await page.evaluate(() => readingRound.total - readingRound.deck.length)).toBe(1);
});

test('"I know it!" on a new word shows its sticker and word on a "New sticker!" card that holds, then flies into 🏠', async ({ page }) => {
  await openApp(page);
  await page.locator('#start-btn').click();
  const word = await page.evaluate(() => readingRound.word);

  // The page notes what appears and when, so a busy computer running the test can't miss the card
  await page.evaluate(() => {
    window.seen = { confetti: 0, toast: false };
    new MutationObserver((changes) => {
      for (const change of changes) {
        for (const el of change.addedNodes) {
          if (el.classList?.contains('confetti')) seen.confetti += 1;
          if (el.classList?.contains('new-sticker-card')) {
            Object.assign(seen, { shownAt: performance.now(), title: el.querySelector('h2').textContent,
              art: el.querySelector('.sticker-art').textContent, word: el.querySelector('.sticker-word').textContent });
          }
        }
        for (const el of change.removedNodes) if (el.classList?.contains('new-sticker-card')) seen.goneAt = performance.now();
      }
    }).observe(document.body, { childList: true });
    new MutationObserver(() => { seen.nextWordAt ??= performance.now(); }).observe(els.word, { childList: true, characterData: true, subtree: true });
    new MutationObserver(() => { seen.toast ||= els.toast.classList.contains('show'); }).observe(els.toast, { attributes: true });
  });
  await page.locator('#know-btn').click();
  await expect(page.locator('#card-star')).toBeVisible();
  await expect(page.locator('#word')).not.toHaveText(word); // the next word came
  const seen = await page.evaluate(() => window.seen);

  // The card showed the sticker and its word...
  expect(seen).toMatchObject({ title: 'New sticker!', art: beach.stickers[0], word });
  // ...long enough for a young child to see it, and the next word waited until it had gone into 🏠
  expect(seen.goneAt - seen.shownAt).toBeGreaterThanOrEqual(1500);
  expect(seen.nextWordAt).toBeGreaterThanOrEqual(seen.goneAt);
  // One thing to look at: no confetti, and no "New sticker!" pill at the top
  expect(seen.confetti).toBe(0);
  expect(seen.toast).toBe(false);
});

test('"I know it!" on a word that already has a star shows a short cheer, with no card or confetti', async ({ page }) => {
  await openApp(page, { progress: { words: starred(WORDS) } });
  await page.locator('#start-btn').click();
  const word = await page.evaluate(() => readingRound.word);
  // The page counts what's added from here on. (Those stars finish sticker sets, so the scenes' celebrations on
  // opening can still have confetti falling.)
  await page.evaluate(() => {
    window.added = { confetti: 0, card: 0 };
    new MutationObserver((changes) => {
      for (const change of changes) {
        for (const el of change.addedNodes) {
          if (el.classList?.contains('confetti')) added.confetti += 1;
          if (el.classList?.contains('new-sticker-card')) added.card += 1;
        }
      }
    }).observe(document.body, { childList: true });
  });
  await page.locator('#know-btn').click();
  await expect(page.locator('#toast')).toHaveClass(/show/);
  await expect(page.locator('#word')).not.toHaveText(word); // the next word comes after the usual short pause
  expect(await page.evaluate(() => window.added)).toEqual({ confetti: 0, card: 0 });
});

test('stickers learned in the round glow when sticker play opens, and the glow fades after 2 seconds', async ({ page }) => {
  await openApp(page, { offWords: WORDS.slice(2) }); // two words, so the round is short
  await page.locator('#start-btn').click();
  for (let i = 0; i < 2; i++) {
    await expect(page.locator('#know-btn')).toBeEnabled();
    await page.locator('#know-btn').click();
  }
  await expect(page.locator('#play-badge')).toHaveText('2', { timeout: 10_000 });

  const ringOpacity = () => page.locator('#sticker-board .sticker').evaluateAll((els) =>
    els.map((el) => Number(getComputedStyle(el, '::before').opacity) * (getComputedStyle(el, '::before').content === 'none' ? 0 : 1)));
  await page.locator('#play-toggle').click();
  await expect(page.locator('#sticker-board .sticker.fresh')).toHaveCount(2);
  expect(await ringOpacity()).toEqual([1, 1]);
  await expect.poll(ringOpacity, { timeout: 4_000 }).toEqual([0, 0]);

  // Redrawing the board (here, the screen turning) doesn't bring it back
  await page.setViewportSize({ width: 900, height: 700 });
  await page.waitForTimeout(300);
  expect(await ringOpacity()).toEqual([0, 0]);
});
