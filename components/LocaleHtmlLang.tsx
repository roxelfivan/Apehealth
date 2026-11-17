"use client";

import { useEffect } from "react";
import { localeTag } from "@/lib/i18n";
import { useLocale } from "@/lib/i18n/useTranslator";

/**
 * Keeps `document.documentElement.lang` in sync with the selected locale so
 * screen readers, browser translation prompts and `Intl` formatting follow
 * the user's language choice.
 */
export function LocaleHtmlLang() {
  const locale = useLocale();

  useEffect(() => {
    const tag = localeTag(locale);
    document.documentElement.lang = tag;
    document.documentElement.setAttribute("lang", tag);
  }, [locale]);

  return null;
}
