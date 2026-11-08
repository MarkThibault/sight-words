// The privacy page (privacy.html): the link the app store asks for, also linked from the grown-up guide. It opens in
// its own tab, so the app stays as it was behind it.
'use strict';

const { test, expect, openApp, openGrownupCorner } = require('./helpers');

test('the grown-up guide links to the privacy page, which opens in its own tab and asks nothing of another site', async ({ page, context, baseURL }) => {
  await openApp(page);
  await openGrownupCorner(page);
  await page.locator('#guide-btn').click();

  const elsewhere = [];
  context.on('request', (request) => {
    const url = new URL(request.url());
    if (url.protocol !== 'data:' && url.origin !== new URL(baseURL).origin) elsewhere.push(request.url());
  });
  const opening = context.waitForEvent('page');
  await page.locator('#guide-body a[href="privacy.html"]').click();
  const privacy = await opening;
  const errors = [];
  privacy.on('pageerror', (err) => errors.push(err.message));
  await privacy.waitForLoadState('load');

  await expect(privacy).toHaveTitle(/Privacy/);
  await expect(privacy.locator('h1')).toContainText('Privacy');
  // In the app's own font, like the rest of the app
  expect(await privacy.evaluate(async () => (await document.fonts.load('16px Andika')).length)).toBe(1);
  expect(elsewhere).toEqual([]);
  expect(errors).toEqual([]);

  // The app is still there behind it, with the guide open
  await expect(page.locator('#panel-guide')).toBeVisible();
});
