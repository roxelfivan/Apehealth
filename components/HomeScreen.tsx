"use client";

import Link from "next/link";
import { useId, useState, useSyncExternalStore } from "react";
import { AppShell } from "@/components/AppShell";
import { MealEditor } from "@/components/MealEditor";
import { MealList } from "@/components/MealList";
import { PlusIcon } from "@/components/icons";
import { SettingsModal } from "@/components/SettingsModal";
import { formatDayLabel } from "@/lib/i18n/format";
import { useTranslator } from "@/lib/i18n/useTranslator";
import { hasApiKey, mealsForDay, saveSettings, todayKey } from "@/lib/storage";
import { PROVIDER_DEFS } from "@/lib/providers";
import { useMeals, useSettings } from "@/lib/store";
import { formatGrams, roundGrams } from "@/lib/nutrition";
import type { Meal } from "@/lib/types";

function CalorieRing({
  eaten,
  goal,
  remaining,
  overLabel,
  remainingLabel,
  eatenOfLabel,
  goalLabel,
  progressLabel,
}: {
  eaten: number;
  goal: number;
  remaining: number;
  overLabel: string;
  remainingLabel: string;
  eatenOfLabel: string;
  goalLabel: string;
  progressLabel: string;
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
          <circle cx="64" cy="64" r={radius} fill="none" stroke="var(--chip)" strokeWidth="12" />
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
          {eatenOfLabel}
        </p>
        <p className={`mt-1 text-lg font-semibold ${over ? "text-[var(--over)]" : "text-[var(--ok)]"}`}>
          {over ? overLabel : remainingLabel}
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-[var(--chip)] px-3 py-2">
            <dt className="text-[var(--muted)]">{goalLabel}</dt>
            <dd className="font-medium tabular-nums">{goal} kcal</dd>
          </div>
          <div className="rounded-2xl bg-[var(--chip)] px-3 py-2">
            <dt className="text-[var(--muted)]">{progressLabel}</dt>
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
  const { locale, t } = useTranslator();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editing, setEditing] = useState<Meal | null>(null);
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
  const protein = roundGrams(todays.reduce((sum, meal) => sum + (meal.protein ?? 0), 0));
  const carbs = roundGrams(todays.reduce((sum, meal) => sum + (meal.carbs ?? 0), 0));
  const fat = roundGrams(todays.reduce((sum, meal) => sum + (meal.fat ?? 0), 0));
  const hasMacros = todays.some(
    (meal) => meal.protein != null || meal.carbs != null || meal.fat != null,
  );
  const remaining = settings.dailyGoal - eaten;

  return (
    <AppShell
      current="home"
      title={t("home.title")}
      subtitle={isClient ? formatDayLabel(locale, day) : t("common.today")}
      onOpenSettings={() => setSettingsOpen(true)}
    >
      <div className="grid flex-1 gap-6 lg:grid-cols-[minmax(18rem,22rem)_1fr] lg:items-start lg:gap-8">
        <section className="rounded-[1.75rem] border border-[var(--line)] bg-[var(--card)] p-5 shadow-[0_18px_50px_rgba(40,24,8,0.08)] lg:sticky lg:top-6">
          <CalorieRing
            eaten={eaten}
            goal={settings.dailyGoal}
            remaining={remaining}
            eatenOfLabel={t("home.caloriesEatenOf", { goal: settings.dailyGoal })}
            overLabel={t("home.overGoal", { amount: Math.abs(remaining) })}
            remainingLabel={t("home.remaining", { amount: remaining })}
            goalLabel={t("home.goal")}
            progressLabel={t("home.progress")}
          />
          {hasMacros ? (
            <p className="mt-4 text-center text-sm sm:text-left">
              <span style={{ color: "var(--protein)" }}>
                {formatGrams(protein)} {t("home.protein")}
              </span>
              {" · "}
              <span style={{ color: "var(--carb)" }}>
                {formatGrams(carbs)} {t("home.carb")}
              </span>
              {" · "}
              <span style={{ color: "var(--fat)" }}>
                {formatGrams(fat)} {t("home.fat")}
              </span>
            </p>
          ) : null}
        </section>

        <section>
          {isClient && !hasApiKey(settings) ? (
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="mb-4 w-full rounded-2xl border border-[var(--line)] bg-[var(--chip)] px-4 py-3 text-left text-sm transition-colors duration-200 hover:bg-[var(--card)]"
            >
              <span className="block font-medium">
                {t("home.apiKeyTitle", {
                  provider: PROVIDER_DEFS[settings.provider].label,
                })}
              </span>
              <span className="mt-0.5 block text-[var(--muted)]">{t("home.apiKeyBody")}</span>
            </button>
          ) : null}

          <div className="mb-3 flex items-end justify-between gap-3">
            <h2 className="text-sm font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
              {t("home.todaysMeals")}
            </h2>
            <p className="text-sm text-[var(--muted)]">
              {todays.length === 1
                ? t("home.mealCountOne", { count: todays.length })
                : t("home.mealCountMany", { count: todays.length })}
            </p>
          </div>

          {todays.length === 0 ? (
            <div className="flex flex-col items-center rounded-[1.5rem] border border-dashed border-[var(--line)] bg-[var(--card)] px-5 py-12 text-center">
              <p className="max-w-sm text-[var(--muted)]">
                <span className="font-medium text-[var(--foreground)]">
                  {t("home.emptyTitle")}
                </span>{" "}
                {t("home.emptyBody")}
              </p>
              <Link href="/add" className="btn-primary mt-5">
                <PlusIcon className="h-5 w-5" />
                {t("home.addFirstMeal")}
              </Link>
            </div>
          ) : (
            <MealList
              meals={todays}
              onEdit={setEditing}
              className="md:grid md:grid-cols-2 md:space-y-0"
            />
          )}
        </section>
      </div>

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
