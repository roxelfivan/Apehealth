"use client";

import { useEffect, useRef, useState } from "react";
import { GlobeIcon } from "@/components/icons";
import {
  LOCALE_NAMES,
  LOCALES,
  localeTag,
  type Locale,
} from "@/lib/i18n";
import { useTranslator } from "@/lib/i18n/useTranslator";
import { saveSettings } from "@/lib/storage";
import { useSettings } from "@/lib/store";

type Props = {
  /** Stacked icon + label, matching the other bottom-nav items. */
  compact?: boolean;
  className?: string;
};

/**
 * Language switch button. Selecting a locale persists it to localStorage and
 * updates `document.documentElement.lang` so screen readers and `Intl`
 * formatting follow the user's choice.
 */
export function LanguageSwitch({ compact = false, className }: Props) {
  const settings = useSettings();
  const { t } = useTranslator();
  const locale = settings.locale;
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent | TouchEvent) {
      const node = containerRef.current;
      if (!node) return;
      if (event.target instanceof Node && node.contains(event.target)) return;
      setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function choose(next: Locale) {
    // Persist the whole settings object so the store re-renders immediately
    // with the new locale, then close the menu.
    saveSettings({ ...settings, locale: next });
    setOpen(false);
    buttonRef.current?.focus();
  }

  const label = LOCALE_NAMES[locale];

  return (
    <div
      ref={containerRef}
      className={`relative ${compact ? "min-w-0 flex-1" : ""} ${className ?? ""}`}
    >
      <button
        ref={buttonRef}
        type="button"
        className={
          compact
            ? `flex min-h-12 w-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-[11px] font-medium transition-colors duration-200 hover:bg-[var(--chip)] hover:text-[var(--foreground)] ${
                open ? "bg-[var(--chip)] text-[var(--foreground)]" : "text-[var(--muted)]"
              }`
            : "btn-secondary h-11 px-3 text-sm"
        }
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${t("common.language")}: ${LOCALE_NAMES[locale]}`}
        lang={localeTag(locale)}
        onClick={() => setOpen((value) => !value)}
      >
        <GlobeIcon className={compact ? "h-6 w-6" : "h-5 w-5"} />
        {compact ? t("common.language") : <span>{label}</span>}
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Language"
          className={`absolute z-50 mt-2 min-w-40 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--card)] p-1 shadow-2xl ${
            // The compact switch lives in the fixed bottom nav, so its menu
            // opens upward to stay on screen.
            compact ? "bottom-full right-0 mb-2 mt-0" : "right-0 top-full"
          }`}
        >
          {LOCALES.map((option) => (
            <button
              key={option}
              type="button"
              role="menuitemradio"
              aria-checked={option === locale}
              lang={localeTag(option)}
              className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 text-left text-sm transition-colors duration-200 ${
                option === locale
                  ? "bg-[var(--chip)] font-semibold text-[var(--foreground)]"
                  : "text-[var(--muted)] hover:bg-[var(--chip)] hover:text-[var(--foreground)]"
              }`}
              onClick={() => choose(option)}
            >
              <span>{LOCALE_NAMES[option]}</span>
              {option === locale ? (
                <span aria-hidden className="text-[var(--accent)]">
                  ✓
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
