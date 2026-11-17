# Apehealth

Local-first PWA food tracker. Take or upload a meal photo, let MiniMax estimate calories, and log it on this device.

- No account and no backend
- Meals and your daily goal stay in `localStorage`
- History charts past days; you can edit a meal (time, calories, description) or re-upload a photo for a new MiniMax estimate
- Paste your MiniMax API key in Settings (same pattern as [Apeditor](https://github.com/roxelfivan/apeditor): the key never leaves this browser except as a Bearer token to MiniMax)

```bash
npm install
npm run dev
```

Install from the browser as a Progressive Web App (standalone display, offline shell).
