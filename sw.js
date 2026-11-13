'use strict';

// Offline play: saves the app, the font and the recordings on the device when it installs.
// SW_VERSION is raised with APP_VERSION by .github/scripts/bump-version.sh. That change is what tells devices to update.

const SW_VERSION = '1.32.2';
const APP_CACHE = `sight-words-${SW_VERSION}`;
const FONT_FILES = ['fonts/andika-regular.woff2', 'fonts/andika-bold.woff2']; // linked by fonts/andika.css, unstamped
const NETWORK_WAIT_MS = 3000; // how long a slow connection gets before the saved copy is used

importScripts(`js/phonics.js?v=${SW_VERSION}`); // for which sounds each word uses

const fresh = (url) => new Request(url, { cache: 'reload' });

async function saveApp(cache) {
  const html = await (await fetch(fresh('index.html'))).text();
  // Every file index.html links with a version stamp, so a new script is picked up automatically.
  const files = [...html.matchAll(/(?:src|href)="([^"]+\?v=[^"]+)"/g)].map((match) => match[1]);
  await cache.addAll(['./', 'index.html', 'words.json', ...files, ...FONT_FILES].map(fresh));
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

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(APP_CACHE);
    await saveApp(cache);
    await saveRecordings(cache);
  })());
});

// A new version waits until the app asks it to take over (see js/offline.js).
self.addEventListener('message', (event) => {
  if (event.data === 'activate') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name !== APP_CACHE).map((name) => caches.delete(name)));
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

// Files with a version stamp never change, so a saved copy is always right. The font files are saved again with every
// version, so theirs is too.
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
  }
});
