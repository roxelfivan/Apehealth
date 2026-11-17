# Runtime flows

> End-to-end sequence walks. Each flow names the files it touches.

---

## 1. Cold start

**Goal:** show the Today screen with the stored meals and the stored settings.

```
app/page.tsx            server component → renders <HomeScreen />
  └─ HomeScreen.tsx     "use client"
       ├─ useMeals()      → lib/store.ts → lib/storage.ts → localStorage
       ├─ useSettings()   → lib/store.ts → lib/storage.ts → localStorage
       └─ useTranslator() → lib/i18n/useTranslator.ts → useSettings()
```

1. Next.js prerenders `/` at build time. `HomeScreen` renders on the server with `SERVER_SETTINGS` (empty key, default goal, `gemini` provider) so the markup is stable.
2. On hydration, `useSyncExternalStore` calls `settingsSnapshot()`, which calls `loadSettings()`.
3. `loadSettings()` reads every `localStorage` key and returns a `Settings` object. `settingsSnapshot()` JSON-stringifies it and compares it with the previous snapshot. If it differs, subscribers re-render.
4. `PwaRegister` registers `/sw.js` in a `useEffect`, after first paint.

**Files:** `app/page.tsx`, `components/HomeScreen.tsx`, `lib/store.ts`, `lib/storage.ts`, `components/PwaRegister.tsx`.

## 2. Estimation (the core flow)

**Goal:** turn a photo into a reviewable estimate.

```
AddMeal.tsx  onFile(file)
  ├─ file.type.startsWith("image/")?  → else errors.choosePhoto
  ├─ hasApiKey(settings)?             → else open Settings + errors.needApiKey
  ├─ fileToApiDataUrl(file)           → lib/image.ts
  ├─ setStep("analyzing")
  ├─ analyzeMealPhoto(dataUrl, settings)   → lib/analyze.ts
  │    ├─ settings.providers[settings.provider]
  │    ├─ provider === "gemini"  → lib/gemini.ts   → fetch()
  │    └─ else                   → lib/minimax.ts  → fetch()
  ├─ setResult / setDescription / setCalories
  └─ setStep("review")
```

1. The user picks a file. The input's `value` is reset to `""` immediately so re-picking the same file fires `onChange` again.
2. `hasApiKey(settings)` checks **the active provider's** key. A missing key opens the Settings modal and sets the error; no request is made.
3. `fileToApiDataUrl` returns the original bytes as a data URL when the file is under `3.5 * 1024 * 1024` bytes and its MIME type is one of JPEG/PNG/GIF/WebP (sniffed from magic bytes when `file.type` is wrong or empty). Otherwise it falls back to `fileToCompressedDataUrl`, which re-encodes via a canvas to JPEG at max side `1280`, quality `0.82`.
4. `analyzeMealPhoto` dispatches on `settings.provider`. See [AI analysis](05-ai-analysis.md).
5. On success, the result populates the review form. On failure, the step returns to `"pick"`, the image is cleared, and the error message is shown.

**Files:** `components/AddMeal.tsx`, `lib/image.ts`, `lib/analyze.ts`, `lib/gemini.ts` / `lib/minimax.ts`, `lib/nutrition.ts`.

## 3. Saving a meal

**Goal:** persist a reviewed estimate.

```
AddMeal.tsx  save()
  ├─ Number(calories) is finite and >= 0?   → else errors.calorieAmount
  ├─ compressDataUrlForStorage(image)       → lib/image.ts
  ├─ addMeal({...})                          → lib/storage.ts
  │    ├─ saveMeals([meal, ...loadMeals()])
  │    │    ├─ localStorage.setItem("apehealth.meals", JSON.stringify(meals))
  │    │    └─ emitStoreChange()
  │    └─ StorageFullError on a quota error
  └─ router.push("/")
```

The new meal is **prepended**, so the list is newest-first without a sort.

`compressDataUrlForStorage` shrinks the photo until it fits `STORAGE_MAX_CHARS` (`180_000`) characters, trying `(960, 0.72)`, `(720, 0.64)`, `(480, 0.55)`. If it still does not fit, the last attempt is used and `localStorage.setItem` may throw `StorageFullError`, which is caught and surfaced as `errors.storageFull`.

