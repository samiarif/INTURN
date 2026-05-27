/**
 * Single source of truth for "time ago" / relative-time formatting.
 * Replaces three near-duplicate implementations that lived in:
 *   - modules/workspace/components/rail-supervisor.tsx (hoursAgo +
 *     formatHoursAgo)
 *   - app/[locale]/(platform)/intern/community/page.tsx (timeAgo)
 *   - app/[locale]/(platform)/company/projects/[projectId]/page.tsx
 *     (formatRelative)
 *
 * Use `formatTimeAgo` for human-friendly "5m ago" / "il y a 5 min"
 * strings and `formatDateShort` / `formatDateLong` for absolute dates.
 */

const MS_PER_MIN = 60_000;
const MS_PER_HOUR = MS_PER_MIN * 60;
const MS_PER_DAY = MS_PER_HOUR * 24;

export type FormatLocale = 'fr' | 'en';

export function formatTimeAgo(date: Date | string, locale: FormatLocale = 'fr'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '—';
  const diff = Date.now() - d.getTime();
  if (diff < 0) return locale === 'fr' ? 'à l’instant' : 'just now';

  const mins = Math.floor(diff / MS_PER_MIN);
  if (mins < 1) return locale === 'fr' ? 'à l’instant' : 'just now';
  if (mins < 60) return locale === 'fr' ? `il y a ${mins} min` : `${mins}m ago`;

  const hours = Math.floor(diff / MS_PER_HOUR);
  if (hours < 24) return locale === 'fr' ? `il y a ${hours} h` : `${hours}h ago`;

  const days = Math.floor(diff / MS_PER_DAY);
  if (days < 7) return locale === 'fr' ? `il y a ${days} j` : `${days}d ago`;

  // Fall back to a short date for anything older than a week.
  return formatDateShort(d, locale);
}

/**
 * "12 Jan" / "12 janv." — short date, no year. Use in dense lists and
 * activity feeds.
 */
export function formatDateShort(date: Date | string | null, locale: FormatLocale = 'fr'): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
    day: '2-digit',
    month: 'short',
  });
}

/**
 * "12 January 2026" / "12 janvier 2026" — full date with year.
 * Use in headers, records, and detail screens.
 */
export function formatDateLong(date: Date | string | null, locale: FormatLocale = 'fr'): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Hours-since helper for "quiet flag" type computations where the caller
 * wants the raw number, not a string.
 */
export function hoursSince(date: Date | string): number {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return 0;
  return Math.floor((Date.now() - d.getTime()) / MS_PER_HOUR);
}
