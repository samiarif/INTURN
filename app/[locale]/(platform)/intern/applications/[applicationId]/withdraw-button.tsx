'use client';

import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { withdrawApplicationAction } from '@/modules/applications/server-actions';

export function WithdrawButton({ applicationId }: { applicationId: string }) {
  const t = useTranslations('applications.detail');
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (!window.confirm(t('withdrawConfirm'))) return;
    startTransition(async () => {
      try {
        await withdrawApplicationAction(applicationId);
      } catch {
        // server redirects on success; any error surfaces here
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="text-caption text-[var(--ink-3)] hover:text-[var(--danger)] underline underline-offset-2 decoration-dotted disabled:opacity-60"
    >
      {t('withdraw')}
    </button>
  );
}
