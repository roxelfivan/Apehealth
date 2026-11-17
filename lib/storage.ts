import { emitStoreChange } from "./events";
import {
  DEFAULT_LOCALE,
  isLocale,
  matchLocale,
  type Locale,
} from "./i18n/locales";
import { asNonNegativeNumber, parseFoodItems, roundCalories, roundGrams } from "./nutrition";
import {
  DEFAULT_PROVIDER,
  isProvider,
  PROVIDER_DEFS,
  PROVIDERS,
  type Provider,
} from "./providers";
import type { Meal, ProviderConfig, Settings } from "./types";

const MEALS_KEY = "apehealth.meals";
const GOAL_KEY = "apehealth.dailyGoal";
const PROVIDER_KEY = "apehealth.provider";
const PROVIDERS_KEY = "apehealth.providers";
const EPHEMERAL_KEY = "apehealth.ephemeralKey";
const LOCALE_KEY = "apehealth.locale";
const API_KEY_LOCAL = "apehealth.apiKey";
const API_KEY_SESSION = "apehealth.apiKey.session";

export const DEFAULT_GOAL = 2000;

/**
 * Legacy single-provider keys. Read once so existing installs keep their
 * MiniMax key, then superseded by the per-provider store.
 */
const LEGACY_ENDPOINT_KEY = "apehealth.apiEndpoint";
const LEGACY_MODEL_KEY = "apehealth.model";

export function defaultProviderConfig(provider: Provider): ProviderConfig {
  const def = PROVIDER_DEFS[provider];
  return { apiKey: "", apiEndpoint: def.endpoint, model: def.model };
}

/** Model suggestions for the currently selected provider. */
export function modelPresets(provider: Provider): string[] {
  return PROVIDER_DEFS[provider].models;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function normalizeMeal(value: unknown): Meal | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || !record.id) return null;
  const calories = asNonNegativeNumber(record.calories) ?? 0;
  const protein = asNonNegativeNumber(record.protein);
  const carbs = asNonNegativeNumber(record.carbs);
  const fat = asNonNegativeNumber(record.fat);
  const items = parseFoodItems(record.items);
  return {
    id: record.id,
    imageDataUrl: typeof record.imageDataUrl === "string" ? record.imageDataUrl : "",
    description:
      typeof record.description === "string" && record.description.trim()
        ? record.description.trim()
        : "Meal",
    calories: roundCalories(calories),
    protein: protein == null ? null : roundGrams(protein),
    carbs: carbs == null ? null : roundGrams(carbs),
    fat: fat == null ? null : roundGrams(fat),
    items,
    confidence:
      record.confidence === "high" ||
      record.confidence === "medium" ||
      record.confidence === "low"
        ? record.confidence
        : null,
    createdAt: typeof record.createdAt === "string" ? record.createdAt : new Date().toISOString(),
  };
}

export function loadMeals(): Meal[] {
  const meals = readJson<unknown[]>(MEALS_KEY, []);
  if (!Array.isArray(meals)) return [];
  return meals
    .map(normalizeMeal)
    .filter((meal): meal is Meal => meal != null);
}

export class StorageFullError extends Error {
  constructor() {
    super("StorageFull");
    this.name = "StorageFullError";
  }
}

function isQuotaError(caught: unknown): boolean {
  if (!(caught instanceof DOMException)) return false;
  return (
    caught.name === "QuotaExceededError" ||
    caught.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    caught.code === 22
  );
}

export function saveMeals(meals: Meal[]): void {
  try {
    localStorage.setItem(MEALS_KEY, JSON.stringify(meals));
  } catch (caught) {
    if (isQuotaError(caught)) throw new StorageFullError();
    throw caught;
  }
  emitStoreChange();
}

export function addMeal(meal: Meal): Meal[] {
  const next = [meal, ...loadMeals()];
  saveMeals(next);
  return next;
}

export function deleteMeal(id: string): Meal[] {
  const next = loadMeals().filter((meal) => meal.id !== id);
  saveMeals(next);
  return next;
}

export type MealPatch = Partial<Omit<Meal, "id">>;

export function updateMeal(id: string, patch: MealPatch): Meal[] {
  const next = loadMeals().map((meal) => {
    if (meal.id !== id) return meal;
    const description = (patch.description ?? meal.description).trim() || "Meal";
    const calories = Math.max(0, Math.round(patch.calories ?? meal.calories));
    const protein =
      patch.protein === undefined
        ? meal.protein
        : patch.protein == null
          ? null
          : roundGrams(Math.max(0, patch.protein));
    const carbs =
      patch.carbs === undefined
        ? meal.carbs
        : patch.carbs == null
          ? null
          : roundGrams(Math.max(0, patch.carbs));
    const fat =
      patch.fat === undefined
        ? meal.fat
        : patch.fat == null
          ? null
          : roundGrams(Math.max(0, patch.fat));
    const items = patch.items ?? meal.items;
    return { ...meal, ...patch, description, calories, protein, carbs, fat, items };
  });
  saveMeals(next);
  return next;
}

