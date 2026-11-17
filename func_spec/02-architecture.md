# Architecture

> The layer map, the module inventory, the dependency rules, and the route tree.

---

## 1. Layer map

```
┌──────────────────────────────────────────────────────────────┐
│ app/            Routes + root layout (server components)     │
├──────────────────────────────────────────────────────────────┤
│ components/     React UI. Every screen is "use client".      │
├──────────────────────────────────────────────────────────────┤
│ lib/store.ts    useSyncExternalStore bindings over storage   │
├──────────────────────────────────────────────────────────────┤
│ lib/storage.ts  The only persistence layer (localStorage)     │
├──────────────────────────────────────────────────────────────┤
│ lib/analyze.ts  The only network boundary (provider dispatch) │
├──────────────────────────────────────────────────────────────┤
│ lib/gemini.ts · lib/minimax.ts   One client per provider     │
└──────────────────────────────────────────────────────────────┘
```

Dependencies point **downward only**. A component never imports another component's internals; it calls `lib/`.

## 2. Dependency rules

| Rule | Enforced by |
|---|---|
| Only `lib/analyze.ts` may call `fetch`. | Review. It is the only module that reaches the network. |
| Only `lib/storage.ts` may touch `localStorage` / `sessionStorage`. | Review. `lib/image.ts` touches neither. |
| `lib/providers.ts` imports nothing from `lib/`. | It is a leaf module — the provider registry has no dependencies. |
| `lib/i18n/dictionary.ts` imports nothing from `lib/`. | It is a leaf module. |
| Components read state through `useSettings()` / `useMeals()`. | They never call `localStorage` directly. |
| `lib/gemini.ts` and `lib/minimax.ts` do not import each other. | The dispatcher owns the branch. |

## 3. Module inventory

### `app/`

| File | Role |
|---|---|
| `layout.tsx` | Root layout. Loads four Google fonts (DM Sans, Fraunces, Noto Sans TC, Noto Serif TC), sets `metadata` and `viewport`, renders `LocaleHtmlLang` and `PwaRegister`. |
| `page.tsx` | `/` → renders `<HomeScreen />`. |
| `add/page.tsx` | `/add` → renders `<AddMeal />`. |
| `history/page.tsx` | `/history` → renders `<HistoryScreen />`. |
| `globals.css` | Tailwind v4 layers, the design tokens (`--accent`, `--card`, `--line`, `--muted`, `--protein`, `--carb`, `--fat`, `--over`, `--ring`), and the component classes (`.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-icon`, `.field`). |

### `components/`

| File | Role |
|---|---|
| `AppShell.tsx` | Chrome for every screen: skip link, header, desktop nav, mobile bottom nav, safe-area padding. |
| `HomeScreen.tsx` | Today: calorie ring, macro line, API-key banner, today's meal list. |
| `AddMeal.tsx` | The three-step capture flow: pick → analyzing → review → save. |
| `HistoryScreen.tsx` | Range selector, `CalorieChart`, meals grouped by day. |
| `MealEditor.tsx` | Edit panel: description, calories, timestamp, re-estimate from a photo, save. |
| `MealList.tsx` | The meal card: photo, description, kcal, time, macro line, edit/delete buttons. |
| `NutritionBreakdown.tsx` | The four-cell macro row and the food-item table. |
| `CalorieChart.tsx` | The daily bar chart. CSS bars, no chart library. |
| `SettingsModal.tsx` | The settings dialog: language, goal, provider, key, ephemeral toggle, advanced endpoint/model. |
| `LanguageSwitch.tsx` | The globe button. Full label on desktop, compact in the mobile nav. |
| `LocaleHtmlLang.tsx` | Keeps `<html lang>` in sync with the stored locale. |
| `AppLogo.tsx`, `icons.tsx` | Brand mark and the inline SVG icon set. |
| `PwaRegister.tsx` | Registers `/sw.js` on mount. |

### `lib/`

