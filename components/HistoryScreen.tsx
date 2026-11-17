"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { AppShell } from "@/components/AppShell";
import { CalorieChart } from "@/components/CalorieChart";
import { MealEditor } from "@/components/MealEditor";
import { MealList, formatMealDay } from "@/components/MealList";
import { SettingsModal } from "@/components/SettingsModal";
import { dailyTotals, mealsByDay, saveSettings, todayKey } from "@/lib/storage";
import { useMeals, useSettings } from "@/lib/store";
import type { Meal } from "@/lib/types";

const RANGES = [7, 14, 30] as const;

export function HistoryScreen() {
  const meals = useMeals();
  const settings = useSettings();
  const [range, setRange] = useState<(typeof RANGES)[number]>(7);
  const [editing, setEditing] = useState<Meal | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
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
    <AppShell
      current="history"
      title="History"
      subtitle="Daily totals"
      onOpenSettings={() => setSettingsOpen(true)}
    >
      <div className="mb-4 flex rounded-full border border-[var(--line)] bg-[var(--card)] p-1">
        {RANGES.map((days) => (
          <button
            key={days}
            type="button"
            onClick={() => setRange(days)}
            aria-pressed={range === days}
            className={`min-h-11 flex-1 rounded-full text-sm transition-colors duration-200 ${
              range === days ? "bg-[var(--accent)] font-semibold text-[var(--accent-ink)]" : "text-[var(--muted)]"
            }`}
          >
            {days} days
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
