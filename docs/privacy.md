# Privacy and your data

> What Apehealth stores, what leaves your device, and what never does.

## The short version

Apehealth has **no backend and no account**. Your meals, your goal, your language, and your API key live in your browser's storage. The only thing that ever leaves your device is a photo you take and the estimate request that goes with it — and that goes straight to the AI provider you chose.

## What is stored, and where

| What | Where | Notes |
| --- | --- | --- |
| Meals (photo, description, calories, macros, items, timestamp) | `localStorage`, key `apehealth.meals` | On this device only. |
| Daily calorie goal | `localStorage`, key `apehealth.dailyGoal` | |
| Selected provider | `localStorage`, key `apehealth.provider` | |
| Per-provider endpoint and model | `localStorage`, key `apehealth.providers` | |
| API keys | `localStorage`, key `apehealth.providers.keys` | Or `sessionStorage` if you ticked **Forget API key when this tab closes**. |
| Interface language | `localStorage`, key `apehealth.locale` | |
| Ephemeral-key preference | `localStorage`, key `apehealth.ephemeralKey` | |

Nothing is encrypted at rest. Anything with access to your browser profile can read the key. That is the same trade-off every local-first app makes, and the reason **Forget API key when this tab closes** exists.

## What leaves your device

Only when you estimate a meal or re-estimate an existing one:

| Provider | What is sent | Where it goes |
| --- | --- | --- |
| **Gemini** | The photo as inline base64 with its MIME type, plus the analysis prompt, plus your API key in the `x-goog-api-key` header | `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` |
| **MiniMax** | The photo as an `image_url` data URL, plus the analysis prompt, plus your API key in the `Authorization: Bearer` header | `https://api.minimax.io/v1/chat/completions` |

The API response — the estimated description, calories, macros, and food items — comes back to your browser and is stored locally.

### If you changed the endpoint

You can point Apehealth at any endpoint you like. If you do, **your key and your photo go to that endpoint instead**. Apehealth only enforces that the endpoint is HTTPS (or `http://localhost`).

## What never leaves your device

- Your meal log and its photos.
- Your daily goal, language, and provider choice.
- Anything while you are just browsing — Today, History, the settings dialog.

## Other network activity

Apehealth registers a **service worker** so the app shell opens offline and the PWA install works. The service worker caches only same-origin app files. It does not cache, intercept, or log API requests.

There is **no analytics and no telemetry**. No crash reporting, no usage tracking, no A/B testing. The only outbound request the app makes is the estimate request described above.

## Clearing your data

| To clear | Do this |
| --- | --- |
| Just the API keys | Open **Settings**, clear the key field, press **Save**. |
| The API keys and everything else | Clear site data for Apehealth in your browser's settings. |

Note that clearing site data also deletes your meal log. There is no backup and no sync — copy anything you want to keep before you clear it.

## A note on provider policies

When you use a provider, **their** privacy policy and data-retention terms apply to the photo you send them, not Apehealth's. Check them if that matters to you. For Gemini, see Google's Gemini API terms; for MiniMax, see the MiniMax platform terms.

## Next steps

- [Providers](providers.md) — exactly what each provider receives
- [Settings](settings.md) — where the key and the ephemeral-key switch live