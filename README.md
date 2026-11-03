# English Training

[Open the app](https://m-grigoryan.github.io/english-training/) · [EnglishTraining.html](https://m-grigoryan.github.io/english-training/EnglishTraining.html)

The existing English/Russian vocabulary app, published in its own repository. The installed app's current design, 138-meaning curated dictionary, five-question contextual quizzes, vocabulary editor, JSON imports, history and spaced-repetition schedules are preserved.

## Your data

The platform includes 76 shared vocabulary entries, stored in [data/vocabulary.json](data/vocabulary.json) and bundled into both HTML entry points. Every new visitor gets the same words automatically, including all Russian translations, English and Russian explanations, and 91 bilingual example pairs. No account, token or manual import is needed.

Personal additions, edits, drafts, answers, session history and learning schedules are stored privately in IndexedDB in the current browser. Updates at the same web address preserve browser data. Clearing site data or changing browser/device/origin resets personal data; the shared vocabulary is available again automatically. Optional authenticated progress sync is described below.

This website uses a different origin from a local file or localhost. Existing local vocabulary and quiz history are not automatically transferred or overwritten. Use Settings → Import JSON Files or Vocabulary → Add Word for additional personal vocabulary. The bundled attempt.json is a supported example. Publication does not transfer history between origins.

Folder import is optional and browser-dependent. Choosing a folder grants the browser read access; it does not grant ChatGPT permission to write there. Imported vocabulary remains private in your browser and is never added to this public repository.

## Shared vocabulary

The complete supplied 76-entry dataset is versioned in [data/vocabulary.json](data/vocabulary.json). The build embeds it into the standalone app, and startup saves missing entries into the browser database in one transaction. It works offline after the app is downloaded, without a separate data request.

Existing visitors receive missing words on their next reload. Matching terms (including drafts), existing edits, renamed shared entries, deletion tombstones, quiz history and review schedules are preserved. Stable word IDs prevent duplicate entries between devices. The original shared content remains in the repository; personal edits and deletions affect that visitor's collection. The “Included for everyone” label identifies an unchanged shared entry.

The quiz dictionary accepts all supplied translations and retains previously accepted synonyms, so both old imports and the new shared vocabulary remain usable. The older [76-word vocabulary pack](Vocabulary-76.zip) remains available for compatibility; importing it is unnecessary.

## Practice

1. Open Vocabulary to browse the 76 included words, or add/import personal entries.
2. Choose English → Russian or Russian → English.
3. Answer five contextual multiple-choice questions. Check Answer saves each response; feedback explains both correct and selected answers.
4. Resume unfinished quizzes, and review completed sessions in History.

Both directions have independent SM-2-style schedules. A successful word/direction session advances through 1 day, 6 days, then multiplied intervals. A wrong or unknown answer resets repetitions and schedules the next day. Repeated appearances of a word update its schedule once per completed session, using the worst result.

## Source and tests

EnglishTraining.html and index.html are identical, generated GitHub Pages entry points. Source/ contains the dictionary, shared vocabulary loader, logic, storage, importer, UI, styles and reproducible HTML template. Update data/vocabulary.json and rebuild to publish shared content changes. Existing personal versions are preserved during startup.

```sh
python3 Source/build.py
node Source/tests/run.cjs
```

No dependencies or build are needed to use the website. Tests use Node.js built-ins, isolated simulated state and files, not personal browser data. The original Swift/JavaScriptCore test runner is retained as an alternative for macOS.

GitHub Pages publishes main from the repository root. .nojekyll keeps the deployment static. Personal vocabulary databases, browser file handles, logs and test-session records are not published.


## GitHub storage and word ratings

Settings → **GitHub storage** connects this device to the private
m-grigoryan/english-training repository. Create a fine-grained GitHub personal access
token for **only this repository**, granting **Contents: Read and write**.
Paste it into the app, never into chat or a source file. No separate app account or
third-party database is required.

The token stays only in the page's memory. Reloading/closing the page forgets it;
connect again on each device. Existing local words are merged on first connection.
Changes are saved locally first and uploaded after a short delay. While connected
and online, the app checks for changes from another device about once per minute
and on reconnect or return to the page.

- **☁ Saved to GitHub** means that exact word version was confirmed in GitHub.
- **Waiting for GitHub** means a connected device has an unconfirmed edit.
- **Only on this device** means no confirmed cloud copy of that version exists here.
- Save notifications distinguish local success from confirmed GitHub success.
- Failed uploads keep local changes and display a sync error; retry with **Sync now**.
- Words and full quiz snapshots/history are stored in
  .english-training/progress.json on the repository's default branch.
  Folder paths, import file names, appearance settings, and tokens are excluded.
- The repository must remain **private**. A privacy check precedes each upload.
  Publishing this progress file would expose words, answers, and history.
- Unchanged sync does not make a new commit. GitHub SHA checks and bounded retries
  prevent silent overwrites from simultaneous saves.
- The latest word edit is used; different earlier content remains recoverable in
  Settings → preserved word versions. Conflicting answers to the same quiz stop
  sync with an explanatory error; complete each active quiz on one device at a time.
- Full progress sync is limited to 900 KB. If reached, new work remains local and
  the app shows the limit rather than silently failing.
- Each sync commit is retained in GitHub's history. A word deletion hides it from
  current practice, but it does not erase earlier Git commits.
- Public GitHub.io hosting is a separate setting. A private repository on GitHub
  Free cannot serve this app through GitHub Pages. The sync feature does not restore
  that hosting. A private storage repository and public website source can be
  hosted separately, or an eligible GitHub plan can host Pages from private source.

A word's **1–5 star rating** uses saved answers from both directions, including
unfinished sessions: round(5 × correct / all answers), with a minimum of 1 after
any answer. Unknown responses count as not correct. Words with no answers have
an empty star row and **Not rated yet**. Repeated sync never adds extra attempts.

### Verification for this update

- Existing core tests: 28 groups, 25,293 assertions.
- Existing importer tests: 10 groups.
- New GitHub sync/rating tests: 16 groups, 59 assertions, including two devices,
  failed writes, public-repository refusal, privacy rechecks, malformed remote
  data, retry limits, Unicode, schedule deduplication, and edits during uploads.
- Network tests use mocked GitHub responses. A real browser/token connection and
  physical iPhone layout need device verification before claiming live sync.


## Quick Match: timed vocabulary game

The Quiz page now offers **Start timed game** alongside the existing five-question
contextual quiz. A session is created only on Start. Quick Match has exactly
30 questions with a four-second deadline per question. It shows a dictionary
English term, two Russian translations (one correct), and “I don't know”.
Choosing an answer immediately saves it and moves to the next word.
At the deadline, a late answer is treated as a timeout and the next word starts.
There is no second Check/Next step in this game.

Correct answers earn one point; wrong choices earn zero. Unknown and timeout
answers earn zero using the existing unknown outcome, with distinct reasons
retained for results. Results show correct, total not-correct, wrong-choice,
unknown and timeout counts, per-word ratings, and a 30-answer review.

Quick Match reuses TrainingCore.submit, next, schedule and wordRating.
Its kind field distinguishes the 30-question/two-choice format from legacy
five-question/five-choice sessions. Existing saved sessions remain valid.
It prioritizes supported words in the local collection, filling the remaining
questions from the existing curated dictionary. Correct and incorrect Russian
choices both come from that dictionary, excluding overlapping translations and
known conflicting meanings. With the shipped dictionary, all 30 terms are unique.

Uncollected dictionary words use a stable dictionary meaning identifier for
their rating/history. When that word is later added to vocabulary, those answers
and learning progress attach to the new vocabulary entry rather than disappearing.

Leaving/reloading stops this view's clock and requires explicit Resume.
The current question's original deadline is preserved: if it passed, that one
question counts as a timeout on resume. A new question then gets four seconds.
Stale callbacks and rapid duplicate clicks cannot score another question.
Browser background throttling can delay display updates; deadline checks use
wall time and never give a late selection a correct point.

Additional checks: 10 Quick Match groups, 183,051 assertions, including
1,000 randomized games (30,000 questions), scoring, shared ratings, persistence,
GitHub merge, dictionary-to-vocabulary rating transfer, exact deadline and stale
clock callbacks. Production markup helpers were checked for ready, running,
and results states. A real browser and physical iPhone still need verification.


### Quick Match choice feedback

The two translations are now large equal-width cards beside each other, including on phones. The unknown option spans the row below. A choice immediately shows Correct (green) or Incorrect (red), highlights the correct translation, and disables all three controls. Feedback stays for 650 ms before automatic advancement. The following question receives its own full four seconds after that feedback interval. Unknown and timeout outcomes reveal the right translation too. Ratings and scoring are unchanged.
