"use client";

import { useState } from "react";
import { PencilIcon, TrashIcon } from "@/components/icons";
import { formatTimeLabel } from "@/lib/i18n/format";
import { useTranslator } from "@/lib/i18n/useTranslator";
import { deleteMeal } from "@/lib/storage";
import { formatGrams } from "@/lib/nutrition";
import type { Meal } from "@/lib/types";

type Props = {
  meals: Meal[];
  onEdit: (meal: Meal) => void;
  className?: string;
};

export function MealList({ meals, onEdit, className }: Props) {
  const { locale, t } = useTranslator();
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  if (meals.length === 0) return null;

  return (
    <ul className={`space-y-3 ${className ?? ""}`}>
      {meals.map((meal) => {
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
                {meal.calories} kcal · {formatTimeLabel(locale, meal.createdAt)}
              </p>
              {meal.protein != null || meal.carbs != null || meal.fat != null ? (
                <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                  {meal.protein != null ? `${formatGrams(meal.protein)} P` : "— P"} ·{" "}
                  {meal.carbs != null ? `${formatGrams(meal.carbs)} C` : "— C"} ·{" "}
                  {meal.fat != null ? `${formatGrams(meal.fat)} F` : "— F"}
                </p>
              ) : null}
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
                    {t("list.delete")}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary min-h-10 px-3 text-sm"
                    onClick={() => setPendingDelete(null)}
                  >
                    {t("list.keep")}
                  </button>
                </div>
              ) : null}
            </div>
            {!confirming ? (
              <div className="flex shrink-0 flex-col gap-2">
                <button
                  type="button"
                  className="btn-icon h-12 w-12"
                  aria-label={t("list.editItem", { name: meal.description })}
                  onClick={() => onEdit(meal)}
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  className="btn-icon h-12 w-12"
                  aria-label={t("list.deleteItem", { name: meal.description })}
                  onClick={() => setPendingDelete(meal.id)}
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
