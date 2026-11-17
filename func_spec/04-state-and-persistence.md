# State & persistence

> Every byte Apehealth stores, where it lives, and how it is read back.

---

## 1. The store

`lib/store.ts` exposes two hooks over a single external store:

```ts
export function useMeals(): Meal[]
export function useSettings(): Settings
```

Both use `useSyncExternalStore` with a subscription to `lib/events.ts`:

```ts
export function emitStoreChange() {
  for (const listener of listeners) listener();
}

export function subscribeStore(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
```

### The snapshot pattern

Each hook keeps a module-level string snapshot:

```ts
function settingsSnapshot(): string {
  const next = JSON.stringify(loadSettings());
  if (next !== settingsSnap) settingsSnap = next;
  return settingsSnap;
}
```

`useSyncExternalStore` compares the snapshot by **string identity**. Because `loadSettings()` re-reads `localStorage` on every call, a plain object would produce a new reference each time and re-render forever. Stringifying makes the comparison value-based, so a re-render only happens when the persisted data actually changed.

**Invariant:** every write path must call `emitStoreChange()`. A write that skips it leaves the UI stale until the next unrelated change.

### The server snapshot

```ts
const SERVER_SETTINGS: Settings = {
  dailyGoal: DEFAULT_GOAL,       // 2000
  provider: DEFAULT_PROVIDER,    // "gemini"
  providers: Object.fromEntries(
    PROVIDERS.map((p) => [p, defaultProviderConfig(p)]),
  ) as Settings["providers"],
  ephemeralKey: false,
  locale: DEFAULT_LOCALE,        // "en"
};
```

This is the third argument to `useSyncExternalStore` — the value used during server rendering and hydration. It must be a valid `Settings` with no key, or hydration will mismatch.

## 2. `localStorage` keys

| Key | Type | Written by | Read by |
|---|---|---|---|
| `apehealth.meals` | `Meal[]` | `saveMeals` | `loadMeals` |
| `apehealth.dailyGoal` | `number` | `saveSettings` | `loadSettings` |
| `apehealth.provider` | `Provider` | `saveSettings` | `loadSettings` |
| `apehealth.providers` | `Record<Provider, { apiEndpoint, model }>` | `saveSettings` | `loadProviderConfigs` |
| `apehealth.providers.keys` | `Record<Provider, string>` | `writeProviderKeys` (persistent mode) | `readProviderKeys` |
| `apehealth.providers.keys.session` | `Record<Provider, string>` | `writeProviderKeys` (ephemeral mode) | `readProviderKeys` |
| `apehealth.ephemeralKey` | `boolean` | `saveSettings` | `loadSettings` |
| `apehealth.locale` | `Locale` | `saveLocale` | `loadLocale` |

### `sessionStorage` keys

| Key | Type | Written by | Read by |
|---|---|---|---|
| `apehealth.providers.keys.session` | `Record<Provider, string>` | `writeProviderKeys` | `readProviderKeys` |

## 3. Legacy keys and the migration

Before v0.0.3 the app had a single provider, so it stored one key, one endpoint, and one model:

| Legacy key | Migrates into | Notes |
|---|---|---|
| `apehealth.apiKey` | `apehealth.providers.keys.minimax` | The legacy provider was always MiniMax. |
| `apehealth.apiKey.session` | `apehealth.providers.keys.session.minimax` | Same, ephemeral mode. |
| `apehealth.apiEndpoint` | `apehealth.providers.minimax.apiEndpoint` | |
| `apehealth.model` | `apehealth.providers.minimax.model` | |

The migration is **read-time**, not write-time. `loadSettings` reads the legacy keys and merges them into the MiniMax slot if that slot is still empty. `saveSettings` then deletes the legacy keys, because by then the new store holds the same values.

**Migration is tolerant of the storage format.** The legacy endpoint and model were written with `JSON.stringify`, so the stored value is `"https://api.minimax.io/v1"` with quotes. `readLegacyString` parses the JSON and falls back to the raw string if parsing fails, so a hand-edited store still works.

**Do not remove the legacy read path** until you are sure no v0.0.2 install exists in the wild. After that, remove it in a major version, not a patch.

## 4. `Settings` — the shape on disk

```ts
export type Settings = {
  dailyGoal: number;
  provider: Provider;
  providers: Record<Provider, ProviderConfig>;
  ephemeralKey: boolean;
  locale: Locale;
};

export type ProviderConfig = {
  apiKey: string;
  apiEndpoint: string;
  model: string;
};
```

`apiKey` is **not** stored inside `apehealth.providers`. It lives in the key map, because it must move between `localStorage` and `sessionStorage` depending on the ephemeral preference. `loadSettings` merges it back in, so callers always see a complete `Settings`.

## 5. The provider config store

`apehealth.providers` holds the endpoint and model for each provider:

```json
{
  "gemini": {
    "apiEndpoint": "https://generativelanguage.googleapis.com/v1beta",
    "model": "gemini-3.5-flash-lite"
  },
  "minimax": {
    "apiEndpoint": "https://api.minimax.io/v1",
    "model": "MiniMax-M3"
  }
}
```

