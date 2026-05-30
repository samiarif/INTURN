import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import type { Pulse } from '../types';
import { PulseStatusDot } from './pulse-status-dot';

/**
 * The Pulse read on one internship — the AI co-supervisor card in the workspace
 * rail. `headline` / `why` / `evidence` / `action` are already localized by the
 * engine, so they render verbatim; only the static "based on" label goes through
 * next-intl.
 *
 * Server component. `refresh` is an optional slot (the RefreshPulseButton).
 */
export async function PulseCard({
  pulse,
  refresh,
}: {
  pulse: Pulse;
  refresh?: ReactNode;
}) {
  const t = await getTranslations('pulse');

  return (
    <div
      className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-4"
      style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
    >
      {/* Eyebrow: status dot + label, refresh slot pinned right. */}
      <div className="flex items-center justify-between gap-3">
        <PulseStatusDot status={pulse.status} label={t(`status.${pulse.status}`)} />
        <div className="flex items-center gap-2">
          {pulse.source === 'heuristic' && (
            <span
              aria-hidden
              title="auto"
              className="text-[10px] font-mono uppercase tracking-wider text-[var(--ink-4)]"
            >
              —
            </span>
          )}
          {refresh}
        </div>
      </div>

      {/* Headline — the one-line verdict. */}
      <p className="text-[14.5px] font-semibold leading-snug text-[var(--ink)]">
        {pulse.headline}
      </p>

      {/* Why — the reasoning. */}
      {pulse.why && (
        <p className="text-[12.5px] leading-relaxed text-[var(--ink-2)]">{pulse.why}</p>
      )}

      {/* Evidence — the "based on …" line, small + muted. */}
      {pulse.evidence.length > 0 && (
        <p className="text-[11.5px] leading-relaxed text-[var(--ink-3)]">
          {t('basedOn')} {pulse.evidence.join(' · ')}
        </p>
      )}

      {/* Action — the CTA, emphasized. */}
      <p className="text-[12.5px] font-medium leading-snug text-[var(--brand-700)]">
        {pulse.action}
      </p>
    </div>
  );
}
