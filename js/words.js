'use strict';

// Loading the word list, and the words a grown-up turned off.

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

function loadOffWords() {
  try {
    const list = JSON.parse(readStorage(OFF_WORDS_KEY));
    if (Array.isArray(list)) return new Set(list);
  } catch (e) { /* corrupt: all words on */ }
  return new Set();
}

function applyOffWords() {
  state.words = state.allWords.filter((w) => !state.offWords.has(w));
}

function setWordOn(word, on) {
  if (on) state.offWords.delete(word);
  else state.offWords.add(word);
  writeStorage(OFF_WORDS_KEY, state.offWords.size ? JSON.stringify([...state.offWords]) : null);
  applyOffWords();
}

// Trim each word and drop blanks and repeats.
function cleanList(list) {
  const seen = new Set();
  return list.map((w) => String(w).trim()).filter((w) => w && !seen.has(w) && seen.add(w));
}
