"use client";

import type { DailyTotal } from "@/lib/storage";

type Props = {
  series: DailyTotal[];
  goal: number;
};

export function CalorieChart({ series, goal }: Props) {
  const max = Math.max(goal, ...series.map((row) => row.calories), 1);
  const hasMeals = series.some((row) => row.mealCount > 0);

  if (!hasMeals) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-[var(--line)] px-5 py-10 text-center text-sm text-[var(--muted)]">
        No meals in this range yet.
      </div>
    );
  }

  return (
    <div className="rounded-[1.75rem] border border-[var(--line)] bg-[var(--card)] p-4">
      <p className="mb-3 text-sm text-[var(--muted)]">Daily calories vs {goal} kcal goal</p>
      <div className="-mx-1 overflow-x-auto pb-1">
        <div
          className="flex h-44 items-end gap-1.5 px-1"
          style={{ minWidth: `${Math.max(series.length * 28, 240)}px` }}
        >
          {series.map((row) => {
            const height = Math.max(row.calories > 0 ? 6 : 2, Math.round((row.calories / max) * 140));
            const over = row.calories > goal;
            const label = row.day.slice(5);
            return (
              <div key={row.day} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <p className="text-[10px] tabular-nums text-[var(--muted)]">
                  {row.calories || ""}
                </p>
                <div
                  className={`w-full max-w-7 rounded-t-md ${over ? "bg-[var(--over)]" : "bg-[var(--accent)]"}`}
                  style={{ height }}
                  title={`${row.day}: ${row.calories} kcal`}
                />
                <p className="text-[10px] tabular-nums text-[var(--muted)]">{label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
