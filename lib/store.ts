"use client";

import { useSyncExternalStore } from "react";
import { subscribeStore } from "./events";
import {
  DEFAULT_ENDPOINT,
  DEFAULT_GOAL,
  DEFAULT_MODEL,
  loadMeals,
  loadSettings,
} from "./storage";
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
  apiKey: "",
  apiEndpoint: DEFAULT_ENDPOINT,
  model: DEFAULT_MODEL,
  ephemeralKey: false,
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
