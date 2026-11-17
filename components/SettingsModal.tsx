"use client";

import { useState } from "react";
import {
  DEFAULT_ENDPOINT,
  DEFAULT_GOAL,
  DEFAULT_MODEL,
  MODEL_PRESETS,
} from "@/lib/storage";
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
      key={`${initial.dailyGoal}|${initial.apiEndpoint}|${initial.model}|${initial.ephemeralKey}|${initial.apiKey.length}`}
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
  const [draft, setDraft] = useState(initial);
  const [showKey, setShowKey] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Close settings"
        onClick={onClose}
      />
      <form
        className="relative z-10 max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-[var(--line)] bg-[var(--card)] p-5 shadow-2xl sm:rounded-3xl"
        onSubmit={(event) => {
          event.preventDefault();
          onSave({
            ...draft,
            dailyGoal: Math.max(
              500,
              Math.min(8000, Math.round(Number(draft.dailyGoal) || DEFAULT_GOAL)),
            ),
            apiKey: draft.apiKey.trim(),
            apiEndpoint: draft.apiEndpoint.trim() || DEFAULT_ENDPOINT,
            model: draft.model.trim() || DEFAULT_MODEL,
          });
        }}
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
              Settings
            </p>
            <h2 className="font-[family-name:var(--font-display)] text-2xl">Apehealth</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-sm text-[var(--muted)] hover:bg-[var(--chip)]"
          >
            Cancel
          </button>
        </div>

        <label className="mb-4 block">
          <span className="mb-1.5 block text-sm font-medium">Daily calorie goal</span>
          <input
            type="number"
            min={500}
            max={8000}
            value={draft.dailyGoal}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, dailyGoal: Number(event.target.value) }))
            }
            className="w-full rounded-2xl border border-[var(--line)] bg-[var(--field)] px-4 py-3 text-base outline-none focus:border-[var(--accent)]"
          />
        </label>

        <label className="mb-2 block">
          <span className="mb-1.5 block text-sm font-medium">MiniMax API key</span>
          <div className="flex gap-2">
            <input
              type={showKey ? "text" : "password"}
              autoComplete="off"
              spellCheck={false}
              placeholder="Paste your MiniMax API key…"
              value={draft.apiKey}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, apiKey: event.target.value }))
              }
              className="min-w-0 flex-1 rounded-2xl border border-[var(--line)] bg-[var(--field)] px-4 py-3 font-mono text-sm outline-none focus:border-[var(--accent)]"
            />
            <button
              type="button"
              onClick={() => setShowKey((value) => !value)}
              className="rounded-full border border-[var(--line)] px-3 text-sm"
            >
              {showKey ? "Hide" : "Show"}
            </button>
          </div>
        </label>
        <p className="mb-3 text-xs leading-5 text-[var(--muted)]">
          Stored only in this browser. The key is sent as a Bearer token to MiniMax — not to an Apehealth server. Get a key at{" "}
          <a
            className="underline decoration-[var(--accent)] underline-offset-2"
            href="https://platform.minimax.io/user-center/basic-information/interface-key"
            target="_blank"
            rel="noreferrer"
          >
            platform.minimax.io
          </a>
          .
        </p>

        <label className="mb-4 flex items-start gap-3 rounded-2xl bg-[var(--chip)] px-3 py-3 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={draft.ephemeralKey}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, ephemeralKey: event.target.checked }))
            }
          />
          <span>
            Forget API key when this tab closes
            <span className="mt-0.5 block text-xs text-[var(--muted)]">
              Keeps the key in session storage instead of local storage.
            </span>
          </span>
        </label>

        <label className="mb-4 block">
          <span className="mb-1.5 block text-sm font-medium">API endpoint</span>
          <input
            type="url"
            value={draft.apiEndpoint}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, apiEndpoint: event.target.value }))
            }
            className="w-full rounded-2xl border border-[var(--line)] bg-[var(--field)] px-4 py-3 font-mono text-sm outline-none focus:border-[var(--accent)]"
          />
        </label>

        <label className="mb-6 block">
          <span className="mb-1.5 block text-sm font-medium">Model</span>
          <input
            list="apehealth-models"
            value={draft.model}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, model: event.target.value }))
            }
            className="w-full rounded-2xl border border-[var(--line)] bg-[var(--field)] px-4 py-3 font-mono text-sm outline-none focus:border-[var(--accent)]"
          />
          <datalist id="apehealth-models">
            {MODEL_PRESETS.map((model) => (
              <option key={model} value={model} />
            ))}
          </datalist>
        </label>

        <button
          type="submit"
          className="w-full rounded-full bg-[var(--accent)] py-3.5 text-base font-semibold text-[var(--accent-ink)]"
        >
          Save
        </button>
      </form>
    </div>
  );
}
