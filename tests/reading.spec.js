// Let's Read, stars and stickers: only "I know it!" earns them, and they fill the sticker sets in order.
'use strict';

const { test, expect, WORDS, STICKER_SETS, SET_SIZE, openApp, savedProgress, starred, openGrownupCorner } = require('./helpers');

const [beach, space] = STICKER_SETS;
const knownInOrder = (progress) => Object.entries(progress.words)
  .filter(([, s]) => s.known).sort(([, a], [, b]) => a.knownAt - b.knownAt);

test('a round of Let\'s Read fills the sticker sets in order and unlocks their scenes', async ({ page }) => {
  await openApp(page);
  await page.locator('#start-btn').click();
  const total = await page.evaluate(() => round.total);
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
  const word = await page.evaluate(() => current);
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
