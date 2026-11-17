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
  return meals.filter((meal) => meal.createdAt.slice(0, 10) === day);
}

export function hasApiKey(settings: Settings = loadSettings()): boolean {
  return settings.apiKey.trim().length > 0;
}
