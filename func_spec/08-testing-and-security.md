# Testing & security

> The two verification harnesses and the threat model.

---

## 1. The harnesses

There is no test framework and no CI suite. Two Node scripts import the **real source modules** and assert against `node:assert/strict`. They run with `tsx`, so TypeScript needs no build step.

```bash
npm run verify:i18n
npm run verify:storage
```

### `scripts/verify-i18n.mts`

Replaces `globalThis.fetch` with a mock that captures the request and returns a payload containing **both** provider response shapes, so one mock serves both clients.

| Group | What it asserts |
|---|---|
| **English prompt** | The MiniMax request contains `Return ONLY a JSON object` and does **not** contain `繁體中文`. The result's description, calories, and confidence are parsed correctly. |
| **Chinese prompt** | The request contains `繁體中文` and the exact clause `description 與 items 中的 name 必須使用繁體中文撰寫`. The result's items are parsed in order. |
| **Gemini routing** | The URL is `…/v1beta/models/gemini-3.5-flash-lite:generateContent`, the `x-goog-api-key` header carries the Gemini key, **no** `Authorization` header is sent, the image part is `inlineData` with the right `mimeType` and raw base64 `data`, and `generationConfig.responseMimeType` is `application/json`. |
| **Localised errors** | A missing MiniMax key produces `請先在設定中新增 MiniMax API 金鑰。` and `Add your MiniMax API key in Settings first.`; a missing Gemini key produces `Add your Gemini API key in Settings first.` |
| **Dictionary lookups** | `home.todaysMeals`, `home.remaining`, `home.apiKeyTitle`, `errors.missingApiKey`, and `settings.apiKeyNote` render as expected in both locales. |

The mock is restored to the real `fetch` at the end of the script.

### `scripts/verify-storage.mts`

Installs an in-memory `localStorage` / `sessionStorage` shim on `globalThis`, then imports `lib/storage.ts` **after** the shim is in place — `lib/storage.ts` guards on `typeof window === "undefined"`, so the shim is what makes it use the in-memory stores.

| Group | What it asserts |
|---|---|
| **Fresh install** | The provider is `gemini`; the Gemini endpoint and model are the defaults; MiniMax has its own defaults; `hasApiKey` is false. |
| **Per-provider keys** | Saving a Gemini key and a MiniMax key stores both, and they survive a reload. |
| **Provider selection** | Switching to MiniMax keeps the Gemini key. |
| **Ephemeral keys** | With `ephemeralKey` on, the key map is in `sessionStorage` and `localStorage` no longer holds it. |
| **Legacy migration** | A v0.0.2 store (`apehealth.apiKey`, `apehealth.apiEndpoint`, `apehealth.model`) migrates into the MiniMax slot, Gemini starts empty, and the provider is still `gemini`. |

### What is not covered

- No component or DOM test. There is no React testing library.
- No end-to-end test against a live provider. The Gemini request shape was validated by hand against the live API and the official docs, not by an automated test.
- No accessibility audit.

**When you change a provider contract, update `verify-i18n.mts` in the same commit.** The harness is the executable version of the contract in [AI analysis](05-ai-analysis.md).

## 2. Threat model

### What the app holds

| Asset | Where | Sensitivity |
|---|---|---|
| The user's API key | `localStorage` or `sessionStorage` | **High.** It authorises billable requests to the provider. |
| Meal photos | `localStorage`, base64 | Medium. Personal; a photo of someone's plate. |
| Meal descriptions and macros | `localStorage` | Low. |
| Goal, locale, provider choice | `localStorage` | None. |

### Threats and mitigations

| Threat | Mitigation |
|---|---|
| **The key leaks over the network** | The endpoint must be HTTPS. `assertSafeEndpoint` in both clients rejects plain HTTP to a remote host; only `localhost`, `127.0.0.1`, `::1`, and `[::1]` may use `http://`. |
| **The key leaks to a third party** | The key only ever goes to the endpoint the user configured — directly from the browser. There is no Apehealth server. |
| **The key is exposed to another site** | Keys are stored per-origin and are only read by this app's code. A malicious site cannot read another origin's `localStorage`. |
| **The key sits on disk after the tab closes** | The **Forget API key when this tab closes** option moves the key map to `sessionStorage`, which the browser discards with the tab. |
| **A stale copy of the key is left in the other store** | `writeProviderKeys` writes to one location and removes the other, so only one copy exists. |
| **XSS reads the key** | The app renders no untrusted HTML. Every string from the provider is inserted as text or as a JSON value that is passed through `parseFoodItems`, never as markup. There is no `dangerouslySetInnerHTML` anywhere. |
| **The photo leaks in an unexpected place** | The only outbound request carrying the photo is the estimation request to the configured provider. There is no telemetry, no analytics, and no error reporting. |
| **Storage is full and a meal is lost silently** | `StorageFullError` is surfaced to the user as `errors.storageFull`. The meal is never dropped without a message. |
| **A corrupt store bricks the app** | `normalizeMeal`, `loadProviderConfigs`, and `loadSettings` all validate and fall back to defaults. A bad value degrades one field, not the app. |

### Known residual risks

- **Keys are not encrypted at rest.** Anything with access to the browser profile can read them. This is inherent to a browser-only app and is why the ephemeral option exists.
- **A malicious service worker could read the key.** Only the app's own `/sw.js` is registered, and it is served from the origin. If the origin itself is compromised, everything is compromised.
- **XSS in a dependency would expose the key.** The runtime dependency surface is deliberately tiny — Next, React, and React DOM.
- **The provider sees the photo.** Once the request is sent, the provider's retention policy governs it. Apehealth cannot control that, and the user guide says so.
- **There is no Content-Security-Policy.** The app is static and renders no untrusted HTML, so the practical risk is low, but a CSP would be defence in depth.
- **No backup or export.** Clearing site data destroys the log. This is a data-loss risk rather than a security one.

## 3. Privacy guarantees

These are properties of the architecture, not policies:

1. **No backend.** There is no API route, no server action, and no middleware. `next build` emits three static files.
2. **No telemetry.** No analytics script, no error reporter, no beacon.
3. **One outbound request type.** The estimation request, and nothing else.
4. **Local-only persistence.** Everything else is in `localStorage` on the user's device.

## 4. The service worker

`public/sw.js` is the only code with elevated privileges, because it can intercept requests.

- It handles `GET` only.
- It ignores cross-origin requests — `if (url.origin !== self.location.origin) return;`.
- It caches only same-origin responses.

**Invariant:** never add a cross-origin fetch handler or a `POST` handler to the service worker. The estimation request must never be cached or intercepted.
