'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { refreshPulseAction } from '../server-actions';

/**
 * Re-runs the Pulse analysis for one workspace. Calls the server action (which
 * revalidates the pages that render the Pulse) inside a transition, then
 * router.refresh() to pull the freshly-computed verdict. Disabled + spinner
 * while pending.
 */
export function RefreshPulseButton({ workspaceId }: { workspaceId: string }) {
  const t = useTranslations('pulse');
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await refreshPulseAction(workspaceId);
          router.refresh();
        })
      }
      className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-[var(--ink-3)] hover:text-[var(--ink)] disabled:opacity-60 disabled:cursor-default transition-colors"
    >
      <span
        aria-hidden
        className={pending ? 'animate-spin' : ''}
        style={{
          width: 11,
          height: 11,
          borderRadius: 999,
          border: '1.5px solid currentColor',
          borderTopColor: pending ? 'transparent' : 'currentColor',
          display: 'inline-block',
        }}
      />
      {pending ? t('refreshing') : t('refresh')}
    </button>
  );
}
