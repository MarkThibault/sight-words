# Sight Words

A sight-word practice app for a 5-year-old, used mostly on a tablet. See `README.md` for how the app behaves and how the code is organized. Keep it up to date when behavior changes.

## Stack

- Plain HTML, CSS and JavaScript, hosted on GitHub Pages. No build step, no dependencies and no modules.
- Scripts in `js/` load in order from `index.html` and share globals, so a new file must be added there in the right place. Opening `index.html` from disk should still work.
- Every PR runs the basic checks in `.github/scripts/check-site.js`: script errors, missing recordings and broken links. Run them first with `node .github/scripts/check-site.js`. There are no browser tests yet. The plan is in `docs/review-automation.md`.

## Running it

- Start the local server with `preview_start` and the name `sight-words` (runs `python serve.py 8000`). Outside Claude Code, run `python serve.py`.
- `serve.py` only answers this computer. It also lets `recorder.html` save clips into `audio/`.
- Browsers cache files until the version changes. After editing, reload with a cache bypass or Ctrl+Shift+R.
- Offline play (`sw.js`) is off on `localhost`, so edits show right away. To test it, use `http://127.0.0.1:8000`, which has its own saved data.
- The 🛠️ button, only on `localhost`, previews the update statuses (`js/devtools.js`). Add other developer-only previews there.

## Workflow

- Start each new feature on a new branch from the latest `origin/main`. Don't add unrelated work to an existing branch or open PR.
- Commit, push and open a PR only when asked. Add follow-up changes to the branch while its PR is still open, and check whether it has merged before starting from it.
- `gh` isn't installed. Open PRs from a GitHub compare URL with `title` and `body` query params in the browser pane. If the pane is signed out of GitHub, ask the user to sign in.
- The GitHub Action bumps the version on every merged PR, by its `patch`, `minor` or `major` label. A check fails until a PR has exactly one. Add the `minor` label for new features unless "bug" or "fix" is mentioned as a new stand-alone change, and `patch` otherwise.
- Don't edit `APP_VERSION` or the `?v=` stamps by hand, other than copying the current stamp onto a newly added file. Pull `main` before branching, because the bot commits after each merge.

## Rules the app must keep

- Only **I know it!** earns stars and stickers. Other games are practice and never change them.
- Reset all progress also clears best times, medals, trophies and sticker spots, but turned-off words stay off.
- Game rewards are gentle: a wrong answer gets the soft boop and another try, never a failure.
- Words and sounds play from the recordings in `audio/`, and the device voice is only a fallback. Recorded files aren't generated, so never overwrite or delete them.
- Every word needs an entry in `WORD_PARTS` in `js/phonics.js`, or it has no Sound it out and can't be used in Build the word. A silent letter uses a silent sound such as `SILENT_E`.
- Stickers sit above the title and buttons. The trophy meter and the 🎲 button stay above the stickers.
- The recorder button only shows on localhost.
- Keep tunable numbers in `js/config.js`.
- The look stays kid-friendly: the Andika font, chunky rounded buttons and emoji icons. Check phone and tablet sizes, because the home screen can run out of room for stickers.

## Testing in the browser

- **Protect saved progress.** Rendering test stars can write to `localStorage`, because `stickerFor` saves. Back up the `sightWords.*` keys to `sessionStorage` first and restore them exactly afterward.
- **Start audio with a real click.** The audio context stays suspended without one, and a suspended clip never reports that it ended, so games can appear to hang.
- **Be clear about what was checked.** Logging audio order isn't hearing it, and the built-in browser can't use the microphone. Say when something hasn't been heard or tried on a real tablet.
- Finish by checking the console for script errors.

## Working with the user

- Explain changes in plain language, focused on what the child and parent will see.
- When a request is ambiguous, take the sensible reading, say what you chose, and make it easy to change.
- When asked for options or designs, give a recommendation, and show visual choices as mockups where possible.
- Don't write binary files by retyping encoded text. It's unreliable.
