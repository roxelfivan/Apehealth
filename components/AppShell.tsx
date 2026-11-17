"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { GearIcon, HouseIcon, PlusIcon } from "@/components/icons";
import { APP_VERSION } from "@/lib/version";

type Props = {
  current: "home" | "add";
  title: string;
  subtitle?: string;
  onOpenSettings: () => void;
  children: ReactNode;
};

const navItem =
  "flex min-h-12 min-w-[4.5rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-medium text-[var(--muted)] transition-colors duration-200 hover:bg-[var(--chip)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]";

export function AppShell({ current, title, subtitle, onOpenSettings, children }: Props) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 lg:px-8 lg:pb-10">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:bg-[var(--card)] focus:px-3 focus:py-2 focus:ring-2 focus:ring-[var(--ring)]"
      >
        Skip to content
      </a>

      <header className="mb-5 flex items-center justify-between gap-3 lg:mb-8">
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
            <p className="mt-1 text-xs text-[var(--muted)]">v{APP_VERSION} · stays on this device</p>
          ) : null}
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          {current !== "add" ? (
            <Link href="/add" className="btn-primary">
              <PlusIcon className="h-5 w-5" />
              Add meal
            </Link>
          ) : (
            <Link href="/" className="btn-secondary">
              <HouseIcon className="h-5 w-5" />
              Today
            </Link>
          )}
          <button type="button" className="btn-secondary" onClick={onOpenSettings}>
            <GearIcon className="h-5 w-5" />
            Settings
          </button>
        </div>

        {current === "add" ? (
          <Link href="/" className="btn-icon lg:hidden" aria-label="Back to today">
            <HouseIcon className="h-5 w-5" />
          </Link>
        ) : (
          <span className="lg:hidden" aria-hidden="true" />
        )}
      </header>

      <main id="main" className="flex min-h-0 flex-1 flex-col">
        {children}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--line)] bg-[color-mix(in_srgb,var(--card)_92%,transparent)] px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md lg:hidden"
        aria-label="Primary"
      >
        <div className="mx-auto flex max-w-md items-end gap-1">
          <Link
            href="/"
            className={`${navItem} ${current === "home" ? "bg-[var(--chip)] text-[var(--foreground)]" : ""}`}
            aria-current={current === "home" ? "page" : undefined}
          >
            <HouseIcon className="h-6 w-6" />
            Today
          </Link>
          <Link
            href="/add"
            className="relative -mt-5 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-ink)] shadow-[0_10px_24px_rgba(184,122,24,0.35)] transition-[filter,transform] duration-200 hover:brightness-95 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
            aria-current={current === "add" ? "page" : undefined}
            aria-label="Add meal"
          >
            <PlusIcon className="h-7 w-7" />
          </Link>
          <button type="button" className={navItem} onClick={onOpenSettings}>
            <GearIcon className="h-6 w-6" />
            Settings
          </button>
        </div>
      </nav>
    </div>
  );
}
