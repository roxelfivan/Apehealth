"use client";

import { useMemo, type ReactNode } from "react";
import { translateNode } from "./translate-node";
import { translate, type Locale } from "./translate";
import { useSettings } from "../store";

/**
 * Locale-aware translator bound to the user's saved language preference.
 * Re-renders whenever the persisted locale changes.
 */
export function useTranslator(): {
  locale: Locale;
  t: (path: string, params?: Record<string, string | number>) => string;
  tn: (
    path: string,
    params?: Record<string, string | number | ReactNode>,
  ) => ReactNode;
} {
  const settings = useSettings();
  const locale = settings.locale;
  const t = useMemo(() => translate.bind(null, locale), [locale]);
  const tn = useMemo(() => translateNode.bind(null, locale), [locale]);
  return { locale, t, tn };
}

export function useLocale(): Locale {
  return useSettings().locale;
}
