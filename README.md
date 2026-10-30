# Sight Words

A simple sight-word practice app for young readers. Plain HTML, CSS and JavaScript — no build step.

- Tap the word to hear it read aloud.
- **🧩 Sound it out** plays the word one sound at a time, lighting up each part, then says the whole word. Each part that makes a sound is underlined. Letters that make one sound together, like "th", "ch" and "ee", stay together, and silent letters (like the "e" in "like") are shown faded and skipped. The button only shows for words whose sounds are listed (see [Adding words](#adding-words)).
- **Next ➜** moves on, but only after the word has been heard (until then, tapping it wiggles the word).
- **I know it! ⭐** gives that word a star and a sticker. Stars are only earned this way.
- Stickers collect on the home screen. Each one is a surprise kid-friendly emoji (animals, treats, vehicles and more) with its word on a tag, and it stays the same once earned. To change the choices, edit `STICKER_EMOJI` in `js/config.js`. Stickers can be dragged anywhere on the home screen, even over the title and buttons, and stay where they're put. The **🎲** button in the top-left corner slides them all back into a fresh random layout around the title. **Reset all progress** also puts them back.
- Each round goes through every word once, then returns to the home screen. Words learned that round glow there.

## Home screen buttons

- **Let's Read! ▶** — a round of all the words.
- **🎯 Missing words** — a round of only the words without a star yet. (Shown once some, but not all, words have stars.)
- **⏱ Timed run** — a round of all the words against the clock. The best time is saved; adding or removing words starts a fresh record.

## Adding words

Edit `words.json`. It's a plain list:

```json
["was", "you", "me", "like", "new-word-here"]
```

Keep the quotes and commas. New words show up as not-yet-practiced; existing progress is kept.

Sight words often don't follow the usual sounding-out rules ("said", "of", "was"), so how each word splits into sounds is written out by hand in `WORD_PARTS` in `js/phonics.js`. A new word that isn't listed there has no **Sound it out** button until you add it, for example:

```js
the: [['th', 'DH'], ['e', 'UH']],
```

Each part is the letters shown, then the sound they make, from the list of sounds in `SOUNDS` just above it (`''` for a silent letter). Then record the new word, and any sounds it uses that aren't recorded yet (see below).

## Recording the words and sounds

Every word and sound plays from a recording in `audio/`, so it sounds the same on every device. Anything not recorded yet uses the device's own voice instead, which sounds different from one tablet to the next.

To record them, run `python serve.py` in the project folder on a computer and open http://localhost:8000/recorder.html (or tap the 🎙 button next to ⚙️ on the home screen, which only shows when the app runs on this computer).

- Words and sounds are on separate tabs, each showing which are recorded and which are still missing. Tick **Show only what still needs recording** for a to-do list. It also points out words with no sounds listed in `WORD_PARTS`. **🏠 Back to the app** returns to the practice app.
- Tap 🎙, say the word or sound, tap ⏹, listen back, then 💾 Save. Silence is trimmed and the volume is evened out for you.
- With `serve.py` running, 💾 saves words straight into `audio/words/` and sounds into `audio/sounds/`, in any browser.
- Without it (for example with `python -m http.server`), Chrome and Edge ask for the project folder the first time you tap 💾 and remember it after that. Other browsers download the file, and you move it into `audio/words/` or `audio/sounds/` yourself.
- Say sounds short and clean, "b" not "buh", and hold the ones that can be held, like "mmm" and "sss", for about a second.
- Commit the new files in `audio/` so every device gets them.

## Grown-up corner

Press and hold the **⚙️** button in the top-right corner of the home screen for about a second. (A quick tap does nothing, so kids don't open it by accident.) From there you can see how many times each word was heard, give or take away stickers, or reset all progress (including the best time).

Each word also has an on/off switch. A word that's turned off is skipped in every round and left out of the star count, and its sticker is hidden until it's turned back on. Turned-off words are saved separately from progress, so **Reset all progress** leaves them off. At least one word always stays on.

## Making the voice sound natural

Recorded words and sounds (see above) sound the same everywhere. For anything not recorded yet, the app uses the voices built into the device and picks the most natural-sounding one it finds. To choose a different one, open the Grown-up corner, pick from **Voice**, and tap **🔊 Test**. The choice is saved on that device.

Better voices you can add for free:

- **iPad / iPhone:** Settings → Accessibility → Spoken Content → Voices → English. Download an "Enhanced" voice (for example Ava or Samantha), then close and reopen the app.
- **Android (Chrome):** the "Google US English" voices are usually already there.
- **Windows (Edge):** the "Online (Natural)" voices such as Aria and Jenny sound best, but need an internet connection.

## Where progress is saved

In the browser on that device (`localStorage`). A different tablet or browser starts fresh, and clearing the browser's website data erases progress.

## Trying it on your computer

Browsers won't load `words.json` when you double-click `index.html` (it falls back to a built-in copy of the list). To test with your real list, run this in the folder and open http://localhost:8000:

```
python serve.py
```

`serve.py` works like `python -m http.server 8000`, and also lets the sound recorder save into `audio/`. It only answers this computer; to try the app on a tablet on the same Wi-Fi, use `python -m http.server 8000` instead.

## How the code is organized

The JavaScript lives in `js/`, as plain scripts loaded in order by `index.html` (no modules, so opening the file from disk still works). Each file can use anything from the files loaded before it.

| File | What's in it |
| --- | --- |
| `utils.js` | General helpers used across files: shuffling, hashing, time formatting, safe `localStorage` access, animations, long-press |
| `config.js` | Settings and lists: sticker emoji, colors, cheers, fallback word list |
| `state.js` | Page elements (`els`) and the state shared between files (`state`) |
| `words.js` | Loading `words.json`, and the words turned off in the Grown-up corner |
| `progress.js` | Saved progress: stars, stickers, heard counts, best time |
| `speech.js` | Choosing a voice and reading words aloud |
| `phonics.js` | The sounds, and how each word splits into them for **Sound it out** |
| `audio.js` | Playing the recordings in `audio/`, or the device's voice for anything not recorded |
| `effects.js` | Toasts and confetti |
| `stickers.js` | Drawing stickers, laying them out on the home screen, and dragging them around |
| `home.js` | Home screen and switching screens |
| `practice.js` | Rounds, the timer, the word card and sounding words out |
| `panel.js` | Grown-up corner |
| `app.js` | Start up and button wiring |
| `recorder.js` | The sound recorder page (`recorder.html`) |

## App version

The version (for example `v1.0.0`) shows in the bottom-right corner of the home screen, so you can tell whether a tablet has the latest copy. It comes from `APP_VERSION` in `js/config.js`.

The version goes up on its own: each time a pull request is merged into `main`, a GitHub Action (`.github/workflows/bump-version.yml`) raises it, commits the change and tags it (for example `v1.0.1`).

- **Patch** (1.0.0 → 1.0.1) happens by default.
- Add the **`minor`** label to the pull request for 1.0.0 → 1.1.0, or **`major`** for 1.0.0 → 2.0.0. The labels appear after the action has run once.
- The action also updates the `?v=` stamps on the style and script links in `index.html` and `recorder.html`, and on the recordings, so tablets load the new files instead of old saved copies.
- Because the bot adds a commit to `main` after each merge, pull `main` before starting a new branch.

To bump by hand, run `bash .github/scripts/bump-version.sh patch` (or `minor` / `major`).

## Publishing on GitHub Pages

1. Create a new repository on GitHub and upload these files (`index.html`, `recorder.html`, `style.css`, `recorder.css`, `words.json`, and the `js` and `audio` folders).
2. In the repository, go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, pick `main` and `/ (root)`, and save.
4. After a minute, the site is at `https://<your-username>.github.io/<repository-name>/`.

On the tablet, open that address and use **Share → Add to Home Screen** (iPad) or **⋮ → Add to Home screen** (Android) so it opens full-screen like an app.
