// The Grown-up corner: a full-screen page that opens on Progress. Tablets switch pages with the tabs, and phones with
// the ☰ menu, which shows the page's name in place of the tabs.
'use strict';

const { test, expect, WORDS, NEXT_WORDS, openApp, savedProgress, starred, exactly, panelRow, openGrownupCorner, openCornerPage } = require('./helpers');

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

test('the tabs work as tabs: linked to their pages, and the arrow keys move between them', async ({ page }) => {
  test.skip(isPhone(page), 'phones use the ☰ menu instead of tabs');
  await openApp(page);
  await openGrownupCorner(page);

  // Each tab names the page it shows, and each page is named by its tab
  for (const name of ['progress', 'words', 'settings', 'guide']) {
    const tab = page.locator(`.gc-tab[data-page="${name}"]`);
    await expect(tab).toHaveAttribute('aria-controls', `page-${name}`);
    await expect(page.locator(`#page-${name}`)).toHaveAttribute('aria-labelledby', await tab.getAttribute('id'));
  }
  // Only the page shown is in the Tab key's order; the arrows move between them
  const selected = page.locator('.gc-tab[aria-selected="true"]');
  await expect(selected).toHaveAttribute('data-page', 'progress');
  await expect(page.locator('.gc-tab[tabindex="0"]')).toHaveCount(1);
  await selected.focus();
  await page.keyboard.press('ArrowRight');
  await expect(selected).toHaveAttribute('data-page', 'words');
  await expect(selected).toBeFocused();
  await expect(page.locator('#page-words')).toBeVisible();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft'); // past the first, round to the last
  await expect(selected).toHaveAttribute('data-page', 'guide');
  await expect(page.locator('#page-guide')).toBeVisible();
  await page.keyboard.press('Home');
  await expect(selected).toHaveAttribute('data-page', 'progress');
  await page.keyboard.press('End');
  await expect(selected).toHaveAttribute('data-page', 'guide');
  await expect(page.locator('.gc-tab[tabindex="0"]')).toHaveAttribute('data-page', 'guide');
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

// Midnight on the Sunday `weeksAgo` weeks back, as the app counts weeks, and a date as the app saves it.
function sunday(weeksAgo) {
  const day = new Date();
  day.setHours(0, 0, 0, 0);
  day.setDate(day.getDate() - day.getDay() - 7 * weeksAgo);
  return day;
}
const dateOf = (day) => day.toLocaleDateString('en-CA');

test('This week shows the days played and the new stars, and ‹ shows last week', async ({ page }) => {
  const lastSunday = sunday(1);
  const words = starred([WORDS[0], WORDS[1], WORDS[2]], (word, i) => ({
    knownAt: [sunday(3).getTime(), lastSunday.getTime() + 3_600_000, Date.now()][i], // weeks ago, last week, now
  }));
  await openApp(page, { progress: { words, daysPlayed: [dateOf(lastSunday), dateOf(new Date())] } });
  await openGrownupCorner(page);

  await expect(page.locator('#week-title')).toHaveText('📅 This week');
  await expect(page.locator('#week-days .week-day')).toHaveCount(7);
  await expect(page.locator('#week-days .played')).toHaveCount(1);
  await expect(page.locator('#week-days .today')).toHaveClass(/played/);
  await expect(page.locator('#week-played')).toHaveText('Played on 1 day');
  await expect(page.locator('#week-stars .gc-word')).toHaveText([WORDS[2]]);
  await expect(page.locator('#week-next')).toBeDisabled();

  await page.locator('#week-prev').click();
  await expect(page.locator('#week-title')).toHaveText('📅 Last week');
  await expect(page.locator('#week-days .played')).toHaveCount(1);
  await expect(page.locator('#week-days .week-day').first()).toHaveClass(/played/);
  await expect(page.locator('#week-days .week-day').first()).toHaveAttribute('title', 'Sunday: played'); // weeks start on Sunday
  await expect(page.locator('#week-stars .gc-word')).toHaveText([WORDS[1]]);
  await expect(page.locator('#week-prev')).toBeDisabled();
  await page.locator('#week-next').click();
  await expect(page.locator('#week-title')).toHaveText('📅 This week');

  // A star given on the Words page is the grown-up's, so it isn't a new star for the child
  await openCornerPage(page, 'words');
  await panelRow(page, WORDS[3]).locator('.chip').click();
  await openCornerPage(page, 'progress');
  await expect(page.locator('#week-stars .gc-word')).toHaveText([WORDS[2]]);
});

test('starting a round or game saves today as a day played, even when it is left early, keeping only this week and last', async ({ page }) => {
  const old = dateOf(sunday(2));
  const lastWeek = dateOf(sunday(1));
  await openApp(page, { progress: { words: {}, daysPlayed: [old, lastWeek] } });
  await page.locator('#start-btn').click();
  await page.locator('#home-btn').click(); // left before the end
  expect((await savedProgress(page)).daysPlayed).toEqual([lastWeek, dateOf(new Date())]);

  // A game started on a new day counts too
  await page.evaluate(() => { state.progress.daysPlayed = []; });
  await page.locator('#listen-btn').click();
  await expect(page.locator('#listen')).toBeVisible();
  expect((await savedProgress(page)).daysPlayed).toEqual([dateOf(new Date())]);
});
