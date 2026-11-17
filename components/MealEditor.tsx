"use client";

import { useRef, useState } from "react";
import { NutritionBreakdown } from "@/components/NutritionBreakdown";
import { SettingsModal } from "@/components/SettingsModal";
import { fileToApiDataUrl } from "@/lib/image";
import { analyzeMealPhoto } from "@/lib/minimax";
import { useTranslator } from "@/lib/i18n/useTranslator";
import {
  fromDatetimeLocalValue,
  hasApiKey,
  saveSettings,
  toDatetimeLocalValue,
  updateMeal,
} from "@/lib/storage";
import { useSettings } from "@/lib/store";
import type { AnalyzeResult, Meal } from "@/lib/types";

type Props = {
  meal: Meal;
  onClose: () => void;
};

export function MealEditor({ meal, onClose }: Props) {
  const settings = useSettings();
  const { t } = useTranslator();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [image, setImage] = useState(meal.imageDataUrl);
  const [description, setDescription] = useState(meal.description);
  const [calories, setCalories] = useState(String(meal.calories));
  const [when, setWhen] = useState(toDatetimeLocalValue(meal.createdAt));
  const [confidence, setConfidence] = useState(meal.confidence);
  const [protein, setProtein] = useState(meal.protein);
  const [carbs, setCarbs] = useState(meal.carbs);
  const [fat, setFat] = useState(meal.fat);
  const [items, setItems] = useState(meal.items);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!hasApiKey(settings)) {
      setSettingsOpen(true);
      setError(t("errors.needApiKey"));
      return;
    }
    try {
      const dataUrl = await fileToApiDataUrl(file);
      setImage(dataUrl);
      setAnalyzing(true);
      const estimate: AnalyzeResult = await analyzeMealPhoto(dataUrl, settings);
      setDescription(estimate.description);
      setCalories(String(estimate.calories));
      setConfidence(estimate.confidence);
      setProtein(estimate.protein);
      setCarbs(estimate.carbs);
      setFat(estimate.fat);
      setItems(estimate.items);
    } catch (caught) {
      setImage(meal.imageDataUrl);
      setError(caught instanceof Error ? caught.message : t("errors.couldNotAnalyze"));
    } finally {
      setAnalyzing(false);
    }
  }

  function save() {
    updateMeal(meal.id, {
      imageDataUrl: image,
      description,
      calories: Math.max(0, Math.round(Number(calories) || 0)),
      protein,
      carbs,
      fat,
      items,
      confidence,
      createdAt: fromDatetimeLocalValue(when, meal.createdAt),
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6">
      <button type="button" className="absolute inset-0" aria-label={t("editor.close")} onClick={onClose} />
      <div className="relative z-10 max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-[var(--line)] bg-[var(--card)] p-5 shadow-2xl sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
              {t("editor.eyebrow")}
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-2xl">{t("editor.title")}</h2>
          </div>
          <button type="button" onClick={onClose} className="btn-secondary min-h-11 px-4 text-sm">
            {t("editor.cancel")}
          </button>
        </div>

        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => {
            void onFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            void onFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />

        {error ? (
          <p role="alert" className="mb-4 rounded-2xl bg-[var(--chip)] px-4 py-3 text-sm">
            {error}
          </p>
        ) : null}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="" className="mb-3 max-h-48 w-full rounded-[1.5rem] object-cover" />

        {analyzing ? (
          <div className="mb-4 flex items-center gap-3 text-sm text-[var(--muted)]">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--line)] border-t-[var(--accent)]" />
            {t("editor.reEstimating")}
          </div>
        ) : (
          <div className="mb-4 flex gap-2">
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              className="btn-secondary flex-1 text-sm"
            >
              {t("editor.retakePhoto")}
            </button>
            <button
              type="button"
              onClick={() => galleryRef.current?.click()}
              className="btn-secondary flex-1 text-sm"
            >
              {t("editor.uploadPhoto")}
            </button>
          </div>
        )}

        {confidence && (
          <p className="mb-3 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
            {t("editor.resultConfidence", { confidence: t(`confidence.${confidence}`) })}
          </p>
        )}

        <div className="mb-4">
          <NutritionBreakdown
            calories={Number(calories) || meal.calories}
            protein={protein}
            carbs={carbs}
            fat={fat}
            items={items}
          />
        </div>

        <label className="mb-3 block">
          <span className="mb-1.5 block text-sm font-medium">{t("editor.description")}</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            disabled={analyzing}
            className="field min-h-24 disabled:opacity-60"
          />
        </label>

        <label className="mb-3 block">
          <span className="mb-1.5 block text-sm font-medium">{t("editor.calories")}</span>
          <input
            type="number"
            min={0}
            value={calories}
            onChange={(event) => setCalories(event.target.value)}
            disabled={analyzing}
            className="field text-2xl disabled:opacity-60"
          />
        </label>

        <label className="mb-5 block">
          <span className="mb-1.5 block text-sm font-medium">{t("editor.loggedAt")}</span>
          <input
            type="datetime-local"
            value={when}
            onChange={(event) => setWhen(event.target.value)}
            disabled={analyzing}
            className="field disabled:opacity-60"
          />
        </label>

        <button
          type="button"
          onClick={save}
          disabled={analyzing}
          className="btn-primary w-full disabled:opacity-60"
        >
          {t("editor.saveChanges")}
        </button>
      </div>

      <SettingsModal
        open={settingsOpen}
        initial={settings}
        onClose={() => setSettingsOpen(false)}
        onSave={(next) => {
          saveSettings(next);
          setSettingsOpen(false);
          setError(null);
        }}
      />
    </div>
  );
}
