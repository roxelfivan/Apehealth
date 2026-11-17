"use client";

import { deleteMeal } from "@/lib/storage";
import type { Meal } from "@/lib/types";

export function formatMealTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatMealDay(day: string): string {
  const parsed = new Date(`${day}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return day;
  return parsed.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

type Props = {
  meals: Meal[];
  onEdit: (meal: Meal) => void;
};

export function MealList({ meals, onEdit }: Props) {
  if (meals.length === 0) return null;

  return (
    <ul className="space-y-3">
      {meals.map((meal) => (
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
              {meal.calories} kcal · {formatMealTime(meal.createdAt)}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <button
              type="button"
              className="text-xs text-[var(--muted)]"
              onClick={() => onEdit(meal)}
            >
              Edit
            </button>
            <button
              type="button"
              className="text-xs text-[var(--muted)]"
              onClick={() => {
                if (confirm("Delete this meal?")) deleteMeal(meal.id);
              }}
            >
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
