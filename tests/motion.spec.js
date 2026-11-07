// Things that fly: a new sticker from the word card to 🏠, new stickers into the 🐵/🙈 switch, and a medal into
// the trophy pill. With motion or without (the device's "reduce motion" setting), each one lands, is counted,
// and leaves nothing behind on the screen.
'use strict';

const { test, expect, WORDS, openApp, savedProgress, exactly } = require('./helpers');

const flying = (page) => page.locator('body > .sticker.flying, body > .flying-medal');

for (const motion of ['no-preference', 'reduce']) {
  test(`new stickers and medals land, with motion set to "${motion}"`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: motion });
    await openApp(page, { offWords: WORDS.slice(2) }); // two words, so the round and the game are short
    const moving = motion === 'no-preference';

    // Each star's sticker pops out of the card and flies into 🏠 (or, without motion, doesn't fly at all)
    await page.locator('#start-btn').click();
    for (let i = 0; i < 2; i++) {
      await expect(page.locator('#know-btn')).toBeEnabled();
      await page.locator('#know-btn').click();
      if (moving) {
        await expect(flying(page)).toHaveCount(1);
        await expect(page.locator('#home-btn')).toHaveClass(/wiggle/); // it landed
      }
      await expect(flying(page)).toHaveCount(0);
    }

    // On the home screen, both fly into the 🐵/🙈 switch, which counts them as they land
    await expect(page.locator('#home')).toBeVisible();
    await expect(page.locator('#play-badge')).toHaveText('2', { timeout: 10_000 });
    await expect(flying(page)).toHaveCount(0);

    // A game's medal flies into the trophy pill, which wiggles as it lands
    await page.locator('#listen-btn').click();
    for (let i = 0; i < 2; i++) {
      await expect(page.locator('#listen-count')).toHaveText(`${i + 1} / 2`);
      const target = await page.evaluate(() => listenRound.target);
      await page.locator('#listen-choices .listen-choice').filter({ hasText: exactly(target) }).click();
    }
    await expect(page.locator('#home')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('#sticker-hint')).toContainText('You earned a gold medal!');
    if (moving) await expect(page.locator('body > .flying-medal')).toHaveCount(1);
    await expect(page.locator('#trophy-meter')).toHaveClass(/wiggle/, { timeout: 5_000 });
    await expect(flying(page)).toHaveCount(0);
    expect((await savedProgress(page)).medals).toBe(3);
  });
}
