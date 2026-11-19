// Needs practice, in the Grown-up corner: the games note each word's tries and reading rounds note words skipped
// without a star, and the corner lists the words that need more practice. The child never sees any of it.
'use strict';

const { test, expect, WORDS, PRACTICE, SHORT_GAME, openApp, savedProgress, starred, exactly, openGrownupCorner, openCornerPage } = require('./helpers');

const triesOf = async (page, word) => (await savedProgress(page)).words[word].tries;

test('Listen & tap notes the word tapped by mistake, Build the word a wrong tile, and right the first time a 1', async ({ page }) => {
  await openApp(page, { offWords: SHORT_GAME });

  await page.locator('#listen-btn').click();
  const choices = page.locator('#listen-choices .listen-choice');
  const first = await page.evaluate(() => listenRound.target);
  const wrong = choices.filter({ hasNotText: exactly(first) }).first();
  const wrongWord = await wrong.textContent();
  await wrong.click();
  await page.locator('#listen-choices .listen-choice:not([disabled])').filter({ hasText: exactly(first) }).click();
  await expect.poll(() => triesOf(page, first)).toEqual([wrongWord]);
  await expect(page.locator('#listen-count')).toHaveText(/^2 \//, { timeout: 10_000 });
  const second = await page.evaluate(() => listenRound.target);
  await choices.filter({ hasText: exactly(second) }).click();
  await expect.poll(() => triesOf(page, second)).toEqual([1]);
  await page.locator('#listen-home-btn').click();

  await page.locator('#build-btn').click();
  await page.waitForFunction(() => buildRound && !buildRound.busy && buildRound.next === 0);
  const target = await page.evaluate(() => buildRound.target);
  const parts = await page.evaluate(() => buildRound.parts.map(([letters]) => letters));
  await page.locator('#build-tiles .build-tile').filter({ hasNotText: exactly(parts[0]) }).first().click();
  for (const letters of parts) {
    await page.waitForFunction(() => !buildRound.busy);
    await page.locator('#build-tiles .build-tile:not(.used)').filter({ hasText: exactly(letters) }).first().click();
  }
  const before = target === first ? [wrongWord] : target === second ? [1] : [];
  await expect.poll(() => triesOf(page, target)).toEqual([...before, 0]);
});

test('Next on a word without a star counts a skipped round, and a star clears the count', async ({ page }) => {
  const skippedBefore = Object.fromEntries(WORDS.map((w) => [w, { heard: 0, known: false, knownAt: 0, lastSeen: null, skipped: 5 }]));
  await openApp(page, { progress: { words: skippedBefore } });
  await page.locator('#start-btn').click();

  const first = await page.locator('#word').textContent();
  await page.locator('#card').click(); // hearing it
  await page.locator('#next-btn').click();
  await expect(page.locator('#word')).not.toHaveText(first);
  expect((await savedProgress(page)).words[first].skipped).toBe(6);

  const second = await page.locator('#word').textContent();
  await page.locator('#know-btn').click();
  await expect.poll(async () => (await savedProgress(page)).words[second].known).toBe(true);
  expect((await savedProgress(page)).words[second].skipped).toBeUndefined();
});

test('Next in a Timed run does not count a skipped round, since it is a race', async ({ page }) => {
  await openApp(page, { offWords: WORDS.slice(2) });
  await page.locator('#timed-btn').click();
  const first = await page.locator('#word').textContent();
  await page.locator('#card').click(); // hearing it
  await page.locator('#next-btn').click();
  await expect(page.locator('#word')).not.toHaveText(first);
  expect((await savedProgress(page)).words[first].skipped).toBeUndefined();
});

test('Progress lists the words that need practice, with why, and the Words page marks them', async ({ page }) => {
  const [was, said, of, almost, off] = ['was', 'said', 'of', 'the', 'my'];
  const words = {
    ...starred([said]),
    [was]: { heard: 2, known: false, tries: [1, 'saw', 'saw', 0, 'you', 1] },
    [of]: { heard: 1, known: false, skipped: PRACTICE.STUCK },
    [almost]: { heard: 1, known: false, tries: [0, 0, 1], skipped: PRACTICE.STUCK - 1 }, // not yet
    [off]: { heard: 1, known: false, tries: [0, 0, 0] }, // turned off, so not listed
  };
  words[said].tries = [0, 1, 0, 0, 1, 1];
  await openApp(page, { progress: { words }, offWords: [off] });
  await openGrownupCorner(page);

  const rows = page.locator('#practice-list li');
  await expect(rows.locator('.practice-word')).toHaveText([was, said, of]); // the most missed first
  await expect(rows.nth(0)).toContainText('Missed 4 of the last 6 tries in games · mixed up with saw 2×');
  await expect(rows.nth(1)).toContainText('Missed 3 of the last 6 tries in games · has a star');
  await expect(rows.nth(2)).toContainText(`Skipped in ${PRACTICE.STUCK} reading rounds, no star yet`);
  await expect(page.locator('#practice-empty')).toBeHidden();

  await openCornerPage(page, 'words');
  await page.locator('#word-filters .chip', { hasText: 'Needs practice' }).click();
  await expect(page.locator('#panel-list .panel-word')).toHaveText([/said/, /of/, /was/]); // in learning order
  await expect(page.locator('#panel-list .practice-mark')).toHaveCount(3);
});

test(`right the first time ${PRACTICE.CLEAR} times in a row takes a word off, and older misses stop counting`, async ({ page }) => {
  await openApp(page, { progress: { words: { was: { heard: 1, known: false, tries: ['saw', 'saw', 0] } } } });
  await openGrownupCorner(page);
  await expect(page.locator('#practice-list .practice-word')).toHaveText(['was']);
  await page.locator('#panel-close').click();

  const tries = await page.evaluate((clear) => {
    for (let i = 0; i < clear; i++) noteTry('was', 1);
    noteTry('was', 0); // one more miss alone doesn't put it back
    return stats('was').tries;
  }, PRACTICE.CLEAR);
  expect(tries).toEqual([...Array(PRACTICE.CLEAR).fill(1), 0]);
  await openGrownupCorner(page);
  await expect(page.locator('#practice-list li')).toHaveCount(0);
  await expect(page.locator('#practice-empty')).toBeVisible();
});

test(`Progress shows at most ${PRACTICE.SHOW} words, and says how many more the Words page marks`, async ({ page }) => {
  const missed = WORDS.slice(0, PRACTICE.SHOW + 2);
  await openApp(page, { progress: { words: Object.fromEntries(missed.map((w) => [w, { heard: 1, known: false, tries: [0, 0, 0] }])) } });
  await openGrownupCorner(page);
  await expect(page.locator('#practice-list li')).toHaveCount(PRACTICE.SHOW);
  await expect(page.locator('#practice-more')).toHaveText('And 2 more, marked 🧡 on the Words page.');
});

test('▶ Practice these words plays a reading round of just those words, and a tip names them for practice away from the screen', async ({ page }) => {
  const words = {
    was: { heard: 1, known: false, tries: ['saw', 'saw', 'saw', 0] },
    said: { heard: 1, known: false, tries: [0, 0, 0] },
    of: { heard: 1, known: false, skipped: PRACTICE.STUCK },
  };
  await openApp(page, { progress: { words } });
  await openGrownupCorner(page);
  await expect(page.locator('#practice-tip')).toContainText('Try away from the screen');
  await expect(page.locator('#practice-tip i')).toHaveText(['was', 'said']); // the two that need it most

  // The corner closes, and the round waits for the child to tap Let's read, after the hand-off
  await page.locator('#practice-start').click();
  await expect(page.locator('#parent-panel')).toBeHidden();
  await expect(page.locator('#handoff')).toBeVisible();
  await expect(page.locator('#handoff')).toContainText('Hand it to your child');
  await expect(page.locator('#practice')).toBeHidden();
  await page.locator('#handoff-go').click();
  await expect(page.locator('#handoff')).toBeHidden();
  await expect(page.locator('#practice')).toBeVisible();
  const shown = [];
  for (let i = 0; i < 3; i++) {
    const word = await page.locator('#word').textContent();
    shown.push(word);
    await page.locator('#card').click(); // hearing it
    await page.locator('#next-btn').click();
    if (i < 2) await expect(page.locator('#word')).not.toHaveText(word);
  }
  expect(shown.sort()).toEqual(['of', 'said', 'was']);
  await expect(page.locator('#home')).toBeVisible();
  await expect(page.locator('#sticker-hint')).toContainText('You read 3 words!');
});

test('the hand-off before practice closes with Not now or back, and no round starts', async ({ page }) => {
  await openApp(page, { progress: { words: { said: { heard: 1, known: false, tries: [0, 0, 0] } } } });
  await openGrownupCorner(page);
  await page.locator('#practice-start').click();
  await expect(page.locator('#handoff-go')).toBeFocused(); // ready for the child's tap
  await page.locator('#handoff-cancel').click();
  await expect(page.locator('#handoff')).toBeHidden();
  await expect(page.locator('#home')).toBeVisible();

  await openGrownupCorner(page);
  await page.locator('#practice-start').click();
  await page.goBack({ waitUntil: 'commit' });
  await expect(page.locator('#handoff')).toBeHidden();
  await expect(page.locator('#home')).toBeVisible();
  await expect(page.locator('#practice')).toBeHidden();
});

test('with nothing to practice, there is no tip and no button to practice', async ({ page }) => {
  await openApp(page);
  await openGrownupCorner(page);
  await expect(page.locator('#practice-empty')).toBeVisible();
  await expect(page.locator('#practice-tip')).toBeHidden();
  await expect(page.locator('#practice-start')).toBeHidden();
});

test('"Practice it" in a Check-up keeps the star and sticker, and lists the word under Needs practice until "I know it!"', async ({ page }) => {
  const known = WORDS.slice(0, 3);
  await openApp(page, { progress: { words: starred(known) }, offWords: WORDS.slice(3) });
  const before = await savedProgress(page);

  await page.locator('#checkup-btn').click();
  await expect(page.locator('#next-btn')).toHaveText('🔁 Practice it');
  const word = await page.evaluate(() => readingRound.word);
  await page.locator('#card').click(); // hearing it
  await page.locator('#next-btn').click();
  await expect(page.locator('#word')).not.toHaveText(word);

  // Nothing is taken away, and the grown-up sees it under Needs practice
  let saved = (await savedProgress(page)).words[word];
  expect(saved).toMatchObject({ known: true, sticker: before.words[word].sticker, set: before.words[word].set, forgot: true });
  await page.locator('#home-btn').click();
  await openGrownupCorner(page);
  const row = page.locator('#practice-list li').filter({ hasText: word });
  await expect(row).toContainText('Picked Practice it in a Check-up');
  await expect(row).toContainText('has a star');
  await page.locator('#panel-close').click();

  // Other rounds keep Next; "I know it!" on it, read alone, takes it off the list
  await page.locator('#start-btn').click();
  await expect(page.locator('#next-btn')).toHaveText('Next ➜');
  while (await page.evaluate(() => readingRound.word) !== word) {
    await expect(page.locator('#know-btn')).toBeEnabled();
    await page.locator('#know-btn').click();
    await page.waitForFunction(() => !readingRound.busy);
  }
  await page.locator('#know-btn').click();
  await expect.poll(async () => (await savedProgress(page)).words[word].forgot).toBeUndefined();
});
