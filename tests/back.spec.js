// The back button (Android's, or the browser's): it closes whatever is on top, one thing at a time, and on the home
// screen with nothing open it leaves the app. The app adds a history entry for each thing open, so "nothing left to
// close" means the page is back on its own first entry (history.state is null).
'use strict';

const { test, expect, WORDS, openApp, starred, openGrownupCorner } = require('./helpers');

const appEntry = (page) => page.evaluate(() => history.state);

// Back, then a moment for the app to tidy up the history entries it keeps.
async function back(page) {
  await page.goBack({ waitUntil: 'commit' });
  await page.waitForTimeout(100);
}

test('back from a reading round or either game goes home, and back on the home screen leaves the app', async ({ page }) => {
  await openApp(page);
  for (const [button, screen, round] of [
    ['#start-btn', '#practice', 'readingRound'],
    ['#listen-btn', '#listen', 'listenRound'],
    ['#build-btn', '#build', 'buildRound'],
  ]) {
    await page.locator(button).click();
    await expect(page.locator(screen)).toBeVisible();
    await back(page);
    await expect(page.locator('#home')).toBeVisible();
    await expect(page.locator(screen)).toBeHidden();
    expect(await page.evaluate((name) => (0, eval)(name), round)).toBeNull(); // the round or game stopped
    expect(await appEntry(page)).toBeNull(); // so the next back leaves the app
  }
});

test('back closes a pop-up and stays on the home screen', async ({ page }) => {
  await openApp(page);
  await page.locator('#trophy-meter').click();
  await expect(page.locator('#trophy-panel')).toBeVisible();
  await back(page);
  await expect(page.locator('#trophy-panel')).toBeHidden();
  await expect(page.locator('#home')).toBeVisible();
  expect(await appEntry(page)).toBeNull();

  await openGrownupCorner(page);
  await back(page);
  await expect(page.locator('#parent-panel')).toBeHidden();
  await expect(page.locator('#home')).toBeVisible();
  expect(await appEntry(page)).toBeNull();
});

test('in sticker play, back closes a pop-up first, then switches sticker play off', async ({ page }) => {
  await openApp(page, { progress: { words: starred(WORDS.slice(0, 2)) } });
  await page.locator('#play-toggle').click();
  await page.locator('#trophy-btn').click();
  await expect(page.locator('#trophy-panel')).toBeVisible();

  await back(page);
  await expect(page.locator('#trophy-panel')).toBeHidden();
  await expect(page.locator('#play-toggle')).toHaveAttribute('aria-checked', 'true');
  await back(page);
  await expect(page.locator('#play-toggle')).toHaveAttribute('aria-checked', 'false');
  expect(await appEntry(page)).toBeNull();
});

test('closing things with their own buttons, or by themselves, leaves no extra back steps', async ({ page }) => {
  await openApp(page, { offWords: WORDS.slice(1) }); // one word on, so a round is one word long
  // A round that ends by itself
  await page.locator('#start-btn').click();
  await page.locator('#know-btn').click();
  await expect(page.locator('#home')).toBeVisible();
  // 🏠 out of a round
  await page.locator('#start-btn').click();
  await page.locator('#home-btn').click();
  // The ✕ on a pop-up
  await page.locator('#trophy-meter').click();
  await page.locator('#trophy-close').click();
  // Sticker play on and off with its switch
  await page.locator('#play-toggle').click();
  await page.locator('#play-toggle').click();
  await page.waitForTimeout(100);
  expect(await appEntry(page)).toBeNull();
});
