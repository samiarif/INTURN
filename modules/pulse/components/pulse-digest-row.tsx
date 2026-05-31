'use client';

import Link from 'next/link';
import { ChevronDown, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PulseStatusDot } from './pulse-status-dot';
import { PulseBody } from './pulse-body';
import type { Pulse } from '../types';

/**
 * One dashboard digest row. The compact row is the popover trigger; clicking it
 * reveals the full Pulse read (why · evidence · action) inline — so a supervisor
 * gets the whole picture without leaving the dashboard — plus a link into the
 * workspace when they want to act. `'use client'` for the popover interaction;
 * `pulse` is plain JSON, safe to pass from the server digest.
 */
export function PulseDigestRow({
  internName,
  pulse,
  href,
}: {
  internName: string;
  pulse: Pulse;
  href: string;
}) {
  const t = useTranslations('pulse');

  return (
    <Popover>
      <PopoverTrigger className="group flex w-full items-center gap-3 -mx-2 px-2 py-2.5 rounded text-left border-b border-[var(--border-color)] last:border-b-0 hover:bg-[var(--surface-muted)] cursor-pointer transition-colors">
        <PulseStatusDot status={pulse.status} />
        <span className="text-label font-medium text-[var(--ink)] flex-shrink-0">{internName}</span>
        <span className="text-caption text-[var(--ink-3)] truncate flex-1 min-w-0">{pulse.headline}</span>
        <ChevronDown
          size={15}
          strokeWidth={2}
          aria-hidden
          className="text-[var(--ink-4)] flex-shrink-0 transition-transform group-data-[popup-open]:rotate-180"
        />
      </PopoverTrigger>

      <PopoverContent align="start" sideOffset={6} className="w-[min(20rem,calc(100vw-2rem))]">
        <PulseBody pulse={pulse} statusLabel={t(`status.${pulse.status}`)} basedOnLabel={t('basedOn')} />
        <Link
          href={href}
          className="mt-0.5 inline-flex items-center gap-1 text-[12px] font-medium text-[var(--brand-700)] hover:underline"
        >
          {t('openWorkspace')}
          <ArrowRight size={13} strokeWidth={2.25} aria-hidden />
        </Link>
      </PopoverContent>
    </Popover>
  );
}
