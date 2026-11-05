# Sight Words

A simple sight-word practice app for young readers. Plain HTML, CSS and JavaScript — no build step.

- Tap the word to hear it read aloud.
- **🧩 Sound it out** plays the word one sound at a time, lighting up each part, then says the whole word. Each part that makes a sound is underlined. Letters that make one sound together, like "th", "ch" and "ee", stay together, and silent letters (like the "e" in "like") are shown faded and skipped. The button only shows for words whose sounds are listed (see [Adding words](#adding-words)).
- **Next ➜** moves on, but only after the word has been heard (until then, tapping it wiggles the word).
- **I know it! ⭐** gives that word a star and a sticker. Stars are only earned this way.
- Stickers collect on the home screen. Each one is a surprise kid-friendly emoji (animals, treats, vehicles and more) with its word on a tag, and it stays the same once earned. To change the choices, edit `STICKER_EMOJI` in `js/config.js`. Stickers can be dragged anywhere on the home screen, even over the title and buttons, and stay where they're put. The **🎲** button in the top-left corner, beside the **🏆**, slides them all back into a fresh random layout around the title. **Reset all progress** also puts them back.
- A round shows up to 10 words, once each, then returns to the home screen. Words learned that round glow there. To change the length, edit `ROUND_MAX_WORDS` in `js/config.js`.

## Home screen buttons

The reading game and its kinds of round come first:

- **Let's Read! ▶** — a round of up to 10 words. The words not shown for the longest come first, so every word gets its turn over a few rounds.
- **🎯 Missing words** — a round of up to 10 words without a star yet, picked the same way. The button shows how many are missing in total. (Greyed out until some, but not all, words have stars.)
- **⏱️ Timed run** — a round of all the words against the clock. The best time is saved; adding or removing words starts a fresh record.

Below a dotted line are the separate games:

- **👂 Listen & tap** — hear a word, then tap it among four choices. A wrong tap plays a soft sound, fades that choice and says the word again, until they find it. The right one plays a happy sound, then says the word. A game is up to 8 words, with the ones not shown for the longest first (change this with `GAME_MAX_WORDS` in `js/config.js`). Each word is worth up to 4 points, minus 1 for each wrong tap. It uses only starred words and opens once 4 words have stars. It's practice only, so it never changes stars or stickers.
- **🧱 Build the word** — hear a word, then pick out its sound parts in order ("th" + "e") by tapping them or dragging them onto the word. Extra tiles from other sight words don't belong: two or three per word, and more for short words so there are always at least 5 tiles (change these with `BUILD_MIN_TILES`, `BUILD_EXTRA_MIN` and `BUILD_EXTRA_MAX` in `js/config.js`). The parts show faintly as a guide, and each placed part plays its sound, including the last one before the whole word is said. A silent letter plays its own recording, like "silent e". A finished word plays a happy sound before the whole word is said. A wrong tile wiggles, plays a soft sound, and then plays the sound of the part they're looking for. It uses only starred words, including one-part words like "a" and "I" (where the job is picking the right tile from the extras), and opens once 4 words have stars. A game is up to 8 words, picked the same way. Each word is worth up to 5 points, minus 1 for each wrong tile, and never less than 1. It's practice only too, so it never changes stars or stickers.

## Trophies

The trophy meter at the bottom of the home screen shows a medal, a bar filling up to the next trophy, and how many trophies have been earned. Above it is the star count. On short screens the two shrink and sit side by side, and the star count shortens to something like "⭐ 10/31". Tapping the meter, or the **🏆** button in the top-left corner, opens **My Trophies**, which shows starred words out of the total, the best time from **⏱️ Timed run**, and the medals and trophies so far.

Each game of **👂 Listen & tap** or **🧱 Build the word** has three medals, and the bar at the top fills with the points earned. Finishing always earns bronze, gold is every word right the first time, and silver is at least 60% of the points (change these with `GAME_MEDALS` in `js/config.js`).

Each medal adds one to the trophy meter, so a game adds one for bronze, two for silver or three for gold. Every 20 earns a trophy, and extras carry over (change this with `MEDALS_PER_TROPHY`). That's at most 20 games for a trophy, or 7 with all gold. A game left partway through earns no medals, even if the bar had reached one. Medals are separate from stars and stickers. Each best score saved by an older version counts as one starting medal.

A new best time, medal or trophy shows on the home screen after the round, flying into the meter. All of this is saved with progress, so **Reset all progress** clears it too.

## Sound effects

Besides the recorded words and sounds, the app plays a few short sound effects. They're made in code from tones and noise in `js/sound-effects.js`, so there's nothing to record:

- **Right answer:** two soft notes going up, in **👂 Listen & tap** and when a word is finished in **🧱 Build the word**, just before the word is said. A wrong answer still gets the soft "boop".
- **New star:** a shimmer when **I know it!** earns a star and sticker.
- **Medal and trophy:** a short "ta-da" on the home screen after a game, or a bigger one when it earns a trophy.
- **🎲:** a rattle that lands with each bounce of the die.
- **Stickers:** a short brush, like smoothing tape, when a sticker is picked up to drag, and a soft pat when it's put down. A tap without moving stays quiet.

To make them all louder or quieter, change `SOUND_EFFECTS_VOLUME` in `js/config.js`. To hear them all or try new ones, open the sound effects page from the developer tools (see below).

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

Each part is the letters shown, then the sound they make, from the list of sounds in `SOUNDS` just above it. A silent letter uses a silent sound like `SILENT_E`; for a different silent letter, add one to `SOUNDS` with `silent: true`, and record it. Then record the new word, and any sounds it uses that aren't recorded yet (see below).

## Recording the words and sounds

Every word and sound plays from a recording in `audio/`, so it sounds the same on every device. Anything not recorded yet uses the device's own voice instead, which sounds different from one tablet to the next.

To record them, run `python serve.py` in the project folder on a computer and open http://localhost:8000/recorder.html (or tap the 🎙 button next to ⚙️ on the home screen, which only shows when the app runs on this computer).

- Words and sounds are on separate tabs, each showing which are recorded and which are still missing. Tick **Show only what still needs recording** for a to-do list. It also points out words with no sounds listed in `WORD_PARTS`. **🏠 Back to the app** returns to the practice app.
- Tap 🎙, say the word or sound, tap ⏹, listen back, then 💾 Save. Silence is trimmed and the volume is evened out for you.
- With `serve.py` running, 💾 saves words straight into `audio/words/` and sounds into `audio/sounds/`, in any browser.
- Without it (for example with `python -m http.server`), Chrome and Edge ask for the project folder the first time you tap 💾 and remember it after that. Other browsers download the file, and you move it into `audio/words/` or `audio/sounds/` yourself.
- Say sounds short and clean, "b" not "buh", and hold the ones that can be held, like "mmm" and "sss", for about a second.
- Commit the new files in `audio/` so every device gets them. A pull request fails its checks if a word or sound in use has no recording.

## Grown-up corner

Press and hold the **⚙️** button in the top-right corner of the home screen for about a second. (A quick tap does nothing, so kids don't open it by accident.) The first time the app opens, a tip below **⚙️** says so: "Grown-ups: press and hold ⚙️ for settings." It shows only once, and goes away with **Got it** or when the corner is opened.

From there you can see how many times each word was heard, give or take away stickers, or reset all progress (including the best time, medals and trophies). **Reset all progress** asks first, with the question covering the whole corner so it can't be missed.

**📖 What's in this app** opens a guide for grown-ups in place of the word list: the games, how stars, stickers, medals and trophies are earned, what the on/off switches do, and how to install the app for offline play. Its numbers, like the words in a round or the medals in a trophy, come from `js/config.js`, so they stay right when those change. **← Back** returns to the word list.

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
| `progress.js` | Saved progress: stars, stickers, heard counts, best time, medals, and whose turn each word has next |
| `speech.js` | Choosing a voice and reading words aloud |
| `phonics.js` | The sounds, and how each word splits into them for **Sound it out** |
| `audio.js` | Playing the recordings in `audio/`, or the device's voice for anything not recorded |
| `sound-effects.js` | The sound effects, made in code: right answer, new star, medal, trophy, dice and stickers |
| `effects.js` | Toasts and confetti |
| `stickers.js` | Drawing stickers, laying them out on the home screen, and dragging them around |
| `home.js` | Home screen and switching screens |
| `practice.js` | Rounds, the timer, the word card and sounding words out |
| `listen.js` | The Listen & tap game |
| `build.js` | The Build the word game |
| `trophies.js` | The medal bar in the games, the trophy meter on the home screen, and the My Trophies pop-up |
| `panel.js` | Grown-up corner |
| `offline.js` | Turning on offline play and offering new versions |
| `devtools.js` | Developer tools, only on localhost |
| `app.js` | Start up and button wiring |
| `recorder.js` | The sound recorder page (`recorder.html`) |
| `sound-lab.js` | The developer sound effects page (`sounds.html`), and the ideas tried along the way |

Offline play lives in `sw.js` and the app's name and icons in `manifest.webmanifest`, both next to `index.html`.

## App version

The version (for example `v1.0.0`) shows in the bottom-right corner of the home screen, so you can tell whether a tablet has the latest copy. It comes from `APP_VERSION` in `js/config.js`.

The version goes up on its own: each time a pull request is merged into `main`, a GitHub Action (`.github/workflows/bump-version.yml`) raises it, commits the change and tags it (for example `v1.0.1`).

- Every pull request needs exactly one version label, or its Label check fails: **`patch`** (1.0.0 → 1.0.1), **`minor`** (1.0.0 → 1.1.0) or **`major`** (1.0.0 → 2.0.0).
- The action also updates the `?v=` stamps on the style and script links in `index.html`, `recorder.html` and `sounds.html`, and on the recordings, so tablets load the new files instead of old saved copies.
- Because the bot adds a commit to `main` after each merge, pull `main` before starting a new branch.

To bump by hand, run `bash .github/scripts/bump-version.sh patch` (or `minor` / `major`).

## Installing and playing offline

Sight Words can be installed on a phone or tablet and played without internet:

- **iPad / iPhone:** open the site in Safari, then **Share → Add to Home Screen**.
- **Android:** open the site in Chrome, then **⋮ → Add to Home screen** or **Install app**.

The app and recordings are saved the first time the site is opened online, so give it a moment before going offline. When online, the app looks for a new version when it's opened and when the home screen appears or the app is switched back to, at most once a minute. A new version downloads in the background, with "Downloading new version" showing where the version number is on the home screen. Then an **Update to latest version** button replaces the version number, reading just **Update** on smaller screens. Tapping it shows "Updating…" and fades the app out and back in. Switching to another app partway through doesn't stop it: the update finishes on coming back. The update also happens by itself the next time the app is closed and reopened, unless a game or pop-up is open, and then the button stays on offer.

**Saved progress stays on each device, at this web address:**
- On iPad and iPhone, the home-screen app usually keeps its own progress, separate from Safari, so it starts fresh.
- Removing the app usually erases its progress.
- Moving the site to a new address starts fresh.

## Developer tools

When the app runs at `http://localhost:8000`, a **🛠️** button appears below **⚙️** on the home screen. It previews the update statuses: Normal, Downloading, Update ready and Updating. The **Update to latest version** button works in the preview too. Updating plays the real message and fades, with a plain reload in place of a new version. Saved progress isn't changed.

The panel also links to **🔊 Sound effects** (`sounds.html`), a page that plays every sound effect straight from `js/sound-effects.js`, along with the other ideas tried before each one was picked. To try a new idea, add it to `SOUND_IDEAS` in `js/sound-lab.js` and compare it there.

## Publishing on GitHub Pages

1. Create a new repository on GitHub and upload these files (`index.html`, `recorder.html`, `sounds.html`, `sw.js`, `manifest.webmanifest`, `style.css`, `recorder.css`, `words.json`, and the `js`, `audio` and `icons` folders).
2. In the repository, go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, pick `main` and `/ (root)`, and save.
4. After a minute, the site is at `https://<your-username>.github.io/<repository-name>/`.

On the tablet, open that address and use **Share → Add to Home Screen** (iPad) or **⋮ → Add to Home screen** (Android) so it opens full-screen like an app. The icon it gets comes from the `icons` folder.

## Future enhancements

- [Automate pull request reviews](docs/review-automation.md)
