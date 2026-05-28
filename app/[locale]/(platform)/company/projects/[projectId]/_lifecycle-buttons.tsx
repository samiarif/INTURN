'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  closeInternshipAction,
  companyUnpublishInternshipAction,
} from '@/modules/internships/server-actions';

/**
 * Company-side lifecycle controls for a single internship row in the project
 * roster (S2-B). Sibling to _publish-button.tsx — same useTransition shape,
 * with a window.confirm gate (the codebase's established confirm pattern, see
 * withdraw-button / toggle-suspend-button) since these are destructive.
 */

export function UnpublishInternshipButton({ internshipId }: { internshipId: string }) {
  const t = useTranslations('company.internshipStatus');
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (!window.confirm(t('unpublishConfirm'))) return;
    startTransition(async () => {
      try {
        await companyUnpublishInternshipAction(internshipId);
        router.refresh();
      } catch (e) {
        window.alert(e instanceof Error ? e.message : 'failed');
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="text-[12px] font-medium text-[var(--ink-3)] hover:text-[var(--ink)] disabled:opacity-60"
    >
      {pending ? t('unpublishing') : t('unpublish')}
    </button>
  );
}

export function CloseInternshipButton({ internshipId }: { internshipId: string }) {
  const t = useTranslations('company.internshipStatus');
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (!window.confirm(t('closeConfirm'))) return;
    startTransition(async () => {
      try {
        await closeInternshipAction(internshipId);
        router.refresh();
      } catch (e) {
        window.alert(e instanceof Error ? e.message : 'failed');
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="text-[12px] font-medium text-[var(--ink-3)] hover:text-[var(--danger)] disabled:opacity-60"
    >
      {pending ? t('closing') : t('close')}
    </button>
  );
}
