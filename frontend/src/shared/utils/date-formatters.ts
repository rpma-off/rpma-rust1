/**
 * Shared date/time formatting utilities — fr-FR locale.
 *
 * All functions accept a broad `DateInput` type and handle null / undefined
 * gracefully, returning a configurable fallback string (default: '—').
 *
 * Use these instead of inline `new Date(x).toLocale*()` calls in components.
 */

export type DateInput = string | Date | number | null | undefined;

const LOCALE = "fr-FR";
const DEFAULT_EMPTY = "—";

/** Convert any DateInput to a valid Date, or null on failure. */
function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === "") return null;
  try {
    const d =
      value instanceof Date
        ? value
        : new Date(typeof value === "number" ? value : String(value));
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

/**
 * Short date: "15 jan. 2024"
 * Use for entity created_at / updated_at fields displayed in cards and lists.
 */
export function formatDate(
  date: DateInput,
  fallback: string = DEFAULT_EMPTY,
): string {
  const d = toDate(date);
  if (!d) return fallback;
  return d.toLocaleDateString(LOCALE, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Date + time: "15 jan. 2024, 14:30"
 * Use for timestamps that need both date and time (activity logs, session info).
 */
export function formatDateTime(
  date: DateInput,
  fallback: string = DEFAULT_EMPTY,
): string {
  const d = toDate(date);
  if (!d) return fallback;
  return d.toLocaleString(LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Date + time without year: "15 jan. 14:30"
 * Use for timeline/compact displays where the year is implicit.
 */
export function formatDateTimeShort(
  date: DateInput,
  fallback: string = DEFAULT_EMPTY,
): string {
  const d = toDate(date);
  if (!d) return fallback;
  return d.toLocaleString(LOCALE, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Compact date + time: "15/01/2024 14:30"
 * Use where horizontal space is limited (attachment tables, form fields).
 */
export function formatDateTimeCompact(
  date: DateInput,
  fallback: string = DEFAULT_EMPTY,
): string {
  const d = toDate(date);
  if (!d) return fallback;
  return d.toLocaleDateString(LOCALE, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Time only: "14:30"
 * Use for start_time / end_time fields.
 * Returns 'Non défini' when the value is absent, 'Heure invalide' on parse error.
 */
export function formatTime(
  time: DateInput,
  fallback: string = "Non défini",
): string {
  const d = toDate(time);
  if (!d) return fallback;
  try {
    return d.toLocaleTimeString(LOCALE, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "Heure invalide";
  }
}

/**
 * Relative date: "Aujourd'hui" | "Demain" | "lundi 15 janvier"
 * Use for calendar agenda-style date headers.
 */
export function formatRelativeDate(
  dateString: string,
  fallback: string = DEFAULT_EMPTY,
): string {
  const date = toDate(dateString);
  if (!date) return fallback;

  const utcDate = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );

  const now = new Date();
  const utcToday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );

  const utcTomorrow = new Date(utcToday);
  utcTomorrow.setUTCDate(utcToday.getUTCDate() + 1);

  if (utcDate.getTime() === utcToday.getTime()) return "Aujourd'hui";
  if (utcDate.getTime() === utcTomorrow.getTime()) return "Demain";

  return new Intl.DateTimeFormat(LOCALE, {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(utcDate);
}

/**
 * Long date with weekday: "lundi 15 janvier 2024"
 * Use for day-view headers and full date displays.
 */
export function formatDateLong(
  date: DateInput,
  fallback: string = DEFAULT_EMPTY,
): string {
  const d = toDate(date);
  if (!d) return fallback;
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}
