// The local server (serve.py): edits show on a normal reload, because the browser checks every file for a newer copy.
'use strict';

const { test, expect } = require('./helpers');

test('serve.py tells the browser to check each file for a newer copy, which costs nothing when it hasn\'t changed', async ({ page }) => {
  for (const file of ['/', '/index.html', '/style.css', '/js/config.js', '/words.json']) {
    const response = await page.request.get(file);
    expect(response.status(), file).toBe(200);
    expect(response.headers()['cache-control'], file).toBe('no-cache');
  }

  // An unchanged file answers "not modified", so checking it doesn't download it again
  const first = await page.request.get('/style.css');
  const again = await page.request.get('/style.css', { headers: { 'If-Modified-Since': first.headers()['last-modified'] } });
  expect(again.status()).toBe(304);
});
