# Product overview

> What Apehealth is for, who it is for, what it does, and — just as importantly — what it deliberately does not do.

---

## 1. The problem

Tracking what you eat is tedious in exactly the way that kills the habit: you have to look up every item's calories, add them up, and decide how much of it was oil.

The alternative — photographing the plate and letting a vision model do it — is fast, but the mainstream implementations all have one of two problems:

- **They need an account.** Your food log lives on somebody else's server, and the free tier is rate-limited exactly when you want to log a meal.
- **They hide the model.** You cannot tell whether the estimate came from a cheap model or an expensive one, cannot point at the part of the photo the model was unsure about, and cannot switch providers when one is down.

## 2. The product

Apehealth is a **local-first PWA food tracker** that runs entirely in the browser. It has no backend, no account, and no server of its own.

Its central idea is **photo → estimate → correct → log**:

> Snap a plate. A vision model estimates the calories and breaks the meal into its visible foods. You correct anything that looks wrong — usually just the total — and save it. The log lives in your browser, and the ring on the Today screen tells you where you stand against your goal.

Three consequences follow from that design:

- **You supply the model.** Apehealth speaks to Gemini and MiniMax with your own API key. There is no Apehealth key, no Apehealth server, and no per-request cost to you beyond what you already pay the provider.
- **The estimate is a draft, not a fact.** The calories field is editable at the point of capture, because a photo-based estimate deserves a human check.
- **Your log stays local.** Meals, goal, language, and keys all live in `localStorage`. The only outbound request is the estimate itself, sent straight to the provider you configured.

## 3. Users

Apehealth is built for a single, narrow audience:

| | |
|---|---|
| **Primary** | People tracking calories on their own phone who want the log to stay on their device and who are willing to paste an API key. |
| **Secondary** | Developers maintaining this repository. |
| **Explicitly not** | People who want a managed, shared, or team food log; anyone who needs the assistant to do more than estimate a meal; anyone who wants the model to be free. |

## 4. Capability map

### 4.1 Capture and estimation

| Capability | Where it lives |
|---|---|
| Camera capture, gallery upload, desktop drag-and-drop | [`AddMeal.tsx`](../components/AddMeal.tsx) |
| File → data URL with MIME sniffing; compression fallback | [`image.ts`](../lib/image.ts) |
| Provider dispatch (Gemini / MiniMax) | [`analyze.ts`](../lib/analyze.ts) |
| Gemini `generateContent` client | [`gemini.ts`](../lib/gemini.ts) |
| MiniMax OpenAI-compatible client | [`minimax.ts`](../lib/minimax.ts) |
| JSON extraction, field coercion, rounding | [`nutrition.ts`](../lib/nutrition.ts) |
| Localised analysis prompt (EN / zh-Hant) | [`gemini.ts`](../lib/gemini.ts), [`minimax.ts`](../lib/minimax.ts) |

### 4.2 The log

| Capability | Where it lives |
|---|---|
| Add, edit, delete a meal | [`storage.ts`](../lib/storage.ts), [`MealEditor.tsx`](../components/MealEditor.tsx) |
| Calorie ring against the daily goal | [`HomeScreen.tsx`](../components/HomeScreen.tsx) |
| Daily bar chart over 7 / 14 / 30 days | [`CalorieChart.tsx`](../components/CalorieChart.tsx) |
| Grouping meals by local calendar day | `mealsByDay` in [`storage.ts`](../lib/storage.ts) |
| Macro breakdown and food table | [`NutritionBreakdown.tsx`](../components/NutritionBreakdown.tsx) |

### 4.3 Settings and providers

| Capability | Where it lives |
|---|---|
| Provider registry — the single source of truth | [`providers.ts`](../lib/providers.ts) |
| Provider switcher in Settings | [`SettingsModal.tsx`](../components/SettingsModal.tsx) |
| Per-provider key, endpoint, and model | [`storage.ts`](../lib/storage.ts) |
| Daily goal, ephemeral-key preference | [`storage.ts`](../lib/storage.ts) |
| Language switch (EN / 繁體中文) | [`dictionary.ts`](../lib/i18n/dictionary.ts), [`locales.ts`](../lib/i18n/locales.ts) |

### 4.4 Platform

| Capability | Where it lives |
|---|---|
| Installable PWA with an offline app shell | [`public/manifest.json`](../public/manifest.json), [`public/sw.js`](../public/sw.js), [`PwaRegister.tsx`](../components/PwaRegister.tsx) |
| Light and dark themes via CSS custom properties | [`globals.css`](../app/globals.css) |
| Safe-area insets for notched phones | [`AppShell.tsx`](../components/AppShell.tsx) |
| Version shown on the Today header | [`version.ts`](../lib/version.ts), [`next.config.ts`](../next.config.ts) |

## 5. Capability boundaries

Things Apehealth deliberately does **not** do:

| Not included | Why |
|---|---|
| Accounts, sync, sharing | The log is local. Adding sync would mean adding a server. |
| Barcode scanning | Requires a product database the app does not have and would have to maintain. |
| Recipe management | Out of scope for a photo-estimated log. |
| A free built-in model | A hosted model would mean a backend, which is the thing this app does not have. |
| Weight tracking, body metrics | A different product. |
| Server-side image processing | Photos are processed in the browser and sent only to the chosen provider. |
| Automatic nutrient scoring or advice | The app reports what the model estimated; it does not judge it. |

## 6. Design principles

1. **Local first, always.** If the network is down, the log still renders and the app still opens. Only estimation fails.
2. **The user owns the credential.** The key is theirs, stored on their device, sent to the provider they chose.
3. **The estimate is provisional.** Every number the model returns is editable, and the UI never presents an estimate as fact.
4. **One provider, one abstraction.** Every provider honours the same prompt contract and the same response shape, so the app never branches on provider outside `lib/analyze.ts`.
5. **Two languages, no half-translations.** Every user-facing string exists in English and 繁體中文, and the language choice also drives the analysis prompt.