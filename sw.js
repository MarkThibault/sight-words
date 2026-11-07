'use strict';

// Offline play: saves the app, the font and the recordings on the device when it installs.
// SW_VERSION is raised with APP_VERSION by .github/scripts/bump-version.sh. That change is what tells devices to update.

const SW_VERSION = '1.23.4';
const APP_CACHE = `sight-words-${SW_VERSION}`;
const FONT_CACHE = 'sight-words-fonts'; // kept across versions, since the font doesn't change
const FONT_CSS = 'https://fonts.googleapis.com/css2?family=Andika:wght@400;700&display=swap';
const NETWORK_WAIT_MS = 3000; // how long a slow connection gets before the saved copy is used

importScripts(`js/phonics.js?v=${SW_VERSION}`); // for which sounds each word uses

const fresh = (url) => new Request(url, { cache: 'reload' });

async function saveApp(cache) {
  const html = await (await fetch(fresh('index.html'))).text();
  // Every file index.html links with a version stamp, so a new script is picked up automatically.
  const files = [...html.matchAll(/(?:src|href)="([^"]+\?v=[^"]+)"/g)].map((match) => match[1]);
  await cache.addAll(['./', 'index.html', 'words.json', ...files].map(fresh));
}

// A clip that fails to save isn't fatal: the app falls back to the device's voice for it.
async function saveRecordings(cache) {
  const words = await (await cache.match('words.json')).json();
  const sounds = new Set(words.flatMap(wordSounds));
  const clips = [
    ...words.map((word) => `audio/words/${encodeURIComponent(word)}.wav`),
    ...[...sounds].map((id) => `audio/sounds/${id}.wav`),
  ];
  await Promise.allSettled(clips.map((clip) => cache.add(fresh(`${clip}?v=${SW_VERSION}`))));
}

// Only the Latin letters are saved, since that's all the word list uses. Without a connection this is skipped.
async function saveFont() {
  const cache = await caches.open(FONT_CACHE);
  const response = await fetch(FONT_CSS);
  await cache.put(FONT_CSS, response.clone());
  const css = await response.text();
  const latin = [...css.matchAll(/\/\* latin \*\/[^}]*?url\(([^)]+)\)/g)].map((match) => match[1]);
  await Promise.allSettled(latin.map((url) => cache.add(url)));
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(APP_CACHE);
    await saveApp(cache);
    await saveRecordings(cache);
    await saveFont().catch(() => {});
  })());
});

// A new version waits until the app asks it to take over (see js/offline.js).
self.addEventListener('message', (event) => {
  if (event.data === 'activate') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name !== APP_CACHE && name !== FONT_CACHE).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

const timeout = (ms) => new Promise((resolve, reject) => setTimeout(() => reject(new Error('slow')), ms));

// The page and word list: the latest when online, so updates and new words arrive; otherwise the saved copy.
async function networkFirst(request) {
  const cache = await caches.open(APP_CACHE);
  try {
    const response = await Promise.race([fetch(request), timeout(NETWORK_WAIT_MS)]);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch (e) {
    return (await cache.match(request, { ignoreSearch: true })) || cache.match('index.html');
  }
}

// Files with a version stamp never change, so a saved copy is always right.
async function savedFirst(request) {
  return (await caches.match(request, { ignoreVary: true })) || fetch(request);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const { origin, pathname } = new URL(request.url);
  if (origin === self.location.origin) {
    const isFresh = request.mode === 'navigate' || pathname.endsWith('/words.json');
    event.respondWith(isFresh ? networkFirst(request) : savedFirst(request));
  } else if (origin === 'https://fonts.googleapis.com' || origin === 'https://fonts.gstatic.com') {
    event.respondWith(savedFirst(request));
  }
});
