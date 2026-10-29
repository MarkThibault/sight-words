'use strict';

// Loading the word list.

async function loadWords() {
  try {
    const res = await fetch('words.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return cleanList(await res.json());
  } catch (e) {
    console.warn('Could not load words.json, using the built-in list.', e);
    return cleanList(FALLBACK_WORDS);
  }
}

// Trim each word and drop blanks and repeats.
function cleanList(list) {
  const seen = new Set();
  return list.map((w) => String(w).trim()).filter((w) => w && !seen.has(w) && seen.add(w));
}
