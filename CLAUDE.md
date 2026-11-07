# Sight Words

A sight-word practice app for a 5-year-old, used mostly on a tablet. See `README.md` for how the app behaves and how the code is organized. Keep it up to date when behavior changes.

## Stack

- Plain HTML, CSS and JavaScript, hosted on GitHub Pages. No build step, no dependencies and no modules in the app. Tools for developing and checking it, like the browser tests, may have dependencies (`package.json`), but the app must never load them.
- Scripts in `js/` load in order from `index.html` and share globals, so a new file must be added there in the right place. Opening `index.html` from disk should still work.
- A new HTML page must be added to the `?v=` stamping in `.github/scripts/bump-version.sh` and to the link check in `.github/scripts/check-site.js`, or it misses version bumps and broken-link checks.
- Every PR runs the basic checks in `.github/scripts/check-site.js` (script errors, missing recordings and broken links) and the browser tests in `tests/`. Run both before committing: `node .github/scripts/check-site.js` and `npm test` (after `npm install` once). See "Tests" in `README.md`.
- When a change alters how the app behaves, update the browser test that covers it, or add one. A test that fails after a change that wasn't meant to change behavior is a bug in the change, not the test.
- When fixing a bug, first add a test that fails because of it, then fix it so the test passes, and say in the PR that it failed before the fix. If a test would cost more than the bug is worth (for example a few pixels of layout), skip it and say why in the PR.

## Running it

- Start the local server with `preview_start` and the name `sight-words` (runs `python serve.py 8000`). Outside Claude Code, run `python serve.py`.
- `serve.py` only answers this computer. It also lets `recorder.html` save clips into `audio/`.
- Browsers cache files until the version changes. After editing, reload with a cache bypass or Ctrl+Shift+R.
- Offline play (`sw.js`) is off on `localhost`, so edits show right away. To test it, use `http://127.0.0.1:8000`, which has its own saved data.
- The 🛠️ button, only on `localhost`, previews the update statuses (`js/devtools.js`) and links to the sound effects page (`sounds.html`). Add other developer-only previews there.

## Workflow

- Start each new feature on a new branch from the latest `origin/main`. Don't add unrelated work to an existing branch or open PR.
- Keep each PR to one change a parent could describe in a sentence. Before starting, say what's in it and what's left out.
- When a new request isn't part of that change, say so before building it. Suggest finishing and merging the current PR first, then starting the new work on its own branch. The user can still choose to keep it together.
- Don't add extras while working, even small ones. Mention anything spotted in passing, such as a bug or cleanup, and leave it for its own PR.
- If a design is still changing after two rounds of feedback, pause and suggest merging what's settled, or settling the design with a mockup before more code.
- Commit, push and open a PR only when asked. Add follow-up changes to the branch while its PR is still open, and check whether it has merged before starting from it.
- `gh` isn't installed. Open PRs from a GitHub compare URL with `title` and `body` query params in the browser pane. If the pane is signed out of GitHub, ask the user to sign in. With no browser pane, build the same URL and give it to the user as a link to click, then check it merged with `git merge-base --is-ancestor <branch> origin/main`.
- The GitHub Action bumps the version on every merged PR, by its `patch`, `minor` or `major` label. A check fails until a PR has exactly one. Add the `minor` label for new features unless "bug" or "fix" is mentioned as a new stand-alone change, and `patch` otherwise.
- Don't edit `APP_VERSION` or the `?v=` stamps by hand, other than copying the current stamp onto a newly added file. Pull `main` before branching, because the bot commits after each merge.

## Rules the app must keep

- Only **I know it!** earns stars and word stickers. Other games are practice and never change them.
- Stickers come in sets of `SET_SIZE` (`STICKER_SETS` in `js/config.js`), and finishing a set unlocks its scene. Stickers earned before sets keep their emoji and don't count toward one. A scene stays unlocked once earned, and a sticker taken away leaves a gap that the next star fills first. Scene emoji and icons never repeat a set's sticker. When words are added beyond the sets, add more sets.
- Reset all progress also clears best times, medals, trophies, prize stickers, sticker spots and scenes, so the board goes back to the dots, but turned-off words stay off.
- Game rewards are gentle: a wrong answer gets the soft boop and another try, never a failure. Finishing a game always earns at least bronze, so bronze's share in `GAME_MEDALS` has to stay at or below the lowest possible score.
- A game can be finished `GAME_REPEAT_LIMIT` times in a row; then its button waits (greyed out, never a game that ends without a medal) until the other game or a reading round is finished.
- Medals and trophies only come from finishing Listen & tap or Build the word. They never change stars or word stickers. Each trophy earns one prize sticker the child picks from `STICKER_EMOJI` (never a set sticker), with a 🏆 tag. It isn't part of a set, so it never changes scenes.
- Words and sounds play from the recordings in `audio/`, and the device voice is only a fallback. Recorded files aren't generated, so never overwrite or delete them.
- Sound effects are the exception: they're made in code in `js/sound-effects.js`, with no recordings. Pick new ones by ear on `sounds.html`, keep the ideas not chosen in `SOUND_IDEAS` in `js/sound-lab.js`, and keep them about as loud as the wrong-answer boop.
- Every word needs an entry in `WORD_PARTS` in `js/phonics.js`, or it has no Sound it out and can't be used in Build the word. A silent letter uses a silent sound such as `SILENT_E`.
- Stickers sit behind the title panel, buttons and bottom row, in full color, and can only be dragged in sticker play.
- Sticker play (the 🐵/🙈 switch, alone in the top-left corner) hides the title panel, the bottom row, ⚙️, 🛠️ and 🎙, and shows 🏆, 🎲 and 🖼️ in a row beside the switch; outside it they're hidden. New stickers earned outside it fly into the switch and wait there, off the board, until it's next opened; a finished set gets a short "set complete!" card that closes by itself and shrinks into the switch. Its red badge adds up those stickers, the prize stickers to pick and the new scenes not looked at yet, and moves onto 🏆 and 🖼️ while it's on. It's never saved, and pop-ups and automatic updates wait while it's on. Scenes sit behind the stickers and stay soft and light, so the cream panel and sticker tags stay easy to read.
- The recorder button only shows on localhost.
- Keep tunable numbers in `js/config.js`.
- The look stays kid-friendly: the Andika font, chunky rounded buttons and emoji icons. Check phone and tablet sizes, because the home screen can run out of room for stickers. The star pill, trophy pill and update statuses share the bottom row on short screens, so check them with the Update button and "Downloading new version" showing. The two pills keep the same width.

## Testing in the browser

- **Protect saved progress.** Giving test stars with `setKnown` saves them, along with their stickers, to `localStorage`. Back up the `sightWords.*` keys to `sessionStorage` first and restore them exactly afterward. Drawing a screen never saves.
- **Start audio with a real click.** The audio context stays suspended without one, and a suspended clip never reports that it ended, so games can appear to hang.
- **Be clear about what was checked.** Logging audio order isn't hearing it, and the built-in browser can't use the microphone. Say when something hasn't been heard or tried on a real tablet.
- Finish by checking the console for script errors.

## Working with the user

- Explain changes in plain language, focused on what the child and parent will see.
- When a request is ambiguous, take the sensible reading, say what you chose, and make it easy to change.
- When asked for options or designs, give a recommendation, and show visual choices as mockups where possible.
- Don't write binary files by retyping encoded text. It's unreliable.
