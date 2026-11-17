# Maintenance guide

> Recipes, conventions, invariants, and known rough edges.

---

## 1. Where does X live?

| I want to change… | Look in |
|---|---|
| The provider list, endpoints, model presets, or key links | [`lib/providers.ts`](../lib/providers.ts) |
| The Gemini request or response handling | [`lib/gemini.ts`](../lib/gemini.ts) |
| The MiniMax request or response handling | [`lib/minimax.ts`](../lib/minimax.ts) |
| Which provider is called | [`lib/analyze.ts`](../lib/analyze.ts) |
| The analysis prompt | `USER_PROMPT_EN` and `USER_PROMPT_ZH_HANT` in **both** client modules |
| How a model reply becomes an `AnalyzeResult` | [`lib/nutrition.ts`](../lib/nutrition.ts) |
| Where data is stored, and the legacy migration | [`lib/storage.ts`](../lib/storage.ts) |
| A user-facing string | [`lib/i18n/dictionary.ts`](../lib/i18n/dictionary.ts) — **both** dictionaries |
| The provider switcher UI | [`components/SettingsModal.tsx`](../components/SettingsModal.tsx) |
| The calorie ring | [`components/HomeScreen.tsx`](../components/HomeScreen.tsx) |
| The bar chart | [`components/CalorieChart.tsx`](../components/CalorieChart.tsx) |
| The capture flow | [`components/AddMeal.tsx`](../components/AddMeal.tsx) |
| Theme tokens and button classes | [`app/globals.css`](../app/globals.css) |
| The version shown in the header | `package.json` → [`next.config.ts`](../next.config.ts) → [`lib/version.ts`](../lib/version.ts) |
| The offline shell | [`public/sw.js`](../public/sw.js) |

## 2. Recipes

### Add a string

1. Add the key to `en` in `lib/i18n/dictionary.ts`.
2. Add the translation to `zhHant` in the same file. The type checker will fail if you skip this.
3. Use `t("section.key")` in the component. For a string with a value in it, use `t("section.key", { name: value })`.
4. If the string needs a link, use `tn("section.key", { link: <a … /> })` — never put raw HTML in the dictionary.

### Add a provider

1. Add the id to `PROVIDERS` and an entry to `PROVIDER_DEFS` in `lib/providers.ts`.
2. Create `lib/<name>.ts` with `analyzeMealPhoto<Name>(imageDataUrl, config, locale): Promise<AnalyzeResult>`.
3. Copy the endpoint-safety check and the JSON extraction from an existing client.
4. Add the branch in `lib/analyze.ts`.
5. Add assertions to `scripts/verify-i18n.mts` for the new request shape.
6. Update the provider tables in `docs/providers.md` and in `func_spec/05-ai-analysis.md`.

Nothing else changes. The Settings UI iterates `PROVIDERS`, the storage layer iterates `PROVIDERS`, and the dictionary interpolates `PROVIDER_DEFS[provider].label`.

### Change the default model

Edit `PROVIDER_DEFS.<provider>.model` and `PROVIDER_DEFS.<provider>.models` in `lib/providers.ts`, then update the matching tables in `docs/providers.md` and `func_spec/05-ai-analysis.md`.

**Existing installs keep their saved model.** A changed default only affects fresh installs, because `loadProviderConfigs` prefers a stored value over the default. That is deliberate — silently changing a user's model on upgrade would change their results and their bill.

### Ship a release

1. Bump `version` in `package.json`.
2. `npm install --package-lock-only` to sync the lockfile.
3. Update `docs/whats-new.md` and `RELEASE_NOTES.md`.
4. Update the "Applies to" line in `func_spec/README.md`.
5. Run `npm run lint && npm run verify:i18n && npm run verify:storage && npm run build`.

The version in the app header updates itself — `next.config.ts` reads `package.json` at build time.

### Add a locale

1. Add the tag to `LOCALES` in `lib/i18n/locales.ts`.
2. Add the BCP 47 tag to `LOCALE_TAGS` and the endonym to `LOCALE_NAMES`.
3. Add a dictionary to `lib/i18n/dictionary.ts` typed as `Dictionary`.
4. Register it in the `DICTIONARIES` map in `lib/i18n/translate.ts`.
5. Add the variant to `matchLocale` so browser detection works.
6. Add a prompt variant in both client modules and extend `verify-i18n.mts`.

## 3. Conventions

