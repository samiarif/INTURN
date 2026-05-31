import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import type { Pulse } from '../types';
import { PulseBody } from './pulse-body';

/**
 * The Pulse read in the workspace rail. Wraps the shared `PulseBody` in the
 * card chrome and feeds the optional `refresh` slot into the eyebrow. The body
 * strings (headline / why / evidence / action) are already localized by the
 * engine; only the static status + "based on" labels go through next-intl.
 *
 * Server component.
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
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-4">
      <PulseBody
        pulse={pulse}
        statusLabel={t(`status.${pulse.status}`)}
        basedOnLabel={t('basedOn')}
        trailing={
          <>
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
          </>
        }
      />
    </div>
  );
}
