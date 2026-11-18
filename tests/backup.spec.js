// Save or move progress (Grown-up corner, Settings): a copy saved to a file, and loaded back on this or another device.
'use strict';

const fs = require('fs');
const { test, expect, WORDS, openApp, savedProgress, savedItem, starred, openGrownupCorner } = require('./helpers');

const copyFile = (copy) => ({ name: 'sight-words-progress.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(copy)) });

test('Save a copy downloads progress, turned-off words and switches, but not the voice', async ({ page }) => {
  const progress = { words: starred(WORDS.slice(0, 2)), medals: 5 };
  await openApp(page, { progress, offWords: [WORDS[5]] });
  await page.evaluate(() => {
    saveSetting('soundEffects', false);
    localStorage.setItem(VOICE_KEY, 'some-voice');
  });
  await openGrownupCorner(page, 'settings');

  const downloading = page.waitForEvent('download');
  await page.locator('#backup-save').click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/^sight-words-progress-\d{4}-\d{2}-\d{2}\.json$/);
  const copy = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
  expect(copy).toMatchObject({ app: 'sight-words', version: 1 });
  expect(JSON.parse(copy.data['sightWords.progress.v1'])).toEqual(await savedProgress(page));
  expect(JSON.parse(copy.data['sightWords.offWords.v1'])).toEqual([WORDS[5]]);
  expect(JSON.parse(copy.data['sightWords.settings.v1'])).toEqual({ soundEffects: false });
  expect(copy.data).not.toHaveProperty('sightWords.voice.v1');
  await expect(page.locator('#backup-note')).toContainText('Saved');
});

test('Load a copy asks first, then replaces this device\'s progress with it', async ({ page }) => {
  await openApp(page, { progress: { words: starred(WORDS.slice(0, 4)) } }); // not 5, which finishes a set and celebrates
  const theirs = { words: starred(WORDS.slice(0, 2)), medals: 7 };
  const copy = {
    app: 'sight-words', version: 1, savedAt: '2026-11-01T10:00:00.000Z',
    data: { 'sightWords.progress.v1': JSON.stringify(theirs), 'sightWords.offWords.v1': JSON.stringify([WORDS[9]]) },
  };
  await openGrownupCorner(page, 'settings');

  // Keep this device's, or back, changes nothing
  await page.locator('#backup-file').setInputFiles(copyFile(copy));
  await expect(page.locator('#load-confirm')).toBeVisible();
  await expect(page.locator('#load-detail')).toContainText('2 words with a star');
  await page.locator('#load-cancel').click();
  await expect(page.locator('#load-confirm')).toBeHidden();
  await page.locator('#backup-file').setInputFiles(copyFile(copy));
  await page.goBack({ waitUntil: 'commit' });
  await expect(page.locator('#load-confirm')).toBeHidden();
  await expect(page.locator('#parent-panel')).toBeVisible();
  expect(Object.values((await savedProgress(page)).words).filter((w) => w.known)).toHaveLength(4);

  // Yes, load it: the app reloads with the copy
  await page.locator('#backup-file').setInputFiles(copyFile(copy));
  await page.locator('#load-yes').click();
  await page.waitForEvent('load');
  await expect(page.locator('#start-btn')).toBeEnabled();
  expect(await savedProgress(page)).toMatchObject({ medals: 7 });
  expect(Object.values((await savedProgress(page)).words).filter((w) => w.known)).toHaveLength(2);
  expect(JSON.parse(await savedItem(page, 'sightWords.offWords.v1'))).toEqual([WORDS[9]]);
});

test('a file that isn\'t a Sight Words copy is turned away, and nothing changes', async ({ page }) => {
  await openApp(page, { progress: { words: starred(WORDS.slice(0, 3)) } });
  await openGrownupCorner(page, 'settings');
  await page.locator('#backup-file').setInputFiles(copyFile({ hello: 'world' }));
  await expect(page.locator('#backup-note')).toHaveText('That file isn’t a copy saved by Sight Words.');
  await expect(page.locator('#load-confirm')).toBeHidden();
  expect(Object.values((await savedProgress(page)).words).filter((w) => w.known)).toHaveLength(3);
});
