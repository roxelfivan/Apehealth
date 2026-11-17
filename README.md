# Apehealth

Local-first PWA food tracker. Take or upload a meal photo, let MiniMax estimate calories, and log it on this device.

- No account and no backend
- Meals and your daily goal stay in `localStorage`
- History charts past days; you can edit a meal (time, calories, description) or re-upload a photo for a new MiniMax estimate
- Paste your MiniMax API key in Settings (same pattern as [Apeditor](https://github.com/roxelfivan/apeditor): the key never leaves this browser except as a Bearer token to MiniMax)

## Languages

English and Traditional Chinese (繁體中文) are supported.

- Switch from the globe button in the header (desktop) or the bottom nav (mobile), or from **Settings → Language**. The choice is saved to `localStorage`; on first visit the app follows your browser language.
- The language also drives the AI analysis: the prompt sent to MiniMax asks for the meal description and food item names in the selected language, so a Traditional Chinese user gets a Traditional Chinese breakdown.
- Dates, times and numbers are formatted with `Intl` for the active locale, and `<html lang>` is kept in sync for screen readers.

Translations live in `lib/i18n/dictionary.ts`. Add a new locale by adding an entry there and to `lib/i18n/locales.ts`.

```bash
npm install
npm run dev
```

Install from the browser as a Progressive Web App (standalone display, offline shell).
