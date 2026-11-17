"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { CameraIcon, ImageIcon } from "@/components/icons";
import { NutritionBreakdown } from "@/components/NutritionBreakdown";
import { SettingsModal } from "@/components/SettingsModal";
import { fileToApiDataUrl } from "@/lib/image";
import { analyzeMealPhoto } from "@/lib/minimax";
import { addMeal, hasApiKey, saveSettings } from "@/lib/storage";
import { useSettings } from "@/lib/store";
import type { AnalyzeResult } from "@/lib/types";

type Step = "pick" | "analyzing" | "review";

export function AddMeal() {
  const router = useRouter();
  const settings = useSettings();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [step, setStep] = useState<Step>("pick");
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [description, setDescription] = useState("");
  const [calories, setCalories] = useState("");
  const [calorieError, setCalorieError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose a photo of the meal.");
      return;
    }
    setError(null);
    if (!hasApiKey(settings)) {
      setSettingsOpen(true);
      setError("Add your MiniMax API key in Settings, then try again.");
      return;
    }
    try {
      const dataUrl = await fileToApiDataUrl(file);
      setImage(dataUrl);
      setStep("analyzing");
      const estimate = await analyzeMealPhoto(dataUrl, settings);
      setResult(estimate);
      setDescription(estimate.description);
      setCalories(String(estimate.calories));
      setCalorieError(null);
      setStep("review");
    } catch (caught) {
      setStep("pick");
      setImage(null);
      setError(caught instanceof Error ? caught.message : "Could not analyze this photo.");
    }
  }

  function save() {
    if (!image) return;
    const parsed = Number(calories);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setCalorieError("Enter a calorie amount of 0 or more.");
      return;
    }
    addMeal({
      id: crypto.randomUUID(),
      imageDataUrl: image,
      description: description.trim() || "Meal",
      calories: Math.round(parsed),
      protein: result?.protein ?? null,
      carbs: result?.carbs ?? null,
      fat: result?.fat ?? null,
      items: result?.items ?? [],
      confidence: result?.confidence ?? null,
      createdAt: new Date().toISOString(),
    });
    router.push("/");
  }

  return (
    <AppShell
      current="add"
      title="Add meal"
      subtitle="Photo estimate"
      onOpenSettings={() => setSettingsOpen(true)}
    >
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
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="mb-4 rounded-2xl bg-[var(--chip)] px-4 py-3 text-sm outline-none"
        >
          <p className="font-medium">There is a problem</p>
          <p className="mt-1 text-[var(--muted)]">{error}</p>
          {!hasApiKey(settings) ? (
            <button type="button" className="btn-primary mt-3 min-h-10 px-4 text-sm" onClick={() => setSettingsOpen(true)}>
              Open settings
            </button>
          ) : null}
        </div>
      ) : null}

      {step === "pick" && (
        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-4">
          <p className="text-center text-[var(--muted)]">
            Take a photo or upload one. MiniMax estimates calories and a food breakdown; you can edit before saving.
          </p>
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="btn-primary h-14 w-full text-base"
          >
            <CameraIcon className="h-5 w-5" />
            Take photo
          </button>
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            className="btn-secondary h-14 w-full text-base"
          >
            <ImageIcon className="h-5 w-5" />
            Upload from gallery
          </button>
          <div
            className={`hidden rounded-[1.5rem] border-2 border-dashed px-5 py-10 text-center transition-colors duration-200 md:block ${
              dragging ? "border-[var(--accent)] bg-[var(--chip)]" : "border-[var(--line)]"
            }`}
            onDragEnter={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              void onFile(event.dataTransfer.files?.[0]);
            }}
          >
            <p className="font-medium">Or drop a meal photo here</p>
            <p className="mt-1 text-sm text-[var(--muted)]">Desktop shortcut — JPG, PNG, or HEIC.</p>
          </div>
        </div>
      )}

      {step === "analyzing" && image && (
        <div
          className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-5 text-center"
          aria-busy="true"
          aria-live="polite"
        >
          <div className="aspect-[4/3] w-full overflow-hidden rounded-[1.75rem] bg-[var(--chip)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--line)] border-t-[var(--accent)]" />
          <p className="text-[var(--muted)]">MiniMax is estimating calories and nutrition…</p>
        </div>
      )}

      {step === "review" && image && result && (
        <form
          className="grid flex-1 gap-6 lg:grid-cols-2 lg:items-start"
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <div className="flex flex-col gap-4">
            <div className="aspect-[4/3] overflow-hidden rounded-[1.75rem] bg-[var(--chip)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="" className="h-full w-full object-cover" />
            </div>
            <NutritionBreakdown
              calories={Number(calories) || result.calories}
              protein={result.protein}
              carbs={result.carbs}
              fat={result.fat}
              items={result.items}
            />
          </div>
          <div className="flex flex-col gap-4">
            <p className="text-sm text-[var(--muted)]">
              Confidence:{" "}
              <span className="font-medium capitalize text-[var(--foreground)]">{result.confidence}</span>
              . Edit anything that looks off, then save.
            </p>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Description</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                className="field min-h-24"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Calories (kcal)</span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={calories}
                aria-invalid={calorieError ? true : undefined}
                aria-describedby={calorieError ? "calorie-error" : undefined}
                onChange={(event) => {
                  setCalories(event.target.value);
                  setCalorieError(null);
                }}
                className="field text-2xl"
              />
              {calorieError ? (
                <p id="calorie-error" className="mt-1.5 text-sm text-[var(--over)]">
                  {calorieError}
                </p>
              ) : null}
            </label>
            <div className="mt-auto flex flex-col gap-3 pt-2">
              <button type="submit" className="btn-primary h-14 w-full">
                Save meal
              </button>
              <button
                type="button"
                className="btn-secondary h-12 w-full"
                onClick={() => {
                  setStep("pick");
                  setImage(null);
                  setResult(null);
                }}
              >
                Choose a different photo
              </button>
            </div>
          </div>
        </form>
      )}

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
    </AppShell>
  );
}
