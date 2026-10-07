# Wordle for Family and Friends

[Play in your browser](https://benjaminsprankle.github.io/wordle_clone/)

I reworked this Wordle project so my grandparents could keep playing, then extended it with multiplayer and word definitions.

## Features in this fork

- Single-player games with selectable word lengths.
- Two-player online rooms backed by Firebase Realtime Database.
- Shared puzzles, scoring, and side-by-side result boards.
- Word definitions after a game.
- Keyboard and on-screen input.
- A hosted version on GitHub Pages.

## Stack and source

HTML, CSS, and JavaScript, with Firebase's browser SDK for room state.

- `index.html`: game screens and controls.
- `script.js`: guesses, scoring, room updates, and results.
- `words.js`: word lists and definitions.
- `style.css`: presentation.

## Run locally

Serve the repository through a local HTTP server so JavaScript modules can load:

```bash
python -m http.server 8000
```

Open `http://localhost:8000`. Online rooms require an internet connection and a configured Firebase Realtime Database. For an independent deployment, replace the Firebase configuration in `script.js` with your own project.

## Attribution and scope

This is a fork of [Morgenstern2573/wordle_clone](https://github.com/Morgenstern2573/wordle_clone). The original provides the starting point; the features above describe the current fork.

Multiplayer currently coordinates exactly two players. Larger rooms are not implemented in the current room logic.
