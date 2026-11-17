"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { SettingsModal } from "@/components/SettingsModal";
import { deleteMeal, hasApiKey, mealsForDay, saveSettings, todayKey } from "@/lib/storage";
import { useMeals, useSettings } from "@/lib/store";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function HomeScreen() {
  const meals = useMeals();
  const settings = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [autoOpened, setAutoOpened] = useState(false);
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
        </div>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="rounded-full border border-[var(--line)] px-3 py-2 text-sm"
        >
          Settings
        </button>
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
        <ul className="space-y-3">
          {todays.map((meal) => (
            <li
              key={meal.id}
              className="flex gap-3 rounded-[1.4rem] border border-[var(--line)] bg-[var(--card)] p-3"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={meal.imageDataUrl}
                alt=""
                className="h-16 w-16 shrink-0 rounded-2xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{meal.description}</p>
                <p className="text-sm text-[var(--muted)]">
                  {meal.calories} kcal · {formatTime(meal.createdAt)}
                </p>
              </div>
              <button
                type="button"
                className="self-start text-xs text-[var(--muted)]"
                onClick={() => {
                  if (confirm("Delete this meal?")) deleteMeal(meal.id);
                }}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/add"
        className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 z-20 flex h-14 w-[min(92%,24rem)] -translate-x-1/2 items-center justify-center rounded-full bg-[var(--accent)] text-base font-semibold text-[var(--accent-ink)] shadow-[0_12px_30px_rgba(184,122,24,0.35)]"
      >
        Add Meal
      </Link>

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
