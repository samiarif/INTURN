/**
 * Localize a stored compensation string for display.
 *
 * The internship row persists compensation as one English-canonical string,
 * e.g. "800 TND / month" — the unit is always one of COMPENSATION_UNITS in the
 * post-internship form ('TND / month' | 'TND / week' | 'EUR / month'). Only the
 * period token is language-specific; the amount and currency code are
 * locale-neutral. Mirrors lib/format-time.ts: a code-level FR/EN branch is the
 * accepted exemption from next-intl for these fixed unit tokens (the form's own
 * Select already localizes the *options* via internships.form.unit.*; this
 * covers the read-only display sites that interpolate the raw stored value).
 */
export function localizeCompensation(stored: string, locale: string): string {
  if (locale !== 'fr') return stored;
  return stored.replace(' / month', ' / mois').replace(' / week', ' / semaine');
}