export type DayGroup = {
  day: string;
  meals: Meal[];
};

export function mealsByDay(meals: Meal[]): DayGroup[] {
  const map = new Map<string, Meal[]>();
  for (const meal of meals) {
    const parsed = new Date(meal.createdAt);
    const day = Number.isNaN(parsed.getTime()) ? meal.createdAt.slice(0, 10) : todayKey(parsed);
    const list = map.get(day);
    if (list) list.push(meal);
    else map.set(day, [meal]);
  }
  for (const list of map.values()) {
    list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([day, grouped]) => ({ day, meals: grouped }));
}

export type DailyTotal = {
  day: string;
  calories: number;
  mealCount: number;
};

export function dailyTotals(meals: Meal[], days: number, end: Date = new Date()): DailyTotal[] {
  const count = Math.max(1, Math.round(days));
  const totals = new Map<string, DailyTotal>();
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(end.getFullYear(), end.getMonth(), end.getDate() - i);
    const day = todayKey(date);
    keys.push(day);
    totals.set(day, { day, calories: 0, mealCount: 0 });
  }
  for (const meal of meals) {
    const parsed = new Date(meal.createdAt);
    const day = Number.isNaN(parsed.getTime()) ? meal.createdAt.slice(0, 10) : todayKey(parsed);
    const row = totals.get(day);
    if (!row) continue;
    row.calories += meal.calories;
    row.mealCount += 1;
  }
  return keys.map((day) => totals.get(day)!);
}

export function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDatetimeLocalValue(value: string, fallbackIso: string): string {
  if (!value) return fallbackIso;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallbackIso;
  return parsed.toISOString();
}

function readApiKey(ephemeral: boolean): string {
  if (typeof window === "undefined") return "";
  const fromSession = sessionStorage.getItem(API_KEY_SESSION) ?? "";
  const fromLocal = localStorage.getItem(API_KEY_LOCAL) ?? "";
  return ephemeral ? fromSession : fromLocal || fromSession;
}