`loadProviderConfigs` starts from `defaultProviderConfig(provider)` for every provider in `PROVIDERS`, then overlays any stored values. A stored value is only accepted if it is a non-empty string; otherwise the default stands. This means a corrupt or partial store degrades to defaults instead of breaking the app.

The same tolerance applies to `provider` itself: `loadSettings` accepts it only if `isProvider(value)` passes, and otherwise falls back to `DEFAULT_PROVIDER`.

## 6. The key map

```json
{ "gemini": "…", "minimax": "…" }
```

`readProviderKeys(ephemeral)` merges the two storage locations:

- **Ephemeral on** → `session[provider] || local[provider]`
- **Ephemeral off** → `local[provider] || session[provider]`

The fallback in both directions means a key is never lost just because the user toggled the ephemeral flag after saving.

`writeProviderKeys(keys, ephemeral)` writes to **one** location and removes the other:

- Ephemeral on → write `sessionStorage`, remove the `localStorage` copy.
- Ephemeral off → write `localStorage`, remove the `sessionStorage` copy.

**Invariant:** the key map and the ephemeral flag must agree. If they disagree, the flag wins on read, so a stale copy in the other store is harmless — but it is still a stale copy of a secret on disk. `writeProviderKeys` removes it.

## 7. The meal store

`apehealth.meals` is a JSON array of `Meal`. Reads go through `normalizeMeal`, which:

1. Rejects anything without a string `id`.
2. Coerces calories to a non-negative number, defaulting to `0`.
3. Coerces protein / carbs / fat through `asNonNegativeNumber`, preserving `null`.
4. Re-parses `items` through `parseFoodItems`, discarding malformed rows.
5. Constrains `confidence` to `"high" | "medium" | "low"`, else `null`.
6. Falls back to `"Meal"` for a blank description and to `new Date().toISOString()` for a missing `createdAt`.

This means **a corrupt meal cannot crash the app**. The worst case is that the meal renders with zero calories.

### Writing meals

`saveMeals` catches a quota error and re-throws it as `StorageFullError`:

```ts
function isQuotaError(caught: unknown): boolean {
  if (!(caught instanceof DOMException)) return false;
  return (
    caught.name === "QuotaExceededError" ||
    caught.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    caught.code === 22
  );
}
```

`AddMeal` catches `StorageFullError` specifically and shows `errors.storageFull`.

## 8. Locale resolution

`loadLocale()` resolves in this order:

1. `apehealth.locale` if `isLocale(stored)` passes.
2. `matchLocale(navigator.languages ?? [navigator.language])`.
3. `DEFAULT_LOCALE` (`"en"`).

`matchLocale` maps `zh-TW`, `zh-HK`, `zh-MO`, and any `zh-Hant-*` tag to `zh-Hant`. A bare `zh` tag is skipped so it falls through to the English branch rather than guessing.

## 9. Date handling

| Function | Purpose |
|---|---|
| `todayKey(date)` | `YYYY-MM-DD` in **local** time. The day a meal belongs to. |
| `mealsForDay(meals, day)` | Meals whose `createdAt` falls on `day`. |
| `mealsByDay(meals)` | Meals grouped by day, groups newest first, meals newest first within a group. |
| `dailyTotals(meals, days, end)` | One zero-filled row per day for the last `days` days, oldest first, plus the day's calories and meal count. |
| `toDatetimeLocalValue(iso)` | ISO → the `datetime-local` input format. |
| `fromDatetimeLocalValue(value, fallbackIso)` | The inverse. Returns the fallback for an empty or unparseable value. |

**Invariant:** all day bucketing is local time. A UTC-based day boundary would move meals between days for users outside UTC, and the chart would disagree with the calendar the user sees.

## 10. Image handling

`lib/image.ts` deals in **data URLs**, never `File` objects or `Blob`s, because both providers want the image inline.

| Constant | Value | Purpose |
|---|---|---|
| `MAX_RAW_BYTES` | `3.5 * 1024 * 1024` | Above this, the original is not sent raw. |
| `STORAGE_MAX_CHARS` | `180_000` | The saved photo budget per meal. |
| `VISION_TYPES` | JPEG, PNG, GIF, WebP | The MIME types providers accept. |

`fileToApiDataUrl(file)`:
- If the file is within `MAX_RAW_BYTES` **and** its MIME type is recognised — sniffed from the magic bytes when `file.type` is missing or wrong — return the original bytes as a data URL.
- Otherwise fall back to `fileToCompressedDataUrl(file)`, which decodes to an `ImageBitmap`, draws it to a canvas, and re-encodes as JPEG at max side `1280`, quality `0.82`.

`compressDataUrlForStorage(dataUrl)` shrinks an already-analysed image for storage: if it already fits `STORAGE_MAX_CHARS` it is returned untouched; otherwise it tries `(960, 0.72)`, `(720, 0.64)`, `(480, 0.55)` and returns the first that fits — or the last attempt if none does.

## 11. Storage budget

`localStorage` is typically 5 MB per origin. Each meal stores:

- The compressed photo — up to `180_000` characters.
- A short description, a few numbers, and the food items.

So the photo dominates. Roughly 25 meals fill a 5 MB budget at the maximum photo size. Compressed photos are usually far smaller than the cap, so real usage is much higher. When it runs out, `StorageFullError` is surfaced rather than the meal being silently dropped.