"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { AppLogo } from "@/components/AppLogo";
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [step, setStep] = useState<Step>("pick");
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [description, setDescription] = useState("");
  const [calories, setCalories] = useState("");
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
      setStep("analyzing");
      const estimate = await analyzeMealPhoto(dataUrl, settings);
      setResult(estimate);
      setDescription(estimate.description);
      setCalories(String(estimate.calories));
      setStep("review");
    } catch (caught) {
      setStep("pick");
      setImage(null);
      setError(caught instanceof Error ? caught.message : "Could not analyze this photo.");
    }
  }

  function save() {
    if (!image) return;
    const parsed = Math.max(0, Math.round(Number(calories) || 0));
    addMeal({
      id: crypto.randomUUID(),
      imageDataUrl: image,
      description: description.trim() || "Meal",
      calories: parsed,
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
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <header className="mb-6 flex items-center justify-between gap-3">
        <Link href="/" className="flex min-w-0 items-center gap-2 text-sm text-[var(--muted)]">
          <AppLogo className="h-8 w-auto shrink-0 select-none" />
          ← Home
        </Link>
        <h1 className="font-[family-name:var(--font-display)] text-xl">Add meal</h1>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="text-sm text-[var(--muted)]"
        >
          Key
        </button>
      </header>

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

      {step === "pick" && (
        <div className="flex flex-1 flex-col justify-center gap-4">
          <p className="text-center text-[var(--muted)]">
            Take a photo or upload one. MiniMax estimates calories and a food breakdown; you can edit before saving.
          </p>
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="rounded-full bg-[var(--accent)] py-4 text-base font-semibold text-[var(--accent-ink)]"
          >
            Take photo
          </button>
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            className="rounded-full border border-[var(--line)] py-4 text-base font-medium"
          >
            Upload from gallery
          </button>
        </div>
      )}

      {step === "analyzing" && image && (
        <div className="flex flex-1 flex-col items-center justify-center gap-5 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" className="max-h-64 w-full rounded-[1.75rem] object-cover" />
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--line)] border-t-[var(--accent)]" />
          <p className="text-[var(--muted)]">MiniMax is estimating calories and nutrition…</p>
        </div>
      )}

      {step === "review" && image && result && (
        <div className="flex flex-1 flex-col gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" className="max-h-56 w-full rounded-[1.75rem] object-cover" />
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
            Result · confidence {result.confidence}
          </p>
          <NutritionBreakdown
            calories={Number(calories) || result.calories}
            protein={result.protein}
            carbs={result.carbs}
            fat={result.fat}
            items={result.items}
          />
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="w-full rounded-2xl border border-[var(--line)] bg-[var(--field)] px-4 py-3 outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Calories (kcal)</span>
            <input
              type="number"
              min={0}
              value={calories}
              onChange={(event) => setCalories(event.target.value)}
              className="w-full rounded-2xl border border-[var(--line)] bg-[var(--field)] px-4 py-3 text-2xl outline-none focus:border-[var(--accent)]"
            />
          </label>
          <button
            type="button"
            onClick={save}
            className="mt-auto rounded-full bg-[var(--accent)] py-4 text-base font-semibold text-[var(--accent-ink)]"
          >
            Save meal
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("pick");
              setImage(null);
              setResult(null);
            }}
            className="text-sm text-[var(--muted)]"
          >
            Choose a different photo
          </button>
        </div>
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
    </div>
  );
}
