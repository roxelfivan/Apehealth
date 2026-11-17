# Apehealth

Local-first PWA food tracker. Take or upload a meal photo, let AI estimate calories, and log it on this device.

- No account and no backend
- Meals and your daily goal stay in `localStorage`
- History charts past days; you can edit a meal (time, calories, description) or re-upload a photo for a new estimate
- Paste your own API key in Settings (same pattern as [Apeditor](https://github.com/roxelfivan/apeditor): the key never leaves this browser except as a credential sent to the AI provider)

## Documentation

| | |
|---|---|
| **[User guide](docs/)** | Task-oriented walkthroughs: getting started, adding meals, editing meals, history, settings, providers, privacy, troubleshooting. |
| **[Functional Specification](func_spec/)** | The engineering reference: architecture, runtime flows, persistence, the AI provider contracts, and the glossary. |
| **[Release notes](RELEASE_NOTES.md)** | What changed in each version. |

## Providers

Settings has an **AI provider** switcher. Each provider keeps its own API key, endpoint and model, so you can hold both a Gemini key and a MiniMax key and switch between them without re-pasting anything.

- **Gemini** (default) — create a key at [aistudio.google.com/api-keys](https://aistudio.google.com/api-keys). Requests go to the Gemini `generateContent` API with the `x-goog-api-key` header.
- **MiniMax** — create a key at [platform.minimax.io](https://platform.minimax.io/user-center/basic-information/interface-key). Requests go to the OpenAI-compatible Chat Completions API with a Bearer token.

The provider only affects how the photo is analyzed; everything else in the app is provider-agnostic. Model and endpoint overrides live under **Settings → Advanced API options**.

## Languages

English and Traditional Chinese (繁體中文) are supported.

- Switch from the globe button in the header (desktop) or the bottom nav (mobile), or from **Settings → Language**. The choice is saved to `localStorage`; on first visit the app follows your browser language.
- The language also drives the AI analysis: the prompt sent to the provider asks for the meal description and food item names in the selected language, so a Traditional Chinese user gets a Traditional Chinese breakdown.
- Dates, times and numbers are formatted with `Intl` for the active locale, and `<html lang>` is kept in sync for screen readers.

Translations live in `lib/i18n/dictionary.ts`. Add a new locale by adding an entry there and to `lib/i18n/locales.ts`.

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`, go to **Settings**, paste your provider API key, and save. Install from the browser as a Progressive Web App (standalone display, offline shell).

## Checks

```bash
npm run lint             # ESLint
npm run verify:i18n      # prompt language, provider routing, dictionary lookups
npm run verify:storage   # provider defaults, per-provider keys, legacy migration
npm run build            # type-check + production build
```
