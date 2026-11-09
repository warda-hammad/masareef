# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"مصاريفي": a static expense tracker for people in Egypt. Arabic RTL UI, Egyptian pounds (ج.م). Plain HTML/CSS/JS only, with no backend, no framework, no build step and no dependencies. It's meant to be deployed as-is to a free static host. All data stays in the browser's `localStorage`, and the app never makes a network request (no CDNs, no analytics, local fonts only). Keep it that way.

## Running

- Open `index.html` directly (`file://`). This has to keep working.
- Or serve the folder: `python -m http.server`. Once the PWA/service-worker step lands, this is required, because service workers need localhost or HTTPS.
- There is no build, lint or test tooling in the repo. `js/storage.js`, `js/format.js` and `js/expenses.js` don't touch the DOM, so they can be exercised in Node by loading them into a `vm` context with a stub `localStorage`.

## Architecture

- **Classic scripts, no ES modules.** Modules break under `file://`. `index.html` loads the scripts in dependency order: `storage.js` → `format.js` → `expenses.js` → `app.js`. Each of the first three defines one global object (`Store`, `Fmt`, `Expenses`) via an IIFE. `app.js` is the only file that touches the DOM. New modules follow the same pattern and must be added to the script list in order.
- **Single state object.** `Store` holds `{version, expenses[], categories[], settings{}}` under the key `masareef.v1`. Shape changes go through `migrate()` in `storage.js`, and `VERSION` gets bumped. Corrupt JSON is copied to `masareef.v1.corrupt.<ts>` instead of being overwritten. If that copy fails, or storage is unavailable, `persist` goes false: the app runs memory-only and shows a banner. `Store.error()` drives that banner.
- **Mutate-then-save with rollback.** Every `Expenses` write applies the change in memory, calls `Store.save()`, and reverts if the save fails (for example on quota errors). It returns `null`/`false` on failure so the UI can show an error. New data operations (categories, budget, CSV import) should follow the same pattern.
- **Rendering.** `render()` in `app.js` rebuilds the header and the list from state after every change. User-provided text (notes, category names) must only reach the DOM through `textContent`/`createElement`, never `innerHTML`.
- **Money is integer piasters** (`amount: 15000` = 150 ج.م). Parse with `Fmt.parseAmount` (accepts Arabic-Indic digits, `٫`, thousands separators) and display with `Fmt.moneyNumber`. Wrap displayed amounts in an `dir="ltr"` `.num` span (`moneyEl()` in `app.js`).
- **Dates are local `YYYY-MM-DD` strings.** Never use `new Date('YYYY-MM-DD')`, because it parses as UTC. Use the `Fmt` helpers.
- **Categories.** The built-in categories have stable ids (`food`, `transport`, `bills`, `rent`, `health`, `outings`, `other`) and `builtIn: true`. Expenses reference them by id. `Store.category()` falls back to `other` for unknown ids, and `migrate()` re-adds any missing built-ins.

## Conventions

- **Digits are always Latin (0-9).** The number font, JetBrains Mono, has no Arabic-Indic glyphs. `Intl` date formatters use `ar-EG-u-nu-latn`.
- **UI copy is Egyptian colloquial Arabic, phrased gender-neutrally.** Use nouns ("حفظ", "مسح", "تأكيد المسح") or impersonal phrasing, not gendered imperatives.
- **Brand colors are CSS variables in `:root`** of `css/styles.css`: `--ink #14121C` (background), `--surface #221E2E`, `--cream #F7F3EE` (text), `--rose #FF5C7A` (primary action/danger), `--sun #FFC857` (warning/focus). Fonts are Alexandria (UI) and JetBrains Mono (`.num`), loaded from `fonts/`.
- **Layout is mobile-first.** Tap targets are at least 44px, there's no horizontal scroll at 360px, and physical left/right is avoided in favor of logical properties (`inset-inline`, `margin-inline-*`). The RTL layout depends on this.

## Roadmap (built step by step; stop after each step so the owner can test)

1. Page skeleton + add/edit/delete expense (done)
2. Custom categories (built-ins can't be deleted; deleting a used category reassigns its expenses)
3. Monthly budget with warnings at 80% (sun) and 100% (rose)
4. Dashboard with hand-drawn SVG charts (by category, by day of month), no chart library
5. Search + month/category filters, persisted in the URL hash
6. CSV export (UTF-8 BOM, `date,amount,category,note`) and import with preview and merge/replace
7. PWA: `manifest.webmanifest`, icons, cache-first `sw.js`
8. Accessibility pass, privacy page, "delete all my data", deploy README

Before publishing, add JetBrains Mono's OFL license to `fonts/`. Only Alexandria's is there now.
