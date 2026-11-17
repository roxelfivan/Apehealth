"use client";

import { useRef, useState } from "react";
import { SettingsModal } from "@/components/SettingsModal";
import { fileToApiDataUrl } from "@/lib/image";
import { analyzeMealPhoto } from "@/lib/minimax";
import {
  fromDatetimeLocalValue,
  hasApiKey,
  saveSettings,
  toDatetimeLocalValue,
  updateMeal,
} from "@/lib/storage";
import { useSettings } from "@/lib/store";
import type { Meal } from "@/lib/types";

type Props = {
  meal: Meal;
  onClose: () => void;
};

export function MealEditor({ meal, onClose }: Props) {
  const settings = useSettings();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [image, setImage] = useState(meal.imageDataUrl);
  const [description, setDescription] = useState(meal.description);
  const [calories, setCalories] = useState(String(meal.calories));
  const [when, setWhen] = useState(toDatetimeLocalValue(meal.createdAt));
  const [confidence, setConfidence] = useState(meal.confidence);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!hasApiKey(settings)) {
      setSettingsOpen(true);
      setError("Add your MiniMax API key in Settings, then try again.");
      return;
    }
    try {
      const dataUrl = await fileToApiDataUrl(file);
      setImage(dataUrl);
      setAnalyzing(true);
      const estimate = await analyzeMealPhoto(dataUrl, settings);
      setDescription(estimate.description);
      setCalories(String(estimate.calories));
      setConfidence(estimate.confidence);
    } catch (caught) {
      setImage(meal.imageDataUrl);
      setError(caught instanceof Error ? caught.message : "Could not analyze this photo.");
    } finally {
      setAnalyzing(false);
    }
  }

  function save() {
    updateMeal(meal.id, {
      imageDataUrl: image,
      description,
      calories: Math.max(0, Math.round(Number(calories) || 0)),
      confidence,
      createdAt: fromDatetimeLocalValue(when, meal.createdAt),
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6">
      <button type="button" className="absolute inset-0" aria-label="Close editor" onClick={onClose} />
      <div className="relative z-10 max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-[var(--line)] bg-[var(--card)] p-5 shadow-2xl sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
              Edit meal
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-2xl">Record</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-sm text-[var(--muted)] hover:bg-[var(--chip)]"
          >
            Cancel
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

        {error && (
          <p className="mb-4 rounded-2xl bg-[var(--chip)] px-4 py-3 text-sm">{error}</p>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="" className="mb-3 max-h-48 w-full rounded-[1.5rem] object-cover" />

        {analyzing ? (
          <div className="mb-4 flex items-center gap-3 text-sm text-[var(--muted)]">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--line)] border-t-[var(--accent)]" />
            MiniMax is re-estimating calories…
          </div>
        ) : (
          <div className="mb-4 flex gap-2">
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              className="flex-1 rounded-full border border-[var(--line)] py-2.5 text-sm"
            >
              Retake photo
            </button>
            <button
              type="button"
              onClick={() => galleryRef.current?.click()}
              className="flex-1 rounded-full border border-[var(--line)] py-2.5 text-sm"
            >
              Upload photo
            </button>
          </div>
        )}

        {confidence && (
          <p className="mb-3 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
            Confidence · {confidence}
          </p>
        )}

        <label className="mb-3 block">
          <span className="mb-1.5 block text-sm font-medium">Description</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            disabled={analyzing}
            className="w-full rounded-2xl border border-[var(--line)] bg-[var(--field)] px-4 py-3 outline-none focus:border-[var(--accent)] disabled:opacity-60"
          />
        </label>

        <label className="mb-3 block">
          <span className="mb-1.5 block text-sm font-medium">Calories (kcal)</span>
          <input
            type="number"
            min={0}
            value={calories}
            onChange={(event) => setCalories(event.target.value)}
            disabled={analyzing}
            className="w-full rounded-2xl border border-[var(--line)] bg-[var(--field)] px-4 py-3 text-2xl outline-none focus:border-[var(--accent)] disabled:opacity-60"
          />
        </label>

        <label className="mb-5 block">
          <span className="mb-1.5 block text-sm font-medium">Logged at</span>
          <input
            type="datetime-local"
            value={when}
            onChange={(event) => setWhen(event.target.value)}
            disabled={analyzing}
            className="w-full rounded-2xl border border-[var(--line)] bg-[var(--field)] px-4 py-3 outline-none focus:border-[var(--accent)] disabled:opacity-60"
          />
        </label>

        <button
          type="button"
          onClick={save}
          disabled={analyzing}
          className="w-full rounded-full bg-[var(--accent)] py-3.5 text-base font-semibold text-[var(--accent-ink)] disabled:opacity-60"
        >
          Save changes
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
