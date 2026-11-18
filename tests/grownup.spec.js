// The Grown-up corner: a full-screen page that opens on Progress. Tablets switch pages with the tabs, and phones with
// the ☰ menu, which shows the page's name in place of the tabs.
'use strict';

const { test, expect, WORDS, NEXT_WORDS, openApp, savedProgress, starred, exactly, openGrownupCorner, openCornerPage } = require('./helpers');

const isPhone = (page) => page.viewportSize().width <= 600;

test('it opens on Progress, with the star count and the next words to learn', async ({ page }) => {
  await openApp(page, { progress: { words: starred(WORDS.slice(0, 3)), medals: 4 } });
  await openGrownupCorner(page);

  await expect(page.locator('#page-progress')).toBeVisible();
  await expect(page.locator('#page-words')).toBeHidden();
  await expect(page.locator('#progress-tiles')).toContainText(`3 of ${WORDS.length}`);
  await expect(page.locator('#progress-tiles')).toContainText('4 medals');
  await expect(page.locator('#next-words .gc-word')).toHaveText(WORDS.slice(3, 3 + NEXT_WORDS));
});

test('the Words page lists every word, and its buttons show only the words with a star, still learning or off', async ({ page }) => {
  const off = WORDS[5];
  await openApp(page, { progress: { words: starred(WORDS.slice(0, 3)) }, offWords: [off] });
  await openGrownupCorner(page, 'words');

  const rows = page.locator('#panel-list li');
  await expect(rows).toHaveCount(WORDS.length);
  await page.locator('#word-filters .chip', { hasText: 'Has a star' }).click();
  await expect(rows.locator('.panel-word')).toHaveText(WORDS.slice(0, 3));
  await page.locator('#word-filters .chip', { hasText: 'Learning' }).click();
  await expect(rows).toHaveCount(WORDS.length - 4);
  await page.locator('#word-filters .chip', { hasText: 'Turned off' }).click();
  await expect(rows.locator('.panel-word')).toHaveText([exactly(off)]);
});

test('phones switch pages from ☰ and show the page name; tablets use the tabs', async ({ page }) => {
  await openApp(page);
  await openGrownupCorner(page);

  if (!isPhone(page)) {
    await expect(page.locator('.gc-tabs')).toBeVisible();
    await expect(page.locator('#gc-menu-btn')).toBeHidden();
    await expect(page.locator('#gc-page-title')).toBeHidden();
    await openCornerPage(page, 'settings');
    await expect(page.locator('.gc-tab[data-page="settings"]')).toHaveAttribute('aria-selected', 'true');
    return;
  }

  await expect(page.locator('.gc-tabs')).toBeHidden();
  await expect(page.locator('#gc-page-title')).toHaveText(/Progress/);

  // A tap outside the menu closes it, and so does back, leaving the corner open
  await page.locator('#gc-menu-btn').click();
  await expect(page.locator('#gc-menu')).toBeVisible();
  await page.locator('#page-progress').click();
  await expect(page.locator('#gc-menu')).toBeHidden();
  await page.locator('#gc-menu-btn').click();
  await page.goBack({ waitUntil: 'commit' });
  await expect(page.locator('#gc-menu')).toBeHidden();
  await expect(page.locator('#parent-panel')).toBeVisible();

  // Picking a page shows it and its name, and closes the menu
  await openCornerPage(page, 'guide');
  await expect(page.locator('#gc-page-title')).toHaveText(/Guide/);
  await expect(page.locator('#gc-menu')).toBeHidden();
  await expect(page.locator('#page-progress')).toBeHidden();

  // Then back closes the corner
  await page.goBack({ waitUntil: 'commit' });
  await expect(page.locator('#parent-panel')).toBeHidden();
});

test('Reset all progress asks in a pop-up over the Settings page, which Keep everything or back closes', async ({ page }) => {
  await openApp(page, { progress: { words: starred(WORDS.slice(0, 2)) } });
  await openGrownupCorner(page, 'settings');

  const question = page.locator('#reset-confirm');
  await page.locator('#reset-btn').click();
  await expect(question).toBeVisible();
  expect(await question.evaluate((el) => el.tagName === 'DIALOG' && el.matches(':modal'))).toBe(true);
  await expect(page.locator('#page-settings')).toBeVisible(); // still there behind it
  await expect(page.locator('#reset-cancel')).toBeFocused(); // the safe answer comes first

  await page.locator('#reset-cancel').click();
  await expect(question).toBeHidden();
  await page.locator('#reset-btn').click();
  await page.goBack({ waitUntil: 'commit' });
  await expect(question).toBeHidden();
  await expect(page.locator('#parent-panel')).toBeVisible(); // back closed only the question
  const withStars = async () => Object.values((await savedProgress(page)).words).filter((w) => w.known).length;
  expect(await withStars()).toBe(2);

  await page.locator('#reset-btn').click();
  await page.locator('#reset-yes').click();
  await expect(question).toBeHidden();
  await expect(page.locator('#parent-panel')).toBeVisible();
  expect(await withStars()).toBe(0);
});
