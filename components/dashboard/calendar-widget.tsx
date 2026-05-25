/**
 * Mini calendar — right-rail widget for the company dashboard.
 *
 * Renders a 7-column month grid (Sun-first). Cells:
 *   - prefix pad (last days of prior month, muted)
 *   - 1..N days of the current month
 *   - today highlighted with the brand fill
 *   - days that match an entry in `eventDates` get a small accent dot
 *   - suffix pad (first days of next month, muted) to fill 6 rows
 *
 * Server component — derives `today` from a passed-in `now` (so the parent
 * page controls the timezone / formatting) and renders pure markup.
 *
 * The labels (S M T W T F S, "May 2026") are passed in rather than localised
 * here so the parent can stay i18n-aware without us reaching for next-intl
 * inside a generic widget.
 */

type CalendarWidgetProps = {
  now: Date;
  /** Days (1-31) in the same month as `now` that should render a dot. */
  eventDays: number[];
  /** Pre-localised weekday initials, Sun-first. Length must be 7. */
  weekdayLabels: [string, string, string, string, string, string, string];
  /** Pre-localised header label, e.g. "May 2026". */
  monthLabel: string;
  /** Pre-localised eyebrow, defaults to "Calendar". */
  eyebrow?: string;
};

export function CalendarWidget({
  now,
  eventDays,
  weekdayLabels,
  monthLabel,
  eyebrow = 'Calendar',
}: CalendarWidgetProps) {
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  const today = now.getDate();

  // First-of-month and last day calculations (Sun = 0 … Sat = 6).
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastOfMonth.getDate();
  const startWeekday = firstOfMonth.getDay();

  // Prior month tail (for the prefix pad).
  const priorMonthLast = new Date(year, month, 0).getDate();
  const prefix: Array<{ d: number; muted: true }> = [];
  for (let i = startWeekday - 1; i >= 0; i--) {
    prefix.push({ d: priorMonthLast - i, muted: true });
  }

  // Current month days.
  const eventSet = new Set(eventDays);
  const body: Array<{ d: number; today?: boolean; event?: boolean }> = [];
  for (let d = 1; d <= daysInMonth; d++) {
    body.push({
      d,
      today: d === today,
      event: eventSet.has(d),
    });
  }

  // Suffix pad — fill up to 42 cells (6 rows × 7) for a stable layout.
  const filled = prefix.length + body.length;
  const suffix: Array<{ d: number; muted: true }> = [];
  const targetRows = Math.ceil(filled / 7);
  const total = targetRows * 7;
  for (let d = 1; filled + suffix.length < total; d++) {
    suffix.push({ d, muted: true });
  }

  return (
    <div className="db-cal">
      <h4>
        {eyebrow} <span className="month">{monthLabel}</span>
      </h4>
      <div className="db-cal-grid" role="grid" aria-label={monthLabel}>
        {weekdayLabels.map((h, i) => (
          <div className="h" role="columnheader" key={`h-${i}`}>
            {h}
          </div>
        ))}
        {prefix.map((cell, i) => (
          <div className="d muted" key={`p-${i}`} aria-hidden>
            {cell.d}
          </div>
        ))}
        {body.map((cell) => (
          <div
            key={`b-${cell.d}`}
            className={`d${cell.today ? ' today' : ''}${cell.event ? ' event' : ''}`}
            aria-current={cell.today ? 'date' : undefined}
          >
            {cell.d}
          </div>
        ))}
        {suffix.map((cell, i) => (
          <div className="d muted" key={`s-${i}`} aria-hidden>
            {cell.d}
          </div>
        ))}
      </div>
    </div>
  );
}