function readJsonFrom<T>(
  store: Storage | null,
  key: string,
  fallback: T,
): T {
  if (!store) return fallback;
  try {
    const raw = store.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Read a legacy value that was written either as raw text or as JSON.
 * Older installs stored the endpoint and model with `JSON.stringify`, but
 * being tolerant here means a hand-edited or partially migrated store still
 * keeps the user's endpoint and model.
 */
function readLegacyString(key: string): string {
  if (typeof window === "undefined") return "";
  const raw = localStorage.getItem(key);
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "string" ? parsed : "";
  } catch {
    return raw;
  }
}

/**
 * Keys are stored per provider so switching between Gemini and MiniMax keeps
 * both credentials around. A key lives either in localStorage (persistent) or
 * sessionStorage (ephemeral), matching the "forget on tab close" preference.
 */
function readProviderKeys(ephemeral: boolean): Record<Provider, string> {
  const keys = Object.fromEntries(
    PROVIDERS.map((provider) => [provider, ""]),
  ) as Record<Provider, string>;

  const local = readJsonFrom<Partial<Record<Provider, string>>>(
    typeof window === "undefined" ? null : localStorage,
    `${PROVIDERS_KEY}.keys`,
    {},
  );
  const session = readJsonFrom<Partial<Record<Provider, string>>>(
    typeof window === "undefined" ? null : sessionStorage,
    `${PROVIDERS_KEY}.keys.session`,
    {},
  );

  for (const provider of PROVIDERS) {
    const fromLocal = typeof local[provider] === "string" ? local[provider] : "";
    const fromSession =
      typeof session[provider] === "string" ? session[provider] : "";
    // Ephemeral keys live in sessionStorage and win while the flag is on.
    keys[provider] = ephemeral
      ? fromSession || fromLocal
      : fromLocal || fromSession;
  }

  // Legacy single-key storage: it always belonged to MiniMax.
  const legacy = readApiKey(ephemeral);
  if (legacy && !keys.minimax) keys.minimax = legacy;

  return keys;
}

function writeProviderKeys(
  keys: Record<Provider, string>,
  ephemeral: boolean,
): void {
  const payload = JSON.stringify(keys);
  if (ephemeral) {
    localStorage.removeItem(`${PROVIDERS_KEY}.keys`);
    sessionStorage.setItem(`${PROVIDERS_KEY}.keys.session`, payload);
  } else {
    sessionStorage.removeItem(`${PROVIDERS_KEY}.keys.session`);
    localStorage.setItem(`${PROVIDERS_KEY}.keys`, payload);
  }
}

/** Persisted user choice wins; otherwise fall back to the browser language. */
export function loadLocale(): Locale {
  const stored = readJson<unknown>(LOCALE_KEY, null);
  if (isLocale(stored)) return stored;
  if (typeof navigator !== "undefined") {
    const detected = matchLocale(navigator.languages ?? [navigator.language]);
    if (detected) return detected;
  }
  return DEFAULT_LOCALE;
}

function saveLocale(locale: Locale): void {
  localStorage.setItem(LOCALE_KEY, JSON.stringify(locale));
}

/** Persist only the UI language — never rewrite API keys or other settings. */
export function setLocale(locale: Locale): void {
  saveLocale(locale);
  emitStoreChange();
}

function loadProviderConfigs(): Record<Provider, ProviderConfig> {
  const configs = Object.fromEntries(
    PROVIDERS.map((provider) => [provider, defaultProviderConfig(provider)]),
  ) as Record<Provider, ProviderConfig>;

  const stored = readJson<Partial<Record<Provider, Partial<ProviderConfig>>>>(
    PROVIDERS_KEY,
    {},
  );
  for (const provider of PROVIDERS) {
    const entry = stored[provider];
    if (!entry || typeof entry !== "object") continue;
    const fallback = configs[provider];
    configs[provider] = {
      apiKey:
        typeof entry.apiKey === "string" ? entry.apiKey : fallback.apiKey,
      apiEndpoint:
        typeof entry.apiEndpoint === "string" && entry.apiEndpoint.trim()
          ? entry.apiEndpoint
          : fallback.apiEndpoint,
      model:
        typeof entry.model === "string" && entry.model.trim()
          ? entry.model
          : fallback.model,
    };
  }

  // Migrate the legacy MiniMax endpoint/model for existing installs.
  const legacyEndpoint = readLegacyString(LEGACY_ENDPOINT_KEY);
  const legacyModel = readLegacyString(LEGACY_MODEL_KEY);
  if (legacyEndpoint && !stored.minimax?.apiEndpoint) {
    configs.minimax.apiEndpoint = legacyEndpoint;
  }
  if (legacyModel && !stored.minimax?.model) {
    configs.minimax.model = legacyModel;
  }

  return configs;
}

export function loadSettings(): Settings {
  const ephemeralKey = readJson<boolean>(EPHEMERAL_KEY, false);
  const provider = isProvider(readJson<unknown>(PROVIDER_KEY, null))
    ? (readJson<Provider>(PROVIDER_KEY, DEFAULT_PROVIDER) as Provider)
    : DEFAULT_PROVIDER;
  const providers = loadProviderConfigs();
  const keys = readProviderKeys(ephemeralKey);
  for (const id of PROVIDERS) {
    providers[id].apiKey = keys[id];
  }
  return {
    dailyGoal: Number(readJson<number>(GOAL_KEY, DEFAULT_GOAL)) || DEFAULT_GOAL,
    provider,
    providers,
    ephemeralKey,
    locale: loadLocale(),
  };
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(GOAL_KEY, JSON.stringify(settings.dailyGoal));
  localStorage.setItem(PROVIDER_KEY, JSON.stringify(settings.provider));
  localStorage.setItem(EPHEMERAL_KEY, JSON.stringify(settings.ephemeralKey));
  saveLocale(settings.locale);

  const configs: Partial<Record<Provider, Partial<ProviderConfig>>> = {};
  for (const id of PROVIDERS) {
    const config = settings.providers[id];
    if (!config) continue;
    configs[id] = {
      apiEndpoint:
        config.apiEndpoint.trim() || PROVIDER_DEFS[id].endpoint,
      model: config.model.trim() || PROVIDER_DEFS[id].model,
    };
  }
  localStorage.setItem(PROVIDERS_KEY, JSON.stringify(configs));

  const keys = Object.fromEntries(
    PROVIDERS.map((id) => [id, settings.providers[id]?.apiKey.trim() ?? ""]),
  ) as Record<Provider, string>;
  writeProviderKeys(keys, settings.ephemeralKey);

  // Drop the legacy single-key entries now that both are migrated.
  localStorage.removeItem(API_KEY_LOCAL);
  sessionStorage.removeItem(API_KEY_SESSION);
  localStorage.removeItem(LEGACY_ENDPOINT_KEY);
  localStorage.removeItem(LEGACY_MODEL_KEY);

  emitStoreChange();
}

export function todayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function mealsForDay(meals: Meal[], day: string): Meal[] {
  if (!day) return [];
  return meals.filter((meal) => {
    const parsed = new Date(meal.createdAt);
    const key = Number.isNaN(parsed.getTime()) ? meal.createdAt.slice(0, 10) : todayKey(parsed);
    return key === day;
  });
}

/** True when the active provider has an API key configured. */
export function hasApiKey(settings: Settings = loadSettings()): boolean {
  const config = settings.providers[settings.provider];
  return (config?.apiKey ?? "").trim().length > 0;
}
