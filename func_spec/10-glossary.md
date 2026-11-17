# Data types & glossary

> Every persisted interface, field by field, and every term the spec uses.

---

## 1. `lib/types.ts`

### `Confidence`

```ts
export type Confidence = "high" | "medium" | "low";
```

The model's own certainty in an estimate. `Meal.confidence` widens it with `null`.

### `FoodItem`

```ts
export type FoodItem = {
  name: string;
  calories: number;
  carbs: number;
  protein?: number;
  fat?: number;
};
```

One visible food in the meal.

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | `string` | Yes | The food's label, in the user's language. |
| `calories` | `number` | Yes | Whole kcal, floored at 0. |
| `carbs` | `number` | Yes | Grams, one decimal place. |
| `protein` | `number` | No | Grams. **Absent** when unknown — not `null`. |
| `fat` | `number` | No | Grams. **Absent** when unknown. |

> `FoodItem` uses an **optional** property for the macros, while `Meal` uses `number | null`. The difference is deliberate: an absent item macro means "this food has no protein", while a `null` meal macro means "the model did not say".

### `Meal`

```ts
export type Meal = {
  id: string;
  imageDataUrl: string;
  description: string;
  calories: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  items: FoodItem[];
  confidence: Confidence | null;
  createdAt: string;
};
```

A saved meal. Stored in `apehealth.meals`.

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | `crypto.randomUUID()`. The only field that may not be empty — a meal without one is discarded on load. |
| `imageDataUrl` | `string` | A compressed `data:image/jpeg;base64,…` URL. May be empty. |
| `description` | `string` | The model's description, or the user's edit of it. Never blank on load — it falls back to `"Meal"`. |
| `calories` | `number` | Whole kcal, floored at 0. |
| `protein` / `carbs` / `fat` | `number \| null` | Grams, one decimal place. `null` when unknown. |
| `items` | `FoodItem[]` | The food breakdown. Re-parsed on every load. |
| `confidence` | `Confidence \| null` | `null` when the model did not report one. |
| `createdAt` | `string` | An ISO 8601 timestamp. It decides which day the meal belongs to. |

### `AnalyzeResult`

```ts
export type AnalyzeResult = {
  description: string;
  calories: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  items: FoodItem[];
  confidence: Confidence;
};
```

What a provider returns. `confidence` is never `null` here — it falls back to `"medium"`.

This is a **transient** type. It is not persisted; it becomes a `Meal` when the user saves.

### `ProviderConfig`

```ts
export type ProviderConfig = {
  apiKey: string;
  apiEndpoint: string;
  model: string;
};
```

One provider's configuration.

| Field | Notes |
|---|---|
| `apiKey` | The user's key. Stored in the key map, not in `apehealth.providers`, because it moves between `localStorage` and `sessionStorage`. |
| `apiEndpoint` | The base URL. The client appends the provider-specific path. |
| `model` | The model id. Falls back to `PROVIDER_DEFS[provider].model` when blank. |

### `Settings`

```ts
export type Settings = {
  dailyGoal: number;
  provider: Provider;
  providers: Record<Provider, ProviderConfig>;
  ephemeralKey: boolean;
  locale: Locale;
};
```

| Field | Notes |
|---|---|
| `dailyGoal` | Kilocalories per day. `500`–`8000`. Default `2000`. |
| `provider` | The active provider. Default `"gemini"`. |
| `providers` | Every provider's config, keyed by provider id. |
| `ephemeralKey` | When true, the key map lives in `sessionStorage`. |
| `locale` | `"en"` or `"zh-Hant"`. |

## 2. `lib/providers.ts`

### `Provider`

```ts
export type Provider = (typeof PROVIDERS)[number];
// "gemini" | "minimax"
```

### `ProviderDefinition`

```ts
export type ProviderDefinition = {
  label: string;
  endpoint: string;
  model: string;
  models: string[];
  keyUrl: string;
  keyUrlLabel: string;
};
```

See [AI analysis](05-ai-analysis.md) for the values.