| File | Role |
|---|---|
| `providers.ts` | **The provider registry.** `PROVIDERS`, `Provider`, `DEFAULT_PROVIDER`, `PROVIDER_DEFS`. Leaf module. |
| `analyze.ts` | `analyzeMealPhoto(imageDataUrl, settings)` — the single dispatch point. |
| `gemini.ts` | Gemini `generateContent` client: URL building, endpoint safety, request body, response parsing. |
| `minimax.ts` | MiniMax OpenAI-compatible client. Same public contract as `gemini.ts`. |
| `storage.ts` | Every `localStorage` / `sessionStorage` read and write, the provider config store, the legacy migration. |
| `store.ts` | `useMeals()` and `useSettings()` over `useSyncExternalStore`. |
| `events.ts` | A one-function pub/sub: `emitStoreChange()` / `subscribeStore()`. |
| `types.ts` | `Meal`, `FoodItem`, `AnalyzeResult`, `Settings`, `ProviderConfig`, `Confidence`. |
| `nutrition.ts` | `asNonNegativeNumber`, `parseFoodItems`, `roundCalories`, `roundGrams`, `formatGrams`, `formatKcal`, `sumItemCalories`, `sumItemGrams`. |
| `image.ts` | `fileToApiDataUrl`, `fileToCompressedDataUrl`, `compressDataUrlForStorage`. |
| `version.ts` | `APP_VERSION`, injected from `package.json` at build time. |
| `i18n/locales.ts` | `LOCALES`, `Locale`, `LOCALE_TAGS`, `LOCALE_NAMES`, `matchLocale`. |
| `i18n/dictionary.ts` | The `en` and `zhHant` dictionaries. `zhHant` is typed as `Dictionary`. |
| `i18n/translate.ts` | `translate(locale, path, params)` — string interpolation with `{placeholder}` support. |
| `i18n/translate-node.ts` | `translateNode(locale, path, params)` — the same, but params may be React nodes (used for the link in the API-key note). |
| `i18n/useTranslator.ts` | `useTranslator()` — binds the current locale and returns `t` / `tn`. |
| `i18n/format.ts` | `formatDayLabel`, `formatTimeLabel` via `Intl`. |
| `i18n/index.ts` | Re-exports the public i18n surface. |

### `scripts/`

| File | Role |
|---|---|
| `verify-i18n.mts` | Mocks `fetch`, asserts prompt language, provider routing, request shape, and dictionary output. |
| `verify-storage.mts` | Shims `localStorage` / `sessionStorage`, asserts provider defaults, per-provider key persistence, and the legacy migration. |

### `public/`

| File | Role |
|---|---|
| `manifest.json` | PWA manifest: name, icons, `display: standalone`, `orientation: portrait`, theme colour. |
| `sw.js` | Service worker. Precaches the app shell; network-first with a cache fallback; same-origin GET only. |
| `icons/` | `icon-192.png`, `icon-512.png`, `icon-512-maskable.png`, `apple-touch-icon.png`. |

## 4. Route tree

| Route | Component | Auth | Data |
|---|---|---|---|
| `/` | `HomeScreen` | None | `useMeals()`, `useSettings()` |
| `/add` | `AddMeal` | None | `useSettings()` |
| `/history` | `HistoryScreen` | None | `useMeals()`, `useSettings()` |

All three routes are **statically prerendered**. There is no dynamic route, no API route, no server action, and no middleware. The build output is three static HTML files plus their assets.

## 5. State shape

There is exactly one persisted model, and it is a projection of `localStorage`:

```
Settings
├── dailyGoal: number
├── provider: "gemini" | "minimax"
├── providers: Record<Provider, { apiKey, apiEndpoint, model }>
├── ephemeralKey: boolean
└── locale: "en" | "zh-Hant"

Meal[]
├── id, imageDataUrl, description, calories
├── protein, carbs, fat
├── items: FoodItem[]
├── confidence
└── createdAt
```

`lib/store.ts` snapshots both as JSON strings and compares them on every read, so `useSyncExternalStore` only re-renders when something actually changed. See [State & persistence](04-state-and-persistence.md).

## 6. The rendering model

- `app/` route files are server components by default; each renders one client component.
- Every screen component is `"use client"`.
- `useTranslator()` reads the locale from the store, so a language change re-renders the entire tree without a reload.
- `SettingsModal` is mounted by all three screens. It receives `initial={settings}` and edits a **draft** copy until **Save**.

## 7. Notable design decisions

| Decision | Rationale |
|---|---|
| A hand-rolled `events.ts` instead of a state library | The persisted model is small and flat. A library would add a dependency and a serialisation contract for no gain. |
| `useSyncExternalStore` rather than `useState` + effects | The store lives outside React. `useSyncExternalStore` gives tear-free reads and correct SSR hydration without a context provider. |
| The provider registry is a plain module, not React context | Provider selection is persisted state, not a tree-scoped concern. |
| Keys are stored outside the provider config object | The key is written to `localStorage` or `sessionStorage` depending on the ephemeral preference, and is merged back in on read. |
| The dispatcher returns a promise, not a stream | Estimation is a single request with a single response. Streaming would add complexity for no user-visible gain in a 3-step flow. |