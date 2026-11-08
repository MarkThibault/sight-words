// The Andika font comes with the app (fonts/), so it shows on the first visit with no other site to reach, and the
// app asks nothing of any other site.
'use strict';

const { test, expect, openApp } = require('./helpers');

// The weights of the Andika faces the page has loaded, for the regular and bold text the app uses.
const loadedAndika = (page) => page.evaluate(async () => {
  const faces = [...await document.fonts.load('16px Andika'), ...await document.fonts.load('700 16px Andika')];
  return faces.map((face) => face.weight);
});

test('the font comes from the app itself, and nothing is asked of another site', async ({ page, baseURL }) => {
  const elsewhere = [];
  const ownFonts = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.protocol === 'data:') return;
    if (url.origin !== new URL(baseURL).origin) elsewhere.push(request.url());
    else if (/^\/fonts\/andika-[a-z]+\.woff2$/.test(url.pathname)) ownFonts.push(url.pathname);
  });

  await openApp(page);
  await page.waitForLoadState('load');
  expect(await loadedAndika(page)).toEqual(['400', '700']);
  expect(ownFonts.sort()).toEqual(['/fonts/andika-bold.woff2', '/fonts/andika-regular.woff2']);
  expect(elsewhere).toEqual([]);
});