## 3. `lib/i18n`

### `Locale`

```ts
export type Locale = "en" | "zh-Hant";
```

### `Dictionary`

```ts
export type Dictionary = typeof en;
```

The shape of the translation catalogue. `zhHant: Dictionary` makes the Chinese dictionary type-checked against the English one.

### `TextParams`

```ts
export type TextParams = Record<string, string | number> | undefined;
```

The interpolation values for `translate`.

## 4. Storage types

### `DayGroup`

```ts
export type DayGroup = {
  day: string;
  meals: Meal[];
};
```

A day's meals, as returned by `mealsByDay`.

### `DailyTotal`

```ts
export type DailyTotal = {
  day: string;
  calories: number;
  mealCount: number;
};
```

One row of the history chart.

### `MealPatch`

```ts
export type MealPatch = Partial<Omit<Meal, "id">>;
```

The editable fields of a meal. The `id` is not patchable.

## 5. Glossary

| Term | Meaning |
|---|---|
| **Provider** | An AI service Apehealth can call for a meal estimate — Gemini or MiniMax. |
| **BYOK** | Bring Your Own Key. The user supplies the provider's API key; Apehealth hosts nothing. |
| **Estimate** | The model's answer: a description, calories, macros, food items, and a confidence. Never treated as ground truth. |
| **Confidence** | The model's own certainty in an estimate: `high`, `medium`, or `low`. |
| **The key map** | The `Record<Provider, string>` holding one API key per provider. |
| **Ephemeral key** | A key stored in `sessionStorage` so it disappears when the tab closes. |
| **Data URL** | A `data:image/jpeg;base64,…` string. Both providers receive the image this way. |
| **The draft** | The in-memory copy of the settings the user is editing. Persisted only on **Save**. |
| **The snapshot** | The JSON string `useSyncExternalStore` compares to decide whether to re-render. |
| **The server snapshot** | `SERVER_SETTINGS` — the value used during server rendering and hydration. |
| **Day bucketing** | Assigning a meal to a calendar day using its `createdAt` in **local** time. |
| **Macro** | Protein, carbohydrate, or fat, in grams. |
| **The legacy keys** | The v0.0.2 single-provider storage keys, still read for the migration. |
| **Migration** | The read-time merge of a legacy store into the per-provider store. |
| **The dispatcher** | `lib/analyze.ts` — the single place the app chooses a provider client. |
| **The prompt contract** | The shared instruction and JSON shape every provider honours. |
| **Shell** | The cached app files the service worker precaches. |
| **Day range** | The 7, 14, or 30 day window the History screen shows. |
| **`localStorage`** | The origin-scoped, persistent browser store. Where the meal log lives. |
| **`sessionStorage`** | The origin-scoped, per-tab browser store. Where an ephemeral key lives. |

## 6. Storage key reference

| Key | Store | Type |
|---|---|---|
| `apehealth.meals` | `localStorage` | `Meal[]` |
| `apehealth.dailyGoal` | `localStorage` | `number` |
| `apehealth.provider` | `localStorage` | `Provider` |
| `apehealth.providers` | `localStorage` | `Record<Provider, { apiEndpoint, model }>` |
| `apehealth.providers.keys` | `localStorage` | `Record<Provider, string>` |
| `apehealth.providers.keys.session` | `sessionStorage` | `Record<Provider, string>` |
| `apehealth.ephemeralKey` | `localStorage` | `boolean` |
| `apehealth.locale` | `localStorage` | `Locale` |

### Legacy keys (read-only, migrated on load)

| Key | Store | Migrates to |
|---|---|---|
| `apehealth.apiKey` | `localStorage` | `apehealth.providers.keys.minimax` |
| `apehealth.apiKey.session` | `sessionStorage` | `apehealth.providers.keys.session.minimax` |
| `apehealth.apiEndpoint` | `localStorage` | `apehealth.providers.minimax.apiEndpoint` |
| `apehealth.model` | `localStorage` | `apehealth.providers.minimax.model` |
