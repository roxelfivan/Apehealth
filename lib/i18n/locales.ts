export const LOCALES = ["en", "zh-Hant"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** BCP 47 tags used for the `lang` attribute and `Intl` formatters. */
export const LOCALE_TAGS: Record<Locale, string> = {
  en: "en",
  "zh-Hant": "zh-Hant",
};

/** Endonyms shown on the language switch button. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  "zh-Hant": "繁體中文",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * Best-effort match of a BCP 47 tag list to a supported locale.
 * `zh-TW`, `zh-HK`, `zh-Hant-*` all resolve to Traditional Chinese.
 */
export function matchLocale(tags: readonly string[]): Locale | null {
  for (const tag of tags) {
    if (!tag) continue;
    const lower = tag.toLowerCase();
    if (lower === "zh-hant" || lower.startsWith("zh-hant-")) return "zh-Hant";
    if (
      lower === "zh-tw" ||
      lower === "zh-hk" ||
      lower === "zh-mo" ||
      lower.startsWith("zh-tw-") ||
      lower.startsWith("zh-hk-") ||
      lower.startsWith("zh-mo-")
    ) {
      return "zh-Hant";
    }
    if (lower === "zh" || lower.startsWith("zh-")) continue;
    if (lower === "en" || lower.startsWith("en-")) return "en";
  }
  return null;
}
