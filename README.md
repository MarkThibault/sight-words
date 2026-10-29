# Sight Words

A simple sight-word practice app for young readers. Plain HTML, CSS and JavaScript — no build step.

- Tap the word to hear it read aloud.
- **Next ➜** moves on, but only after the word has been heard (until then, tapping it wiggles the word).
- **I know it! ⭐** gives that word a star and a sticker. Stars are only earned this way.
- Stickers collect on the home screen. Each one is a surprise kid-friendly emoji (animals, treats, vehicles and more) with its word on a tag, and it stays the same once earned. To change the choices, edit `STICKER_EMOJI` in `js/config.js`.
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

## Grown-up corner

Press and hold the **⭐ stars** counter on the home screen for about a second. From there you can see how many times each word was heard, give or take away stickers, or reset all progress (including the best time).

## Making the voice sound natural

The app uses the voices built into the device and picks the most natural-sounding one it finds. To choose a different one, open the Grown-up corner, pick from **Voice**, and tap **🔊 Test**. The choice is saved on that device.

Better voices you can add for free:

- **iPad / iPhone:** Settings → Accessibility → Spoken Content → Voices → English. Download an "Enhanced" voice (for example Ava or Samantha), then close and reopen the app.
- **Android (Chrome):** the "Google US English" voices are usually already there.
- **Windows (Edge):** the "Online (Natural)" voices such as Aria and Jenny sound best, but need an internet connection.

## Where progress is saved

In the browser on that device (`localStorage`). A different tablet or browser starts fresh, and clearing the browser's website data erases progress.

## Trying it on your computer

Browsers won't load `words.json` when you double-click `index.html` (it falls back to a built-in copy of the list). To test with your real list, run this in the folder and open http://localhost:8000:

```
python -m http.server 8000
```

## How the code is organized

The JavaScript lives in `js/`, as plain scripts loaded in order by `index.html` (no modules, so opening the file from disk still works). Each file can use anything from the files loaded before it.

| File | What's in it |
| --- | --- |
| `utils.js` | General helpers used across files: shuffling, hashing, time formatting, safe `localStorage` access, animations, long-press |
| `config.js` | Settings and lists: sticker emoji, colors, cheers, fallback word list |
| `state.js` | Page elements (`els`) and the state shared between files (`state`) |
| `words.js` | Loading `words.json` |
| `progress.js` | Saved progress: stars, stickers, heard counts, best time |
| `speech.js` | Choosing a voice and reading words aloud |
| `effects.js` | Toasts and confetti |
| `stickers.js` | Drawing stickers and laying them out on the home screen |
| `home.js` | Home screen and switching screens |
| `practice.js` | Rounds, the timer, and the word card |
| `panel.js` | Grown-up corner |
| `app.js` | Start up and button wiring |

## Publishing on GitHub Pages

1. Create a new repository on GitHub and upload these files (`index.html`, `style.css`, `words.json` and the `js` folder).
2. In the repository, go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, pick `main` and `/ (root)`, and save.
4. After a minute, the site is at `https://<your-username>.github.io/<repository-name>/`.

On the tablet, open that address and use **Share → Add to Home Screen** (iPad) or **⋮ → Add to Home screen** (Android) so it opens full-screen like an app.