**Files:** `components/AddMeal.tsx`, `lib/image.ts`, `lib/storage.ts`.

## 4. Editing and re-estimating an existing meal

**Goal:** correct a meal, optionally with a fresh estimate.

```
MealEditor.tsx  onFile(file)
  ├─ hasApiKey(settings)?            → else open Settings + errors.needApiKey
  ├─ fileToApiDataUrl(file)
  ├─ setAnalyzing(true)
  ├─ analyzeMealPhoto(dataUrl, settings)
  ├─ on success → setDescription / setCalories / setConfidence / setProtein / setCarbs / setFat / setItems
  └─ on failure → setImage(meal.imageDataUrl)  ← rollback
```

The rollback on failure is deliberate: a failed re-estimate must not leave the meal half-updated. The original photo, calories, macros, and items are restored before the error is shown.

`save()` then calls `updateMeal(id, patch)`, which re-normalises the description, clamps calories to `>= 0`, and rounds the macros.

**Files:** `components/MealEditor.tsx`, `lib/storage.ts`, `lib/analyze.ts`.

## 5. Deleting a meal

```
MealList.tsx
  ├─ trash button → setPendingDelete(meal.id)   ← no deletion yet
  └─ "Delete"     → deleteMeal(id)
                     ├─ saveMeals(loadMeals().filter(m => m.id !== id))
                     └─ emitStoreChange()
```

Deletion is two-step. There is no undo.

**Files:** `components/MealList.tsx`, `lib/storage.ts`.

## 6. Changing settings

**Goal:** persist a new goal, provider, key, endpoint, or model.

```
SettingsModal.tsx
  ├─ useState(initial)                    ← the draft
  ├─ selectProvider(p)                    ← swaps the active config in the draft
  ├─ updateActive(patch)                  ← edits the active config in the draft
  └─ onSubmit
       ├─ validate dailyGoal in [500, 8000]  → else errors.goalRange
       ├─ normalise every provider config (trim, fall back to the provider default)
       └─ onSave(settings) → saveSettings(settings) → lib/storage.ts
            ├─ writes apehealth.dailyGoal, apehealth.provider,
            │  apehealth.ephemeralKey, apehealth.providers, apehealth.locale
            ├─ writes the keys to localStorage or sessionStorage
            ├─ removes the legacy keys
            └─ emitStoreChange()
```

The dialog edits a **draft**; nothing is persisted until **Save**. The single exception is the language row, which calls `setLocale(option)` immediately so the whole interface — including an in-flight analysis — follows the new language.

**Files:** `components/SettingsModal.tsx`, `lib/storage.ts`.

## 7. Switching the language

```
LanguageSwitch.tsx  (or the Settings language row)
  └─ setLocale(locale)
       ├─ localStorage.setItem("apehealth.locale", JSON.stringify(locale))
       └─ emitStoreChange()
          └─ useSettings() → new locale
               ├─ useTranslator() re-binds `t` / `tn`
               ├─ LocaleHtmlLang sets <html lang>
               └─ every component re-renders with the new strings
```

`setLocale` writes **only** the locale. It never rewrites the API keys or any other setting.

**Files:** `components/LanguageSwitch.tsx`, `components/LocaleHtmlLang.tsx`, `lib/storage.ts`, `lib/i18n/useTranslator.ts`.

## 8. Reading the history

```
HistoryScreen.tsx
  ├─ range state: 7 | 14 | 30
  ├─ dailyTotals(meals, range, today)   → lib/storage.ts
  │    └─ one row per day, zero-filled, oldest first
  ├─ mealsByDay(meals)                  → lib/storage.ts
  │    └─ groups sorted newest first, meals within a group sorted newest first
  └─ filter the groups to the days present in the series
```

A meal's day is derived from `createdAt` in the **local** time zone via `todayKey(date)`.

**Files:** `components/HistoryScreen.tsx`, `lib/storage.ts`.

## 9. Offline behaviour

The service worker precaches `/`, `/add`, `/history`, `/manifest.json`, and `/icons/icon-192.png`. On a fetch failure it falls back to the cache, then to `/`.

Estimation has no offline path — it needs the network and a valid key. Everything else renders from `localStorage` with no network at all.

**Files:** `public/sw.js`, `components/PwaRegister.tsx`.