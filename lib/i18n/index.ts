export {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_NAMES,
  LOCALE_TAGS,
  matchLocale,
} from "./locales";
export type { Locale } from "./locales";

export {
  getDictionary,
  localeTag,
  rawTemplate,
  translate,
} from "./translate";
export type { TextParams, TranslationPath, Translator } from "./translate";

export { translateNode } from "./translate-node";