| Convention | Why |
|---|---|
| `"use client"` at the top of every component | Every screen touches `localStorage` and the store. |
| `@/` for imports | The `@/*` path alias maps to the repo root. |
| One component per file | The app has no compound components. |
| A component never imports another component's internals | Only shared UI lives in `components/`; shared logic lives in `lib/`. |
| Types in `lib/types.ts` | One place to look for the data model. |
| Dictionary keys are `section.camelCase` | Resolved by a dotted path in `translate`. |
| Errors are dictionary strings, not thrown literals | Every user-visible error must be localisable. |
| `emitStoreChange()` after every write | Without it the UI goes stale. |
| Day bucketing is local time | A UTC boundary would disagree with the user's calendar. |

## 4. Invariants and gotchas

### The store must notify

Any write to `localStorage` outside `lib/storage.ts` is a bug. Any write inside `lib/storage.ts` that does not call `emitStoreChange()` is also a bug.

### The snapshot must stay a string

`useSyncExternalStore` compares by identity. If `settingsSnapshot()` returned an object, every read would produce a new reference and the app would render in a loop. Keep it stringified.

### The server snapshot must be valid

`SERVER_SETTINGS` in `lib/store.ts` is used for server rendering. If it does not match the shape `loadSettings()` returns, hydration mismatches and React logs a warning.

### The remount key excludes the locale

The `key` on `SettingsForm` deliberately omits the locale so switching the language does not throw away the user's draft. Adding the locale to the key would silently discard in-progress edits.

### The key map and the ephemeral flag must agree

`readProviderKeys` falls back across both storage locations, so a mismatch is not fatal — but it leaves a stale copy of a secret on disk. `writeProviderKeys` removes the other copy. Keep them in sync.

### Legacy keys must keep being read

The v0.0.2 keys (`apehealth.apiKey`, `apehealth.apiEndpoint`, `apehealth.model`) are still read on every load. Do not delete that path until the migration window has passed. Delete it in a major version, not a patch.

### The provider-aware strings need their placeholder

`translate` leaves an unsubstituted `{provider}` in the output. If you see `{provider}` rendered in the UI, a call site is missing the parameter.

### `target: "ES2017"` forbids the regex `s` flag

Use `[\s\S]` instead of `.` with the `s` flag. This caught `lib/gemini.ts` during development.

### `tsconfig` has `isolatedModules`

Re-exporting a type needs `export type { Foo }`, not `export { Foo }`.

### The service worker cache name must be bumped

`CACHE` in `public/sw.js` is `apehealth-v4`. Bump it when the shell changes, or clients keep an old build whose assets are gone.

### The model field is a suggestion list, not a limit

The `<datalist>` in the Settings modal only offers options. The user can type any model id their provider supports. Do not add a validation that rejects unknown ids — providers add and retire models constantly.

## 5. Known rough edges

| Rough edge | Impact | Notes |
|---|---|---|
| **No export or backup** | Clearing site data destroys the meal log. | The highest-value missing feature. A JSON export/import would be small. |
| **No component or DOM tests** | A regression in the UI is only caught by hand. | `verify:i18n` and `verify:storage` cover the logic, not the rendering. |
| **No automated live-provider test** | A provider change can break silently until a user tries it. | The request shape was validated against the live API by hand. |
| **No Content-Security-Policy** | Defence in depth is missing. | Low practical risk — no untrusted HTML is rendered. |
| **The prompt is duplicated across both clients** | Changing one and not the other makes the providers disagree. | `verify-i18n.mts` checks the semantics, but the duplication is real. A shared `lib/prompt.ts` would remove it. |
| **The analysis result is not persisted separately** | Re-estimating always costs a new provider call. | Storing the last raw response would allow a "retry with a different prompt" feature later. |
| **Photo compression is fixed-quality** | A very large photo may still fail to save. | The error is surfaced, so the user can retake at a lower resolution. |
| **Only the last 30 days are reachable in the UI** | Older meals are stored but not shown in History. | The data is intact; only the range selector is limited. |

## 6. The pre-flight checklist

Before you call a change done:

```bash
npm run lint
npx tsc --noEmit
npm run verify:i18n
npm run verify:storage
npm run build
```

And by hand, if you touched the UI:

- The change in both languages.
- The change at a phone width and a desktop width.
- The change in the light and the dark scheme.
- The keyboard path — `Tab` order, `Escape`, and the focus trap in the modal.
- The change with an empty key, a valid key, and a wrong key.
