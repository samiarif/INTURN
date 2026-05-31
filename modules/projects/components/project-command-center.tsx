import { getTranslations } from 'next-intl/server';
import { PulseStatusDot } from '@/modules/pulse/components/pulse-status-dot';
import { PULSE_STATUSES, type PulseStatus } from '@/modules/pulse/types';
import { CommandCenterFilter, type CommandCenterLane } from './command-center-filter';

export type { CommandCenterLane } from './command-center-filter';

/**
 * Project Command Center (Phase 1, view-only) — the supervisor's one-screen
 * cross-intern read on a project. Aggregates data already loaded by the project
 * hub: per-intern Pulse, deliverables, and a task tally, rolled up into a single
 * status line plus a lane per intern. No new tables; pure projection.
 *
 * Server component: resolves the static labels + the roll-up summary, then hands
 * the (already JSON-safe) lanes to the client `CommandCenterFilter` for the
 * all-interns ↔ one-intern interaction.
 *
 * `lanes` are expected pre-sorted worst-Pulse-first by the caller (PULSE_SEVERITY).
 */
export async function ProjectCommandCenter({
  lanes,
  phaseLabel,
  locale,
  editor,
}: {
  lanes: CommandCenterLane[];
  phaseLabel: string | null;
  locale: string;
  /**
   * Supervisor-only dependency editor trigger (the ManageDependenciesDialog
   * client component), rendered in the header. Passed from the project hub so
   * this server component stays data-agnostic. Omitted for non-managers.
   */
  editor?: React.ReactNode;
}) {
  const t = await getTranslations('projectHub.commandCenter');

  // Tally Pulse statuses across the active lanes for the roll-up line. Display
  // order is fixed (on-track → attention → at-risk → too-early); a bucket only
  // shows once it has at least one intern so the line stays tight.
  const counts: Record<PulseStatus, number> = {
    'on-track': 0,
    attention: 0,
    'at-risk': 0,
    'too-early': 0,
  };
  for (const lane of lanes) {
    if (lane.pulse) counts[lane.pulse.status] += 1;
  }
  const shownStatuses = PULSE_STATUSES.filter((s) => counts[s] > 0);

  return (
    <section className="db-card">
      <div className="db-card-head">
        <h3>{t('title')}</h3>
        {/* Roll-up summary: phase · N interns · 🟢 2 · 🟡 1 · 🔴 0 */}
        <span className="sub ml-auto flex items-center gap-2 flex-wrap justify-end">
          {phaseLabel && (
            <>
              <span>{phaseLabel}</span>
              <span aria-hidden>·</span>
            </>
          )}
          <span>{t('internsCount', { count: lanes.length })}</span>
          {shownStatuses.map((s) => (
            <span key={s} aria-hidden className="inline-flex items-center gap-1">
              <span aria-hidden>·</span>
              <PulseStatusDot status={s} />
              {counts[s]}
            </span>
          ))}
        </span>
        {editor ? <div className="ml-2 shrink-0">{editor}</div> : null}
      </div>

      {lanes.length === 0 ? (
        <div className="text-center py-8 text-caption text-[var(--ink-3)]">{t('empty')}</div>
      ) : (
        <CommandCenterFilter lanes={lanes} locale={locale} />
      )}
    </section>
  );
}
