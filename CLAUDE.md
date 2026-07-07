# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`mil4n.de` — Milan Swillus's personal landing page. A static site with no build step, no package manager, and no test suite: `index.html` + `support.js` are deployed as-is to Vercel (see `vercel.json`).

## Running locally

There is no dev server or build command. Open `index.html` directly in a browser, or serve the directory with any static file server, e.g.:

```
python3 -m http.server 8000
```

The "secret chat" feature calls a local API at `http://localhost:5005/api/messages` when the hostname is `localhost`/`127.0.0.1` (see below) — that API is an external service, not part of this repo, so chat will silently fall back to the static `messages.json` unless that server happens to be running separately.

## Architecture

### The live site is a single-file DC component

The entire UI lives inline inside `index.html`, written in a proprietary "DC" (dynamic component) template format, not plain HTML/JS:

- `<x-dc>...</x-dc>` wraps a template that uses `{{ expr }}` interpolation, `<sc-if value="{{ cond }}">` for conditionals, and `<sc-for list="{{ arr }}" as="item">` for loops.
- `<script type="text/x-dc" data-dc-script>` at the bottom defines `class Component extends DCLogic { ... }` — a React-like class component (`state`, `setState`, `componentDidMount`/`componentWillUnmount`, arrow-function handlers).
- `renderVals()` is the one method that maps `state` to every value the template's `{{ }}` expressions reference (colors, labels, computed rows, event handlers, etc.). When adding UI, add the underlying state in `state`/handlers, then expose it through `renderVals()`, then reference it in the template.
- `support.js` is the runtime that parses this template, lazy-loads React/ReactDOM from a CDN, and boots the component. **It is generated — the file header says `GENERATED from dc-runtime/src/*.ts — do not edit`.** Never hand-edit `support.js`; the runtime source it's built from doesn't live in this repo, so any needed runtime change has to happen upstream. Treat it as a vendored dependency.

Do all feature work by editing the template and the `Component` class inside `index.html`.

### `app.js` and `styles.css` are dead code

The site was redesigned (see commit `134e9f4`, "redesign: replace site with Claude Design-based version") to move everything into the DC component in `index.html`. `app.js` (vanilla JS: clock, theme, hash-based router, DOM-rendered Yatzy game) and `styles.css` (the old class-based styling) are the **pre-redesign implementation** and are no longer referenced by `index.html` — neither script nor stylesheet is loaded anywhere. They're leftover, not wired up. Don't assume changes to them affect the live site; if reproducing their logic, the current source of truth is the equivalent code inside `index.html`'s inline `<script data-dc-script>` block (both implementations independently contain the same Yatzy scoring/bot-AI logic — keep that in mind if only one copy gets updated).

### Page structure (inside the `<x-dc>` template)

A single-page app with client-side view state (`state.view`), no real routing:
- `menu` — nav links (linkedin, github, about, secret, theme toggle)
- `about` — static bio blurb
- `secret` — tabbed section (`state.secretTab`) with two sub-views:
  - `chat` — polls for messages (see below) and renders them
  - `yatzy` — a full Yatzy game, playable solo or against a bot that plays via computed expected-value optimization (`getBotDecision`, `precomputeEV1Table`, etc. — a from-scratch EV-maximizing solver, not a lookup table)

Theme (`dark`/`light`) and view are plain component state, not persisted across reloads.

### Messages / chat backend

`_loadMessages()` in `index.html` tries, in order:
1. `http://localhost:5005/api/messages` (dev) or `/api/messages` (prod) — an external "Megamilan bot" API not part of this repo, with an 800ms timeout.
2. Falls back to the static `messages.json` in this repo if that fetch fails or returns nothing.

Polls every 3 seconds. `messages.json` is just a static fallback snapshot — updating it does not affect the live chat feed, only what unauthenticated/offline visitors see.

### Deployment

`vercel.json` configures Vercel to serve the repo as-is (`cleanUrls`) and sets baseline security headers (`X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`) on every route. No build command is configured — Vercel serves the static files directly.
