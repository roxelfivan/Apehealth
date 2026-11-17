"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronIcon, CloseIcon, EyeIcon, EyeOffIcon } from "@/components/icons";
import {
  LOCALE_NAMES,
  LOCALES,
  localeTag,
  type Locale,
} from "@/lib/i18n";
import { useTranslator } from "@/lib/i18n/useTranslator";
import {
  defaultProviderConfig,
  modelPresets,
  setLocale,
} from "@/lib/storage";
import {
  PROVIDERS,
  PROVIDER_DEFS,
  type Provider,
} from "@/lib/providers";
import type { Settings } from "@/lib/types";

type Props = {
  open: boolean;
  initial: Settings;
  onClose: () => void;
  onSave: (settings: Settings) => void;
};

export function SettingsModal({ open, initial, onClose, onSave }: Props) {
  if (!open) return null;
  return (
    <SettingsForm
      // The locale is excluded from the key so switching the language does not
      // remount the form and discard the rest of the user's draft.
      key={`${initial.dailyGoal}|${initial.provider}|${initial.ephemeralKey}|${initial.providers[initial.provider].apiKey.length}|${initial.providers[initial.provider].apiEndpoint}|${initial.providers[initial.provider].model}`}
      initial={initial}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

function SettingsForm({
  initial,
  onClose,
  onSave,
}: Omit<Props, "open">) {
  const titleId = useId();
  const { t, tn } = useTranslator();
  const formRef = useRef<HTMLFormElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const [draft, setDraft] = useState(initial);
  const [showKey, setShowKey] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [goalError, setGoalError] = useState<string | null>(null);

  // The active provider's config — editing always targets this one.
  const active = draft.providers[draft.provider];
  const providerDef = PROVIDER_DEFS[draft.provider];
  const providerLabel = providerDef.label;

  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !formRef.current) return;
      const focusable = Array.from(
        formRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((node) => !node.hasAttribute("disabled") && node.tabIndex !== -1);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", onKey);
      previouslyFocused.current?.focus();
    };
  }, [onClose]);

  /** Switch provider, keeping each provider's own key, endpoint and model. */
  function selectProvider(provider: Provider) {
    setDraft((prev) => ({
      ...prev,
      provider,
      providers: {
        ...prev.providers,
        [provider]: prev.providers[provider] ?? defaultProviderConfig(provider),
      },
    }));
    setShowKey(false);
  }

  function updateActive(patch: Partial<typeof active>) {
    setDraft((prev) => ({
      ...prev,
      providers: {
        ...prev.providers,
        [prev.provider]: { ...prev.providers[prev.provider], ...patch },
      },
    }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 cursor-pointer"
        aria-label={t("settings.close")}
        onClick={onClose}
      />
      <form
        ref={formRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-[var(--line)] bg-[var(--card)] p-5 shadow-2xl sm:rounded-3xl"
        onSubmit={(event) => {
          event.preventDefault();
          const goal = Math.round(Number(draft.dailyGoal) || 0);
          if (goal < 500 || goal > 8000) {
            setGoalError(t("errors.goalRange"));
            return;
          }
          const providers = { ...draft.providers };
          for (const provider of PROVIDERS) {
            const config = providers[provider];
            const fallback = defaultProviderConfig(provider);
            providers[provider] = {
              apiKey: (config?.apiKey ?? "").trim(),
              apiEndpoint:
                config?.apiEndpoint.trim() || fallback.apiEndpoint,
              model: config?.model.trim() || fallback.model,
            };
          }
          onSave({ ...draft, dailyGoal: goal, providers });
        }}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
              {t("settings.eyebrow")}
            </p>
            <h2 id={titleId} className="font-[family-name:var(--font-display)] text-2xl">
              {t("settings.title")}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="btn-icon"
            aria-label={t("settings.close")}
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <fieldset className="mb-4">
          <legend className="mb-1.5 block text-sm font-medium">{t("settings.language")}</legend>
          <div
            role="radiogroup"
            aria-label={t("settings.language")}
            className="flex gap-2 rounded-2xl bg-[var(--chip)] p-1"
          >
            {LOCALES.map((option: Locale) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={draft.locale === option}
                lang={localeTag(option)}
                className={`min-h-11 flex-1 rounded-xl text-sm transition-colors duration-200 ${
                  draft.locale === option
                    ? "bg-[var(--accent)] font-semibold text-[var(--accent-ink)]"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
                onClick={() => {
                  setDraft((prev) => ({ ...prev, locale: option }));
                  // Apply immediately so the whole interface (and any pending
                  // AI analysis) follows the newly chosen language. Only the
                  // locale is persisted here — the rest of the form stays a
                  // draft until Save is pressed.
                  setLocale(option);
                }}
              >
                {LOCALE_NAMES[option]}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-[var(--muted)]">{t("settings.languageHint")}</p>
        </fieldset>

        <label className="mb-4 block">
          <span className="mb-1.5 block text-sm font-medium">{t("settings.dailyGoal")}</span>
          <input
            type="number"
            min={500}
            max={8000}
            inputMode="numeric"
            value={draft.dailyGoal}
            aria-invalid={goalError ? true : undefined}
            aria-describedby={goalError ? "goal-error" : "goal-hint"}
            onChange={(event) => {
              setDraft((prev) => ({ ...prev, dailyGoal: Number(event.target.value) }));
              setGoalError(null);
            }}
            className="field"
          />
          <p id="goal-hint" className="mt-1.5 text-xs text-[var(--muted)]">
            {t("settings.goalHint")}
          </p>
          {goalError ? (
            <p id="goal-error" className="mt-1.5 text-sm text-[var(--over)]">
              {goalError}
            </p>
          ) : null}
        </label>

        <fieldset className="mb-4">
          <legend className="mb-1.5 block text-sm font-medium">{t("settings.provider")}</legend>
          <div
            role="radiogroup"
            aria-label={t("settings.provider")}
            className="flex gap-2 rounded-2xl bg-[var(--chip)] p-1"
          >
            {PROVIDERS.map((option: Provider) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={draft.provider === option}
                className={`min-h-11 flex-1 rounded-xl text-sm transition-colors duration-200 ${
                  draft.provider === option
                    ? "bg-[var(--accent)] font-semibold text-[var(--accent-ink)]"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
                onClick={() => selectProvider(option)}
              >
                {PROVIDER_DEFS[option].label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-[var(--muted)]">{t("settings.providerHint")}</p>
        </fieldset>

        <label className="mb-2 block">
          <span className="mb-1.5 block text-sm font-medium">
            {t("settings.apiKey", { provider: providerLabel })}
          </span>
          <div className="flex gap-2">
            <input
              type={showKey ? "text" : "password"}
              autoComplete="off"
              spellCheck={false}
              placeholder={t("settings.apiKeyPlaceholder", { provider: providerLabel })}
              value={active.apiKey}
              onChange={(event) => updateActive({ apiKey: event.target.value })}
              className="field min-w-0 flex-1 font-mono text-sm"
            />
            <button
              type="button"
              onClick={() => setShowKey((value) => !value)}
              className="btn-icon shrink-0"
              aria-pressed={showKey}
              aria-label={showKey ? t("settings.hideKey") : t("settings.showKey")}
            >
              {showKey ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
            </button>
          </div>
        </label>
        <p className="mb-3 text-xs leading-5 text-[var(--muted)]">
          {tn("settings.apiKeyNote", {
            provider: providerLabel,
            link: (
              <a
                className="underline decoration-[var(--accent)] underline-offset-2"
                href={providerDef.keyUrl}
                target="_blank"
                rel="noreferrer"
              >
                {providerDef.keyUrlLabel}
              </a>
            ),
          })}
        </p>

        <label className="mb-4 flex min-h-12 items-start gap-3 rounded-2xl bg-[var(--chip)] px-3 py-3 text-sm">
          <input
            type="checkbox"
            className="mt-1 h-5 w-5 accent-[var(--accent)]"
            checked={draft.ephemeralKey}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, ephemeralKey: event.target.checked }))
            }
          />
          <span>
            {t("settings.ephemeralKey")}
            <span className="mt-0.5 block text-xs text-[var(--muted)]">
              {t("settings.ephemeralKeyHint")}
            </span>
          </span>
        </label>

        <button
          type="button"
          className="mb-3 flex min-h-12 w-full items-center justify-between rounded-2xl px-1 text-left text-sm font-medium"
          aria-expanded={advanced}
          onClick={() => setAdvanced((value) => !value)}
        >
          {t("settings.advanced")}
          <ChevronIcon className={`h-5 w-5 transition-transform duration-200 ${advanced ? "rotate-180" : ""}`} />
        </button>

        {advanced ? (
          <div className="mb-4 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">{t("settings.apiEndpoint")}</span>
              <input
                type="url"
                value={active.apiEndpoint}
                onChange={(event) => updateActive({ apiEndpoint: event.target.value })}
                className="field font-mono text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">{t("settings.model")}</span>
              <input
                list="apehealth-models"
                value={active.model}
                onChange={(event) => updateActive({ model: event.target.value })}
                className="field font-mono text-sm"
              />
              <datalist id="apehealth-models">
                {modelPresets(draft.provider).map((model) => (
                  <option key={model} value={model} />
                ))}
              </datalist>
            </label>
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn-secondary w-full sm:w-auto" onClick={onClose}>
            {t("settings.cancel")}
          </button>
          <button type="submit" className="btn-primary w-full sm:w-auto sm:min-w-32">
            {t("settings.save")}
          </button>
        </div>
      </form>
    </div>
  );
}