import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { PULSE_SEVERITY, type Pulse } from '../types';
import { PulseStatusDot } from './pulse-status-dot';

export type PulseDigestItem = {
  workspaceId: string;
  internName: string;
  pulse: Pulse;
};

/**
 * Cross-workspace Pulse rollup for the supervisor dashboard — one compact row
 * per active intern, worst-first (lower PULSE_SEVERITY = more urgent). Each row
 * links to the company workspace overview.
 *
 * Server component. `headline` is already localized by the engine.
 */
export async function PulseDigest({
  items,
  locale,
}: {
  items: PulseDigestItem[];
  locale: string;
}) {
  const t = await getTranslations('pulse');

  // `localePrefix: 'as-needed'` — French (default) has no prefix, English is
  // /en (see i18n/routing.ts + components/language-switch.tsx).
  const hrefFor = (workspaceId: string) =>
    locale === 'en'
      ? `/en/company/workspaces/${workspaceId}`
      : `/company/workspaces/${workspaceId}`;

  const sorted = [...items].sort(
    (a, b) => PULSE_SEVERITY[a.pulse.status] - PULSE_SEVERITY[b.pulse.status],
  );

  return (
    <div className="db-card">
      <div className="db-card-head">
        <h3>{t('title')}</h3>
      </div>

      {sorted.length === 0 ? (
        <div className="db-tasks-empty">{t('empty')}</div>
      ) : (
        <div className="flex flex-col">
          {sorted.map(({ workspaceId, internName, pulse }) => (
            <Link
              key={workspaceId}
              href={hrefFor(workspaceId)}
              className="group flex items-center gap-3 py-2.5 border-b border-[var(--border-color)] last:border-b-0 hover:bg-[var(--surface-muted)] -mx-2 px-2 rounded transition-colors"
            >
              <PulseStatusDot status={pulse.status} />
              <span className="text-label font-medium text-[var(--ink)] flex-shrink-0">
                {internName}
              </span>
              <span className="text-caption text-[var(--ink-3)] truncate flex-1 min-w-0">
                {pulse.headline}
              </span>
              <span
                aria-hidden
                className="text-[var(--ink-3)] group-hover:text-[var(--brand-700)] flex-shrink-0"
              >
                →
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
