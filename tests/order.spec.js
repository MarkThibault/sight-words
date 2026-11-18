// Learning words in order: words.json lists the words in the order to learn them, and every reading round and game
// but Check-up includes the next NEXT_WORDS words without a star, so they keep coming back until they're learned.
// Check-up is only words with a star, the ones not seen for the longest.
'use strict';

const { test, expect, WORDS, openApp, starred } = require('./helpers');

const NEXT = 4;
const FIRST_WORDS = ['I', 'a', 'the', 'can', 'see', 'is', 'my', 'to', 'we', 'and']; // the approved order's start

// The words in the round or game that just started.
const roundWords = {
  practice: (page) => page.evaluate(() => [readingRound.word, ...readingRound.deck]),
  listen: (page) => page.evaluate(() => [listenRound.target, ...listenRound.deck]),
  build: (page) => page.evaluate(() => [buildRound.target, ...buildRound.deck]),
};

// Stars on the first three words, and the next words shown in every activity a moment ago. Before this change,
// rounds picked the words not shown for the longest, so these would be left out.
function progressWithNextJustShown(next) {
  const words = starred(WORDS.slice(0, 3));
  const now = Date.now();
  for (const word of next) words[word] = { heard: 1, known: false, seenAt: now, listenAt: now, buildAt: now };
  return { words };
}

test('words.json lists the words in the approved learning order', () => {
  expect(WORDS.slice(0, FIRST_WORDS.length)).toEqual(FIRST_WORDS);
});

for (const [name, button, screen] of [
  ["Let's Read", '#start-btn', 'practice'],
  ['Listen & tap', '#listen-btn', 'listen'],
  ['Build the word', '#build-btn', 'build'],
]) {
  test(`${name} always includes the next ${NEXT} words without a star`, async ({ page }) => {
    const next = WORDS.slice(3, 3 + NEXT);
    await openApp(page, { progress: progressWithNextJustShown(next) });
    await page.locator(button).click();
    const words = await roundWords[screen](page);
    expect(words).toEqual(expect.arrayContaining(next));
  });
}

test('turned-off words are skipped when choosing the next words', async ({ page }) => {
  const off = WORDS[4];
  const next = [WORDS[3], ...WORDS.slice(5, 5 + NEXT - 1)];
  await openApp(page, { progress: progressWithNextJustShown(next), offWords: [off] });
  await page.locator('#start-btn').click();
  const words = await roundWords.practice(page);
  expect(words).toEqual(expect.arrayContaining(next));
  expect(words).not.toContain(off);
});

test('Check-up waits for the first star', async ({ page }) => {
  await openApp(page);
  await expect(page.locator('#checkup-btn')).toBeDisabled();
});

test('Check-up plays only words with a star, the ones not seen for the longest', async ({ page }) => {
  // 12 words with a star: the first 10 seen long ago, the last 2 just now
  const now = Date.now();
  const words = starred(WORDS.slice(0, 12), (word, i) => ({ seenAt: i < 10 ? now - 86_400_000 * (20 - i) : now }));
  await openApp(page, { progress: { words, scenes: ['beach', 'space'] } }); // scenes already unlocked, so no celebration
  await expect(page.locator('#checkup-btn')).toBeEnabled();
  await page.locator('#checkup-btn').click();
  const round = await roundWords.practice(page);
  expect(round.sort()).toEqual(WORDS.slice(0, 10).sort());

  for (let i = 0; i < round.length; i++) {
    await expect(page.locator('#know-btn')).toBeEnabled();
    await page.locator('#know-btn').click();
  }
  await expect(page.locator('#sticker-hint')).toContainText('You checked 10 words!', { timeout: 15_000 });
});
