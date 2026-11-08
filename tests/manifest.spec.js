// The app's manifest (manifest.webmanifest): what installing it, and the app store package built from it, read
// for the app's name, identity, language, category and icons.
'use strict';

const { test, expect, openApp } = require('./helpers');

// The manifest the page links to, with its address, so relative links in it resolve as the browser resolves them.
async function readManifest(page) {
  return page.evaluate(async () => {
    const url = new URL(document.querySelector('link[rel="manifest"]').href);
    return { url: url.href, manifest: await (await fetch(url)).json() };
  });
}

test('the manifest gives the app a fixed identity, its language and category, and icons of the sizes it says', async ({ page }) => {
  await openApp(page);
  const { url, manifest } = await readManifest(page);
  const startUrl = new URL(manifest.start_url, url).href;

  // The id is the app's identity for installs and the store. It must stay the address apps were installed from before
  // it was set (the start page), or installed copies would count as a different app.
  expect(new URL(manifest.id, startUrl).href).toBe(startUrl);
  expect(manifest.name).toBeTruthy();
  expect(manifest.short_name.length).toBeLessThanOrEqual(12); // fits under a home-screen icon
  expect(manifest.description).toBeTruthy();
  expect(manifest.lang).toBe('en');
  expect(manifest.dir).toBe('ltr');
  expect(manifest.categories).toEqual(expect.arrayContaining(['education', 'kids']));
  expect(manifest.display).toBe('standalone');

  // Every icon is there at the size it claims, with a maskable one for Android's shaped icons
  expect(manifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(true);
  for (const icon of manifest.icons) {
    const size = await page.evaluate(async (src) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      return `${img.naturalWidth}x${img.naturalHeight}`;
    }, new URL(icon.src, url).href);
    expect(size, icon.src).toBe(icon.sizes);
  }
});
