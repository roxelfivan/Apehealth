"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { CalorieChart } from "@/components/CalorieChart";
import { MealEditor } from "@/components/MealEditor";
import { MealList, formatMealDay } from "@/components/MealList";
import { dailyTotals, mealsByDay, todayKey } from "@/lib/storage";
import { useMeals, useSettings } from "@/lib/store";
import type { Meal } from "@/lib/types";

const RANGES = [7, 14, 30] as const;

export function HistoryScreen() {
  const meals = useMeals();
  const settings = useSettings();
  const [range, setRange] = useState<(typeof RANGES)[number]>(7);
  const [editing, setEditing] = useState<Meal | null>(null);
  const today = useSyncExternalStore(
    () => () => {},
    () => todayKey(new Date()),
    () => "",
  );
  const series = useMemo(
    () => dailyTotals(meals, range, today ? new Date(`${today}T12:00:00`) : new Date()),
    [meals, range, today],
  );
  const inRange = useMemo(() => {
    const days = new Set(series.map((row) => row.day));
    return mealsByDay(meals).filter((group) => days.has(group.day));
  }, [meals, series]);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <header className="mb-6 flex items-center justify-between">
        <Link href="/" className="text-sm text-[var(--muted)]">
          ← Home
        </Link>
        <h1 className="font-[family-name:var(--font-display)] text-xl">History</h1>
        <span className="w-12" />
      </header>

      <div className="mb-4 flex rounded-full border border-[var(--line)] bg-[var(--card)] p-1">
        {RANGES.map((days) => (
          <button
            key={days}
            type="button"
            onClick={() => setRange(days)}
            className={`flex-1 rounded-full py-2 text-sm ${
              range === days ? "bg-[var(--accent)] font-semibold text-[var(--accent-ink)]" : "text-[var(--muted)]"
            }`}
          >
            {days}d
          </button>
        ))}
      </div>

      <CalorieChart series={series} goal={settings.dailyGoal} />

      <h2 className="mb-3 mt-8 text-sm font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
        Meals
      </h2>

      {inRange.length === 0 ? (
        <div className="rounded-[1.5rem] border border-dashed border-[var(--line)] px-5 py-10 text-center text-[var(--muted)]">
          Nothing logged in the last {range} days.
        </div>
      ) : (
        <div className="space-y-6">
          {inRange.map((group) => (
            <section key={group.day}>
              <div className="mb-2 flex items-baseline justify-between">
                <h3 className="text-sm font-medium">{formatMealDay(group.day)}</h3>
                <p className="text-xs text-[var(--muted)]">
                  {group.meals.reduce((sum, meal) => sum + meal.calories, 0)} kcal
                </p>
              </div>
              <MealList meals={group.meals} onEdit={setEditing} />
            </section>
          ))}
        </div>
      )}

      {editing && (
        <MealEditor key={editing.id} meal={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
