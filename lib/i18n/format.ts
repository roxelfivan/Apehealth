import { localeTag, type Locale } from "./index";

/** `Tue, Nov 17` style day label rendered in the active locale. */
export function formatDayLabel(locale: Locale, day: string): string {
  if (!day) return "";
  const date = new Date(`${day}T12:00:00`);
  if (Number.isNaN(date.getTime())) return day;
  return date.toLocaleDateString(localeTag(locale), {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** `7:05 PM` style time label rendered in the active locale. */
export function formatTimeLabel(locale: Locale, iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleTimeString(localeTag(locale), {
    hour: "numeric",
    minute: "2-digit",
  });
}
