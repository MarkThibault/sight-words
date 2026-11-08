// Turning words off in the Grown-up corner: a word that's off is skipped everywhere, and at least one stays on.
'use strict';

const { test, expect, WORDS, openApp, savedProgress, starred, exactly, panelRow, openGrownupCorner } = require('./helpers');

const ON = WORDS.slice(0, 4);
const offWords = WORDS.filter((word) => !ON.includes(word));

test('a turned-off word is skipped in rounds and games, and its sticker hides until it\'s back on', async ({ page }) => {
  const starredOff = offWords[0];
  await openApp(page, { progress: { words: starred([starredOff], () => ({ sticker: '🐶' })) }, offWords });
  await expect(page.locator('#sticker-board .sticker')).toHaveCount(0); // its sticker is hidden

  // Let's Read shows only the words that are on
  await page.locator('#start-btn').click();
  const shown = [];
  for (let i = 0; i < ON.length; i++) {
    shown.push(await page.evaluate(() => readingRound.word));
    await page.locator('#card').click();
    await page.locator('#next-btn').click();
  }
  await expect(page.locator('#home')).toBeVisible();
  expect(shown.sort()).toEqual([...ON].sort());

  // So does Listen & tap, in its words and in every choice
  await page.locator('#listen-btn').click();
  for (let i = 0; i < ON.length; i++) {
    await expect(page.locator('#listen-count')).toHaveText(`${i + 1} / ${ON.length}`);
    const choices = await page.locator('#listen-choices .listen-choice').allTextContents();
    expect(choices.filter((word) => !ON.includes(word))).toEqual([]);
    const target = await page.evaluate(() => listenRound.target);
    await page.locator('#listen-choices .listen-choice').filter({ hasText: exactly(target) }).click();
  }
  await expect(page.locator('#home')).toBeVisible({ timeout: 15_000 });

  // Turned back on, its star and sticker return
  await openGrownupCorner(page);
  await panelRow(page, starredOff).locator('.word-switch').click();
  await page.locator('#panel-close').click();
  await expect(page.locator('#sticker-board .sticker-word').filter({ hasText: exactly(starredOff) })).toHaveCount(1);
  expect(JSON.parse(await page.evaluate(() => localStorage.getItem('sightWords.offWords.v1')))).not.toContain(starredOff);
  expect((await savedProgress(page)).words[starredOff]).toMatchObject({ known: true, sticker: '🐶' });
});

test('the last word that\'s on can\'t be turned off', async ({ page }) => {
  const last = WORDS[0];
  await openApp(page, { offWords: WORDS.slice(1) });
  await expect(page.locator('#listen-note')).toHaveText('Needs 2 words');
  await expect(page.locator('#listen-btn')).toBeDisabled();

  await openGrownupCorner(page);
  await expect(panelRow(page, last).locator('.word-switch')).toBeDisabled();
  await expect(panelRow(page, last).locator('.word-switch')).toBeChecked();
  // Turning a second word on lets the first one go off again
  await panelRow(page, WORDS[1]).locator('.word-switch').click();
  await expect(panelRow(page, last).locator('.word-switch')).toBeEnabled();
});
