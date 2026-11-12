// Learning words in order: words.json lists the words in the order to learn them, and every reading round and game
// includes the next NEXT_WORDS words without a star, so they keep coming back until they're learned.
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
  ['Missing words', '#missing-btn', 'practice'],
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
