import type { ReactNode } from 'react';
import type { Pulse } from '../types';
import { PulseStatusDot } from './pulse-status-dot';

/**
 * The inner Pulse read — status eyebrow + headline + why + evidence + action.
 * Pure/presentational (no data fetching, no hooks, no 'use client'), so the
 * SAME markup renders inside the server `PulseCard` (workspace rail) AND the
 * client `PulseDigestRow` popover (dashboard) — they can never visually drift.
 * Labels are passed in (resolved by each parent via getTranslations /
 * useTranslations); `trailing` is an optional slot in the eyebrow (e.g. Refresh).
 */
export function PulseBody({
  pulse,
  statusLabel,
  basedOnLabel,
  trailing,
}: {
  pulse: Pulse;
  statusLabel: string;
  basedOnLabel: string;
  trailing?: ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="flex items-center justify-between gap-3">
        <PulseStatusDot status={pulse.status} label={statusLabel} />
        {trailing ? <div className="flex items-center gap-2">{trailing}</div> : null}
      </div>

      <p className="text-[14px] font-semibold leading-snug text-[var(--ink)]">{pulse.headline}</p>

      {pulse.why ? (
        <p className="text-[12.5px] leading-relaxed text-[var(--ink-2)]">{pulse.why}</p>
      ) : null}

      {pulse.evidence.length > 0 ? (
        <p className="text-[11.5px] leading-relaxed text-[var(--ink-3)]">
          {basedOnLabel} {pulse.evidence.join(' · ')}
        </p>
      ) : null}

      <p className="text-[12.5px] font-medium leading-snug text-[var(--brand-700)]">{pulse.action}</p>
    </div>
  );
}
