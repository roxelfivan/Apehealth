import { emitStoreChange } from "./events";
import type { Meal, Settings } from "./types";

const MEALS_KEY = "apehealth.meals";
const GOAL_KEY = "apehealth.dailyGoal";
const ENDPOINT_KEY = "apehealth.apiEndpoint";
const MODEL_KEY = "apehealth.model";
const EPHEMERAL_KEY = "apehealth.ephemeralKey";
const API_KEY_LOCAL = "apehealth.apiKey";
const API_KEY_SESSION = "apehealth.apiKey.session";

export const DEFAULT_ENDPOINT = "https://api.minimax.io/v1";
export const DEFAULT_MODEL = "MiniMax-M3";
export const DEFAULT_GOAL = 2000;
export const MODEL_PRESETS = [
  "MiniMax-M3",
  "MiniMax-M3.1-Flash",
  "MiniMax-M2.7",
];

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

export function loadMeals(): Meal[] {
  const meals = readJson<Meal[]>(MEALS_KEY, []);
  return Array.isArray(meals) ? meals : [];
}

export function saveMeals(meals: Meal[]): void {
  localStorage.setItem(MEALS_KEY, JSON.stringify(meals));
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
    return { ...meal, ...patch, description, calories };
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

export function loadSettings(): Settings {
  const ephemeralKey = readJson<boolean>(EPHEMERAL_KEY, false);
  return {
    dailyGoal: Number(readJson<number>(GOAL_KEY, DEFAULT_GOAL)) || DEFAULT_GOAL,
    apiKey: readApiKey(ephemeralKey),
    apiEndpoint: readJson<string>(ENDPOINT_KEY, DEFAULT_ENDPOINT) || DEFAULT_ENDPOINT,
    model: readJson<string>(MODEL_KEY, DEFAULT_MODEL) || DEFAULT_MODEL,
    ephemeralKey,
  };
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(GOAL_KEY, JSON.stringify(settings.dailyGoal));
  localStorage.setItem(ENDPOINT_KEY, JSON.stringify(settings.apiEndpoint.trim() || DEFAULT_ENDPOINT));
  localStorage.setItem(MODEL_KEY, JSON.stringify(settings.model.trim() || DEFAULT_MODEL));
  localStorage.setItem(EPHEMERAL_KEY, JSON.stringify(settings.ephemeralKey));

  const key = settings.apiKey.trim();
  if (settings.ephemeralKey) {
    localStorage.removeItem(API_KEY_LOCAL);
    if (key) sessionStorage.setItem(API_KEY_SESSION, key);
    else sessionStorage.removeItem(API_KEY_SESSION);
  } else {
    sessionStorage.removeItem(API_KEY_SESSION);
    if (key) localStorage.setItem(API_KEY_LOCAL, key);
    else localStorage.removeItem(API_KEY_LOCAL);
  }
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

export function hasApiKey(settings: Settings = loadSettings()): boolean {
  return settings.apiKey.trim().length > 0;
}
