# English Training

[Open the app](https://m-grigoryan.github.io/english-training/) · [EnglishTraining.html](https://m-grigoryan.github.io/english-training/EnglishTraining.html)

The existing English/Russian vocabulary app, published in its own repository. The installed app's current design, 138-meaning curated dictionary, five-question contextual quizzes, vocabulary editor, JSON imports, history and spaced-repetition schedules are preserved.

## Your data

Vocabulary, drafts, answers, session history and learning schedules are stored privately in IndexedDB in the current browser. No account, backend, analytics, or cloud sync is used. Updates at the same web address preserve browser data. Clearing site data or changing browser/device/origin does not.

This website uses a different origin from a local file or localhost. Existing local vocabulary and quiz history are not automatically transferred or overwritten. Use Settings → Import JSON Files to add vocabulary here, or Vocabulary → Add Word. The bundled attempt.json is a supported example. This original app does not provide full history backup/export/restore; no such capability is implied by publication.

Folder import is optional and browser-dependent. Choosing a folder grants the browser read access; it does not grant ChatGPT permission to write there. Imported vocabulary remains private in your browser and is never added to this public repository.

## Starter vocabulary

[Download the supplied 76-word vocabulary pack](Vocabulary-76.zip). Unzip it, then use Settings → Import JSON Files to select the numbered JSON files. The current dictionary supports all 76. These are the supplied learning examples, not personal vocabulary history. Nothing is inserted until you import it.

## Practice

1. Open Vocabulary → Add Word, or import completed JSON vocabulary files.
2. Choose English → Russian or Russian → English.
3. Answer five contextual multiple-choice questions. Check Answer saves each response; feedback explains both correct and selected answers.
4. Resume unfinished quizzes, and review completed sessions in History.

Both directions have independent SM-2-style schedules. A successful word/direction session advances through 1 day, 6 days, then multiplied intervals. A wrong or unknown answer resets repetitions and schedules the next day. Repeated appearances of a word update its schedule once per completed session, using the worst result.

## Source and tests

EnglishTraining.html is the exact installed application selected for publication. index.html is its identical GitHub Pages entry point. Source/ contains the matching dictionary, logic, storage, importer, UI, styles and reproducible HTML template.

```sh
python3 Source/build.py
node Source/tests/run.cjs
```

No dependencies or build are needed to use the website. Tests use Node.js built-ins, isolated simulated state and files, not personal browser data. The original Swift/JavaScriptCore test runner is retained as an alternative for macOS.

GitHub Pages publishes main from the repository root. .nojekyll keeps the deployment static. Personal vocabulary databases, browser file handles, logs and test-session records are not published.
