"use client";

import Link from "next/link";
import { useId, useState, useSyncExternalStore } from "react";
import { AppShell } from "@/components/AppShell";
import { PlusIcon, TrashIcon } from "@/components/icons";
import { SettingsModal } from "@/components/SettingsModal";
import { deleteMeal, hasApiKey, mealsForDay, saveSettings, todayKey } from "@/lib/storage";
import { useMeals, useSettings } from "@/lib/store";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDay(day: string): string {
  if (!day) return "Today";
  const date = new Date(`${day}T12:00:00`);
  return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

function CalorieRing({
  eaten,
  goal,
  remaining,
}: {
  eaten: number;
  goal: number;
  remaining: number;
}) {
  const progressId = useId();
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const ratio = Math.min(1, eaten / Math.max(goal, 1));
  const offset = circumference * (1 - ratio);
  const over = remaining < 0;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-8">
      <div className="relative h-36 w-36 shrink-0" role="img" aria-labelledby={progressId}>
        <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke="var(--chip)"
            strokeWidth="12"
          />
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke={over ? "var(--over)" : "var(--accent)"}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="font-[family-name:var(--font-display)] text-4xl leading-none tabular-nums">
            {eaten}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">kcal</p>
        </div>
      </div>
      <div className="min-w-0 flex-1 text-center sm:text-left">
        <p id={progressId} className="text-sm text-[var(--muted)]">
          Calories eaten of {goal}
        </p>
        <p className={`mt-1 text-lg font-semibold ${over ? "text-[var(--over)]" : "text-[var(--ok)]"}`}>
          {over ? `${Math.abs(remaining)} over goal` : `${remaining} remaining`}
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-[var(--chip)] px-3 py-2">
            <dt className="text-[var(--muted)]">Goal</dt>
            <dd className="font-medium tabular-nums">{goal} kcal</dd>
          </div>
          <div className="rounded-2xl bg-[var(--chip)] px-3 py-2">
            <dt className="text-[var(--muted)]">Progress</dt>
            <dd className="font-medium tabular-nums">{Math.round(ratio * 100)}%</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

export function HomeScreen() {
  const meals = useMeals();
  const settings = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const day = useSyncExternalStore(
    () => () => {},
    () => todayKey(new Date()),
    () => "",
  );
  const todays = mealsForDay(meals, day);
  const eaten = todays.reduce((sum, meal) => sum + meal.calories, 0);
  const remaining = settings.dailyGoal - eaten;

  return (
    <AppShell
      current="home"
      title="Apehealth"
      subtitle={isClient ? formatDay(day) : "Today"}
      onOpenSettings={() => setSettingsOpen(true)}
    >
      <div className="grid flex-1 gap-6 lg:grid-cols-[minmax(18rem,22rem)_1fr] lg:items-start lg:gap-8">
        <section className="rounded-[1.75rem] border border-[var(--line)] bg-[var(--card)] p-5 shadow-[0_18px_50px_rgba(40,24,8,0.08)] lg:sticky lg:top-6">
          <CalorieRing eaten={eaten} goal={settings.dailyGoal} remaining={remaining} />
        </section>

        <section>
          {isClient && !hasApiKey(settings) ? (
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="mb-4 w-full rounded-2xl border border-[var(--line)] bg-[var(--chip)] px-4 py-3 text-left text-sm transition-colors duration-200 hover:bg-[var(--card)]"
            >
              <span className="block font-medium">Add a MiniMax API key</span>
              <span className="mt-0.5 block text-[var(--muted)]">
                Needed to estimate calories from photos. Tap to open Settings.
              </span>
            </button>
          ) : null}

          <div className="mb-3 flex items-end justify-between gap-3">
            <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
              Today&apos;s meals
            </h2>
            <p className="text-sm text-[var(--muted)]">
              {todays.length} {todays.length === 1 ? "meal" : "meals"}
            </p>
          </div>

          {todays.length === 0 ? (
            <div className="flex flex-col items-center rounded-[1.5rem] border border-dashed border-[var(--line)] bg-[var(--card)] px-5 py-12 text-center">
              <p className="max-w-sm text-[var(--muted)]">
                No meals yet. Snap or upload a photo and Apehealth will estimate the calories.
              </p>
              <Link href="/add" className="btn-primary mt-5">
                <PlusIcon className="h-5 w-5" />
                Add first meal
              </Link>
            </div>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {todays.map((meal) => {
                const confirming = pendingDelete === meal.id;
                return (
                  <li
                    key={meal.id}
                    className="flex gap-3 rounded-[1.4rem] border border-[var(--line)] bg-[var(--card)] p-3"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={meal.imageDataUrl}
                      alt=""
                      className="h-20 w-20 shrink-0 rounded-2xl object-cover"
                      width={80}
                      height={80}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium leading-snug [overflow-wrap:anywhere]">{meal.description}</p>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {meal.calories} kcal · {formatTime(meal.createdAt)}
                      </p>
                      {confirming ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="btn-danger min-h-10 px-3 text-sm"
                            onClick={() => {
                              deleteMeal(meal.id);
                              setPendingDelete(null);
                            }}
                          >
                            Delete
                          </button>
                          <button
                            type="button"
                            className="btn-secondary min-h-10 px-3 text-sm"
                            onClick={() => setPendingDelete(null)}
                          >
                            Keep
                          </button>
                        </div>
                      ) : null}
                    </div>
                    {!confirming ? (
                      <button
                        type="button"
                        className="btn-icon h-12 w-12 shrink-0 self-start"
                        aria-label={`Delete ${meal.description}`}
                        onClick={() => setPendingDelete(meal.id)}
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <SettingsModal
        open={settingsOpen}
        initial={settings}
        onClose={() => setSettingsOpen(false)}
        onSave={(next) => {
          saveSettings(next);
          setSettingsOpen(false);
        }}
      />
    </AppShell>
  );
}
