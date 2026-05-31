import { getTranslations } from 'next-intl/server';
import { PULSE_SEVERITY, type Pulse } from '../types';
import { PulseDigestRow } from './pulse-digest-row';

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
            <PulseDigestRow
              key={workspaceId}
              internName={internName}
              pulse={pulse}
              href={hrefFor(workspaceId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
