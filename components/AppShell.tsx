"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { AppLogo } from "@/components/AppLogo";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { ChartIcon, GearIcon, HouseIcon, PlusIcon } from "@/components/icons";
import { useTranslator } from "@/lib/i18n/useTranslator";
import { APP_VERSION } from "@/lib/version";

type Props = {
  current: "home" | "add" | "history";
  title: string;
  subtitle?: string;
  onOpenSettings: () => void;
  children: ReactNode;
};

const navItem =
  "flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-[11px] font-medium text-[var(--muted)] transition-colors duration-200 hover:bg-[var(--chip)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]";

export function AppShell({ current, title, subtitle, onOpenSettings, children }: Props) {
  const { t } = useTranslator();

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 lg:px-8 lg:pb-10">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-[var(--card)] focus:px-3 focus:py-2 focus:ring-2 focus:ring-[var(--ring)]"
      >
        {t("nav.skipToContent")}
      </a>

      <header className="mb-5 flex items-center justify-between gap-3 lg:mb-8">
        <div className="flex min-w-0 items-center gap-3">
          {current === "home" ? <AppLogo className="h-11 w-auto shrink-0 select-none" /> : null}
          <div className="min-w-0">
            {subtitle ? (
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--muted)]">
                {subtitle}
              </p>
            ) : null}
            <h1 className="font-[family-name:var(--font-display)] text-[1.85rem] leading-none tracking-tight sm:text-[2.15rem]">
              {title}
            </h1>
            {current === "home" ? (
              <p className="mt-1 text-xs text-[var(--muted)]">
                {t("home.versionNote", { version: APP_VERSION })}
              </p>
            ) : null}
          </div>
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <LanguageSwitch />
          {current !== "history" ? (
            <Link href="/history" className="btn-secondary">
              <ChartIcon className="h-5 w-5" />
              {t("nav.history")}
            </Link>
          ) : (
            <Link href="/" className="btn-secondary">
              <HouseIcon className="h-5 w-5" />
              {t("nav.today")}
            </Link>
          )}
          {current !== "add" ? (
            <Link href="/add" className="btn-primary">
              <PlusIcon className="h-5 w-5" />
              {t("nav.addMeal")}
            </Link>
          ) : null}
          <button type="button" className="btn-secondary" onClick={onOpenSettings}>
            <GearIcon className="h-5 w-5" />
            {t("nav.settings")}
          </button>
        </div>
      </header>

      <main id="main" className="flex min-h-0 flex-1 flex-col">
        {children}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--line)] bg-[color-mix(in_srgb,var(--card)_92%,transparent)] px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md lg:hidden"
        aria-label={t("nav.primary")}
      >
        <div className="mx-auto flex max-w-lg items-end gap-1">
          <Link
            href="/"
            className={`${navItem} ${current === "home" ? "bg-[var(--chip)] text-[var(--foreground)]" : ""}`}
            aria-current={current === "home" ? "page" : undefined}
          >
            <HouseIcon className="h-6 w-6" />
            {t("nav.today")}
          </Link>
          <Link
            href="/history"
            className={`${navItem} ${current === "history" ? "bg-[var(--chip)] text-[var(--foreground)]" : ""}`}
            aria-current={current === "history" ? "page" : undefined}
          >
            <ChartIcon className="h-6 w-6" />
            {t("nav.history")}
          </Link>
          <Link
            href="/add"
            className="relative -mt-5 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-ink)] shadow-[0_10px_24px_rgba(184,122,24,0.35)] transition-[filter,transform] duration-200 hover:brightness-95 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
            aria-current={current === "add" ? "page" : undefined}
            aria-label={t("nav.addMeal")}
          >
            <PlusIcon className="h-7 w-7" />
          </Link>
          <LanguageSwitch compact />
          <button type="button" className={navItem} onClick={onOpenSettings}>
            <GearIcon className="h-6 w-6" />
            {t("nav.settings")}
          </button>
        </div>
      </nav>
    </div>
  );
}
