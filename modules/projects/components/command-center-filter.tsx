'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PulseStatusDot } from '@/modules/pulse/components/pulse-status-dot';
import type { Pulse } from '@/modules/pulse/types';

/**
 * One intern's slice of the project: their Pulse read, their deliverables, and
 * a task tally. Plain JSON (the `pulse` payload is already serialized by the
 * engine) so the server command center can hand it straight to this client
 * component.
 */
export type CommandCenterLane = {
  workspaceId: string;
  internName: string;
  pulse: Pulse | null;
  deliverables: Array<{
    title: string;
    status: string;
    /**
     * True when this deliverable has at least one upstream dependency whose
     * status is not 'approved' — the cross-project "stuck flow" signal. The
     * lane chip shows a lock + a waiting hint. Awareness only; never gates.
     */
    blocked?: boolean;
    /** Title of an upstream this deliverable is waiting on (for the hint). */
    waitingOn?: string;
  }>;
  tasks: { done: number; total: number };
};

// Deliverable status → the shared `.pill .pill-*` chip classes (workspace.css /
// deliverables-mini.tsx). Keeps the lane chips colour-aligned with the rest of
// the product instead of inventing a new palette here.
const DELIV_PILL: Record<string, string> = {
  draft: 'pill-todo',
  submitted: 'pill-review',
  approved: 'pill-done',
  'revision-requested': 'pill-block',
};

/**
 * The interactive layer of the command center: an all-interns ↔ one-intern
 * filter over a static set of lanes. Selecting a pill narrows the view to that
 * lane; "All" restores everyone. Filtering is purely client-side over props —
 * no refetch, no URL state.
 */
export function CommandCenterFilter({
  lanes,
  locale,
}: {
  lanes: CommandCenterLane[];
  locale: string;
}) {
  const t = useTranslations('projectHub.commandCenter');
  const tPulse = useTranslations('pulse');
  const [selected, setSelected] = useState<string | null>(null); // workspaceId | null = all

  // `localePrefix: 'as-needed'` — French (default) has no prefix, English is
  // /en (see i18n/routing.ts). Mirrors PulseDigest's hrefFor.
  const hrefFor = (workspaceId: string) =>
    locale === 'en'
      ? `/en/company/workspaces/${workspaceId}`
      : `/company/workspaces/${workspaceId}`;

  const visible = selected ? lanes.filter((l) => l.workspaceId === selected) : lanes;

  return (
    <div className="flex flex-col gap-3">
      {/* ----- Filter pills ----- */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setSelected(null)}
          aria-pressed={selected === null}
          className={
            'inline-flex items-center h-7 px-2.5 rounded-full text-label font-medium border transition-colors ' +
            (selected === null
              ? 'bg-[var(--brand-500)] text-white border-[var(--brand-500)]'
              : 'bg-[var(--surface)] text-[var(--ink-2)] border-[var(--border-color)] hover:border-[var(--border-strong)]')
          }
        >
          {t('filterAll')}
        </button>
        {lanes.map((lane) => {
          const active = selected === lane.workspaceId;
          return (
            <button
              key={lane.workspaceId}
              type="button"
              onClick={() => setSelected(active ? null : lane.workspaceId)}
              aria-pressed={active}
              className={
                'inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-label font-medium border transition-colors ' +
                (active
                  ? 'bg-[var(--brand-500)] text-white border-[var(--brand-500)]'
                  : 'bg-[var(--surface)] text-[var(--ink-2)] border-[var(--border-color)] hover:border-[var(--border-strong)]')
              }
            >
              {lane.pulse && <PulseStatusDot status={lane.pulse.status} />}
              {lane.internName}
            </button>
          );
        })}
      </div>

      {/* ----- Lanes ----- */}
      <div className="flex flex-col gap-2.5">
        {visible.map((lane) => (
          <div
            key={lane.workspaceId}
            className="rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--surface)] p-4"
          >
            <div className="flex items-start gap-3 flex-wrap">
              {/* Intern + Pulse status */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href={hrefFor(lane.workspaceId)}
                    className="text-label font-semibold text-[var(--ink)] hover:text-[var(--brand-700)] hover:underline"
                  >
                    {lane.internName}
                  </Link>
                  {lane.pulse && (
                    <PulseStatusDot
                      status={lane.pulse.status}
                      label={tPulse(`status.${lane.pulse.status}`)}
                    />
                  )}
                </div>
                {lane.pulse?.headline && (
                  <p className="mt-1 text-caption text-[var(--ink-3)] leading-snug">
                    {lane.pulse.headline}
                  </p>
                )}
              </div>

              {/* Task tally */}
              <div className="text-caption text-[var(--ink-3)] font-mono whitespace-nowrap pt-0.5">
                {t('tasksCount', { done: lane.tasks.done, total: lane.tasks.total })}
              </div>
            </div>

            {/* Deliverable chips */}
            {lane.deliverables.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {lane.deliverables.map((d, i) => (
                  <span
                    key={`${lane.workspaceId}-${i}`}
                    className={`pill ${DELIV_PILL[d.status] ?? 'pill-todo'}`}
                    title={
                      d.blocked && d.waitingOn
                        ? t('blockedHint', { title: d.waitingOn })
                        : d.status
                    }
                  >
                    {d.blocked ? (
                      <span aria-hidden className="leading-none">
                        🔒
                      </span>
                    ) : (
                      <span className="dot" />
                    )}
                    {d.title}
                    {d.blocked && (
                      <span className="ml-1 text-[var(--ink-4)] font-normal">
                        · {t('blockedShort')}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
