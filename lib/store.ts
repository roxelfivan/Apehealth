"use client";

import { useSyncExternalStore } from "react";
import { subscribeStore } from "./events";
import {
  DEFAULT_GOAL,
  defaultProviderConfig,
  loadMeals,
  loadSettings,
} from "./storage";
import { DEFAULT_LOCALE } from "./i18n/locales";
import { DEFAULT_PROVIDER, PROVIDERS } from "./providers";
import type { Meal, Settings } from "./types";

let mealsSnap = "[]";
let settingsSnap = "";

function mealsSnapshot(): string {
  const next = JSON.stringify(loadMeals());
  if (next !== mealsSnap) mealsSnap = next;
  return mealsSnap;
}

function settingsSnapshot(): string {
  const next = JSON.stringify(loadSettings());
  if (next !== settingsSnap) settingsSnap = next;
  return settingsSnap;
}

const SERVER_SETTINGS: Settings = {
  dailyGoal: DEFAULT_GOAL,
  provider: DEFAULT_PROVIDER,
  providers: Object.fromEntries(
    PROVIDERS.map((provider) => [provider, defaultProviderConfig(provider)]),
  ) as Settings["providers"],
  ephemeralKey: false,
  locale: DEFAULT_LOCALE,
};

export function useMeals(): Meal[] {
  const snap = useSyncExternalStore(subscribeStore, mealsSnapshot, () => "[]");
  return JSON.parse(snap) as Meal[];
}

export function useSettings(): Settings {
  const snap = useSyncExternalStore(
    subscribeStore,
    settingsSnapshot,
    () => JSON.stringify(SERVER_SETTINGS),
  );
  return JSON.parse(snap) as Settings;
}