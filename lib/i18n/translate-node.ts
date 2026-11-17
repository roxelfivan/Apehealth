import { createElement, Fragment, type ReactNode } from "react";
import { type Locale } from "./locales";
import { rawTemplate, type TranslationPath } from "./translate";

type NodeParams = Record<string, string | number | ReactNode> | undefined;

const PLACEHOLDER = /\{(\w+)\}/g;

/**
 * Like `translate`, but the result may contain React nodes so a translation
 * can embed a link or other rich content.
 */
export function translateNode(
  locale: Locale,
  path: TranslationPath,
  params?: NodeParams,
): ReactNode {
  const raw = rawTemplate(locale, path);
  if (raw === undefined) return path;
  if (!params) return raw;

  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIndex = 0;
  const pattern = new RegExp(PLACEHOLDER.source, "g");
  while ((match = pattern.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      parts.push(raw.slice(lastIndex, match.index));
    }
    const value = params[match[1]];
    if (value === undefined) {
      parts.push(match[0]);
    } else if (typeof value === "string" || typeof value === "number") {
      parts.push(String(value));
    } else {
      // Keys are required for every child of an array.
      parts.push(createElement(Fragment, { key: `i18n-${keyIndex}` }, value));
    }
    keyIndex += 1;
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < raw.length) parts.push(raw.slice(lastIndex));
  return parts.length === 1 ? parts[0] : parts;
}
