#!/usr/bin/env node
// The basic checks every pull request has to pass. Run it yourself with: node .github/scripts/check-site.js
// A missing recording is the main thing to catch: the app quietly falls back to the device's voice for it.
'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', '..');
const fromRoot = (...parts) => path.join(ROOT, ...parts);
const inAction = Boolean(process.env.GITHUB_ACTIONS);

const failures = [];
const warnings = [];

function checkScripts() {
  const scripts = ['sw.js', ...fs.readdirSync(fromRoot('js')).filter((name) => name.endsWith('.js')).map((name) => `js/${name}`)];
  for (const script of scripts) {
    const { status, stderr } = spawnSync(process.execPath, ['--check', fromRoot(script)], { encoding: 'utf8' });
    if (status !== 0) failures.push(`Script error in ${script}:\n${stderr.trim()}`);
  }
}

// words.json and phonics.js are read the way the app reads them. If either is broken, the checks that use them can't run.
function readWords() {
  try {
    return JSON.parse(fs.readFileSync(fromRoot('words.json'), 'utf8'));
  } catch (err) {
    failures.push(`words.json can't be read: ${err.message}`);
    return null;
  }
}

function readWordParts() {
  try {
    const code = fs.readFileSync(fromRoot('js', 'phonics.js'), 'utf8');
    return vm.runInNewContext(`${code}\n;WORD_PARTS`);
  } catch (err) {
    failures.push(`WORD_PARTS in js/phonics.js can't be read: ${err.message}`);
    return null;
  }
}

// Compares against the folder's list of names, so "the.wav" doesn't pass for "The.wav" on Windows, where the site's server would miss it.
const clipsIn = (folder) => new Set(fs.readdirSync(fromRoot('audio', folder)));

function checkWordClips(words) {
  const clips = clipsIn('words');
  for (const word of words) {
    if (!clips.has(`${word}.wav`)) failures.push(`Missing recording: audio/words/${word}.wav`);
  }
}

function checkSoundClips(wordParts) {
  const clips = clipsIn('sounds');
  const sounds = new Set(Object.values(wordParts).flatMap((parts) => parts.map(([, id]) => id).filter(Boolean)));
  for (const id of sounds) {
    if (!clips.has(`${id}.wav`)) failures.push(`Missing recording: audio/sounds/${id}.wav`);
  }
}

// A warning, not a failure: a word without an entry still works, with Sound it out hidden and no Build the word.
function checkPhonics(words, wordParts) {
  for (const word of words) {
    if (!Object.hasOwn(wordParts, word)) warnings.push(`"${word}" has no entry in WORD_PARTS in js/phonics.js`);
  }
}

function checkLinks() {
  for (const page of ['index.html', 'recorder.html', 'sounds.html', 'privacy.html']) {
    const html = fs.readFileSync(fromRoot(page), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
    for (const [, link] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
      if (/^([a-z]+:|\/\/|#)/i.test(link)) continue; // another site, or a spot on this page
      const file = decodeURIComponent(link.split(/[?#]/)[0]);
      if (!fs.existsSync(fromRoot(file))) failures.push(`Broken link in ${page}: ${link}`);
    }
  }
}

checkScripts();
checkLinks();
const words = readWords();
const wordParts = readWordParts();
if (words) checkWordClips(words);
if (wordParts) checkSoundClips(wordParts);
if (words && wordParts) checkPhonics(words, wordParts);

// In a GitHub Action, these prefixes show each message on the pull request's checks page.
for (const warning of warnings) console.log(`${inAction ? '::warning::' : 'Warning: '}${warning}`);
for (const failure of failures) console.log(`${inAction ? '::error::' : 'Failed: '}${failure.replaceAll('\n', inAction ? '%0A' : '\n')}`);

if (failures.length) process.exit(1);
console.log(`All checks passed${warnings.length ? `, with ${warnings.length} warning(s)` : ''}.`);
