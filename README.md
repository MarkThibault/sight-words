# Sight Words

A simple sight-word practice app for young readers. Plain HTML, CSS and JavaScript — no build step.

- Tap the word to hear it read aloud.
- **Next ➜** moves on, but only after the word has been heard (until then, tapping it wiggles the word).
- **I know it! ⭐** gives that word a star and a sticker. Stars are only earned this way.
- Stickers collect on the home screen. Sticker words still come back now and then for review.

## Adding words

Edit `words.json`. It's a plain list:

```json
["was", "you", "me", "like", "new-word-here"]
```

Keep the quotes and commas. New words show up as not-yet-practiced; existing progress is kept.

## Grown-up corner

Press and hold the **⭐ stars** counter on the home screen for about a second. From there you can see how many times each word was heard, give or take away stickers, or reset all progress.

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

## Publishing on GitHub Pages

1. Create a new repository on GitHub and upload these files (`index.html`, `style.css`, `app.js`, `words.json`).
2. In the repository, go to **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, pick `main` and `/ (root)`, and save.
4. After a minute, the site is at `https://<your-username>.github.io/<repository-name>/`.

On the tablet, open that address and use **Share → Add to Home Screen** (iPad) or **⋮ → Add to Home screen** (Android) so it opens full-screen like an app.
