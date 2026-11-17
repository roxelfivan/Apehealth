"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { MealEditor } from "@/components/MealEditor";
import { MealList } from "@/components/MealList";
import { SettingsModal } from "@/components/SettingsModal";
import { hasApiKey, mealsForDay, saveSettings, todayKey } from "@/lib/storage";
import { useMeals, useSettings } from "@/lib/store";
import type { Meal } from "@/lib/types";
import { APP_VERSION } from "@/lib/version";

export function HomeScreen() {
  const meals = useMeals();
  const settings = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [autoOpened, setAutoOpened] = useState(false);
  const [editing, setEditing] = useState<Meal | null>(null);
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (isClient && !autoOpened && !hasApiKey(settings)) {
    setAutoOpened(true);
    setSettingsOpen(true);
  }

  const day = useSyncExternalStore(
    () => () => {},
    () => todayKey(new Date()),
    () => "",
  );
  const todays = mealsForDay(meals, day);
  const eaten = todays.reduce((sum, meal) => sum + meal.calories, 0);
  const remaining = settings.dailyGoal - eaten;
  const progress = Math.min(100, Math.round((eaten / Math.max(settings.dailyGoal, 1)) * 100));

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-28 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <header className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-[var(--muted)]">
            Today{day ? ` · ${day}` : ""}
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-[2.1rem] leading-none tracking-tight">
            Apehealth
          </h1>
          <p className="mt-1 font-mono text-[10px] text-[var(--muted)]">v{APP_VERSION}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/history"
            className="rounded-full border border-[var(--line)] px-3 py-2 text-sm"
          >
            History
          </Link>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="rounded-full border border-[var(--line)] px-3 py-2 text-sm"
          >
            Settings
          </button>
        </div>
      </header>

      <section className="rounded-[1.75rem] border border-[var(--line)] bg-[var(--card)] p-5 shadow-[0_18px_50px_rgba(40,24,8,0.08)]">
        <p className="text-sm text-[var(--muted)]">Calories eaten</p>
        <p className="mt-1 font-[family-name:var(--font-display)] text-6xl leading-none tracking-tight">
          {eaten}
        </p>
        <p className="mt-2 text-sm text-[var(--muted)]">
          of {settings.dailyGoal} ·{" "}
          <span className={remaining < 0 ? "text-[var(--over)]" : "text-[var(--ok)]"}>
            {remaining >= 0 ? `${remaining} remaining` : `${Math.abs(remaining)} over`}
          </span>
        </p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--chip)]">
          <div
            className={`h-full rounded-full ${remaining < 0 ? "bg-[var(--over)]" : "bg-[var(--accent)]"}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </section>

      {!hasApiKey(settings) && (
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="mt-4 rounded-2xl bg-[var(--chip)] px-4 py-3 text-left text-sm"
        >
          Add a MiniMax API key in Settings to estimate calories from photos.
        </button>
      )}

      <h2 className="mb-3 mt-8 text-sm font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
        Today&apos;s meals
      </h2>

      {todays.length === 0 ? (
        <div className="rounded-[1.5rem] border border-dashed border-[var(--line)] px-5 py-10 text-center text-[var(--muted)]">
          No meals yet. Snap one and Apehealth will estimate the calories.
        </div>
      ) : (
        <MealList meals={todays} onEdit={setEditing} />
      )}

      <Link
        href="/add"
        className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 z-20 flex h-14 w-[min(92%,24rem)] -translate-x-1/2 items-center justify-center rounded-full bg-[var(--accent)] text-base font-semibold text-[var(--accent-ink)] shadow-[0_12px_30px_rgba(184,122,24,0.35)]"
      >
        Add Meal
      </Link>

      {editing && (
        <MealEditor key={editing.id} meal={editing} onClose={() => setEditing(null)} />
      )}

      <SettingsModal
        open={settingsOpen}
        initial={settings}
        onClose={() => setSettingsOpen(false)}
        onSave={(next) => {
          saveSettings(next);
          setSettingsOpen(false);
        }}
      />
    </div>
  );
}
