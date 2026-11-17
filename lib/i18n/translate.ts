import { en, zhHant, type Dictionary } from "./dictionary";
import { DEFAULT_LOCALE, LOCALE_TAGS, type Locale } from "./locales";

export type { Locale } from "./locales";

const DICTIONARIES: Record<Locale, Dictionary> = {
  en,
  "zh-Hant": zhHant,
};

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
}

/** BCP 47 tag for `lang` attributes and `Intl` formatters. */
export function localeTag(locale: Locale): string {
  return LOCALE_TAGS[locale] ?? LOCALE_TAGS[DEFAULT_LOCALE];
}

export type TranslationPath = string;
export type TextParams = Record<string, string | number> | undefined;

/** Resolve a dotted path such as `home.overGoal` against a dictionary. */
function resolve(dictionary: Dictionary, path: TranslationPath): unknown {
  const segments = path.split(".");
  let current: unknown = dictionary;
  for (const segment of segments) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

const PLACEHOLDER = /\{(\w+)\}/g;

/**
 * Look up the raw template for a key, falling back to English so a missing
 * translation never renders as an empty string.
 */
export function rawTemplate(
  locale: Locale,
  path: TranslationPath,
): string | undefined {
  const value = resolve(getDictionary(locale), path);
  if (typeof value === "string") return value;
  const fallback = resolve(getDictionary(DEFAULT_LOCALE), path);
  return typeof fallback === "string" ? fallback : undefined;
}

function interpolate(template: string, params: TextParams): string {
  if (!params) return template;
  return template.replace(PLACEHOLDER, (match, key: string) => {
    const value = params[key];
    return value === undefined ? match : String(value);
  });
}

/**
 * Translate a dotted key for the given locale, falling back to English and
 * finally to the raw key so a missing string is always visible in the UI.
 */
export function translate(
  locale: Locale,
  path: TranslationPath,
  params?: TextParams,
): string {
  const template = rawTemplate(locale, path);
  return template === undefined ? path : interpolate(template, params);
}

export type Translator = (path: TranslationPath, params?: TextParams) => string;
