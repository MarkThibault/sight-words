# Future enhancement: automate pull request reviews

**Status:** in progress. Each finished step says so.

The app has no build step or tests, so every pull request is checked by hand. These steps add automatic checks, cheapest first. Each one can ship on its own.

| Step | What it adds | Effort | Cost |
| --- | --- | --- | --- |
| 1 ✅ | Basic checks on every pull request | About 30 minutes | Free |
| 2 | Browser tests | A few hours | Free |
| 3 | Automatic code review | Minutes | May cost something |
| 4 🟡 | Safety rails on `main` | Minutes | Free |
| 5 | A preview link for each pull request | Under an hour | Check the service's free plan |

**Suggested order:** step 1, then the template and label check from step 4, then step 2. Step 3 works better once the checks handle the routine mistakes. Add the rest of step 4 once the checks are reliable.

## 1. Basic checks

**Status:** done, in `.github/workflows/basic-checks.yml` and `.github/scripts/check-site.js`.

Add a GitHub Action that runs on every pull request and passes or fails on:

- ✅ **Script errors:** a syntax check on every file in `js/`, for example `node --check`.
- ✅ **Missing recordings:** every word in `words.json` has a clip in `audio/words/`, and every sound used in `WORD_PARTS` has a clip in `audio/sounds/`.
- ✅ **Missing phonics:** every word in `words.json` has an entry in `WORD_PARTS`. This should be a warning, not a failure, because a word without one still works with **Sound it out** hidden.
- ✅ **Broken links:** every local file that `index.html` and `recorder.html` link to exists.

A missing clip is the main reason for this step: it fails quietly today, because the app falls back to the device's voice.

**Done when:** a pull request that removes a clip or adds a broken link shows a failed check.

## 2. Browser tests

Use Playwright to open the real app at phone and tablet sizes on every pull request, and:

- Play a round of Let's Read, Listen & tap and Build the word, and check the score.
- Check that Listen & tap and Build the word unlock at the right number of stars.
- Check that stickers don't land on the title or buttons, using a set number of stickers.
- Fail on any script error.

These tests can't judge how audio sounds or how a game feels, so keep trying changes on a tablet.

**Done when:** the tests run on every pull request and pass on `main`.

## 3. Automatic code review

- **On every pull request:** Claude's GitHub integration can review each pull request and leave comments. Set it up by running `/install-github-app` in a terminal `claude` session. It needs an API key or subscription.
- **Before merging, on demand:** run `/code-review` in Claude Code, with no setup. `/code-review ultra` is a deeper review, and it's billed.

**Done when:** a new pull request gets review comments without being asked.

## 4. Safety rails on `main`

**Status:** the template and label check are done. Branch protection is on hold, because the setup isn't worth it yet. Without it, a pull request can still be merged with a failing check, so look at the checks before merging. Pick this up if that becomes a problem. The bump workflow is already ready for it, and the steps are below.

- ✅ **A pull request template:** add `.github/pull_request_template.md` with a short checklist, such as "tried on tablet", "played the sounds" and "added a `minor` label if it's a new feature".
- ✅ **A label check:** an Action fails until the pull request has a `patch`, `minor` or `major` label, so the version bump is a deliberate choice. The `patch` label doesn't exist yet, and `.github/workflows/bump-version.yml` would need to create it.
- **Branch protection:** require the checks to pass before merging.

**Watch out:** the bump Action pushes its commit and tag straight to `main`, and that commit never has passing checks. The Action's normal token can't be exempted from branch protection, so without a fix the version bump fails after every merge, and tablets stop getting updates.

**The fix:** the bump Action pushes with a deploy key, and the ruleset exempts deploy keys. A deploy key only works on this one repository and can be deleted at any time. `bump-version.yml` uses the key when the `BUMP_DEPLOY_KEY` secret exists, and the normal token until then.

To turn it on, after the checks and this workflow have merged:

1. **Make a key,** outside the project folder so it can't be committed: `ssh-keygen -t ed25519 -C "sight-words version bump" -f bump_key`, pressing Enter twice for no passphrase
2. **Add the public half:** in the repository's **Settings > Deploy keys > Add deploy key**, paste `bump_key.pub` and tick **Allow write access**.
3. **Add the private half:** in **Settings > Secrets and variables > Actions > New repository secret**, name it `BUMP_DEPLOY_KEY` and paste `bump_key`. Then delete both files.
4. **Merge a pull request** and check that **Bump version** still passes.
5. **Add the ruleset:** in **Settings > Rules > Rulesets > New branch ruleset**:
   - Set the status to **Active**, and the target to the default branch.
   - Add **Deploy keys** to the bypass list. Leave Repository admin off, so the rule applies to everyone.
   - Turn on **Require status checks to pass**, and add `check` and `label`, which are the job names.
   - Leave **Require branches to be up to date** off, because every merge's bump commit would make other open pull requests out of date.
6. **Merge another pull request** and check that **Bump version** passes with the ruleset on. If it fails, set the ruleset to **Disabled** and find out why, because tablets get no update until it's fixed.

**Done when:** a pull request without passing checks or a label can't be merged, and a merge still bumps the version.

## 5. A preview link for each pull request

A service such as Netlify or Cloudflare Pages can publish each pull request at its own address, so it can be tried on a tablet before merging. Today, changes only reach a tablet after merging, unless it uses `python -m http.server 8000` over Wi-Fi.

Check that the preview serves the `audio` folder, and that its address doesn't need a sign-in on the tablet. Progress is saved per address, so a preview starts with no stars.

**Done when:** each pull request shows a link that opens the app on a tablet.
