'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toggleSuspendAction } from '@/modules/admin/users/server-actions';

/**
 * Suspend (or reactivate) the user who is the subject of a report, straight
 * from the report-detail triage panel. Mirrors the admin users-table suspend
 * button — same action, same confirm copy — so behaviour stays consistent.
 *
 * Only rendered when the report subject is a USER that still exists and is
 * not an admin (admins can't be suspended via this UI; the action enforces
 * that too).
 */
export function SuspendUserButton({
  userId,
  isSuspended,
  userLabel,
}: {
  userId: string;
  isSuspended: boolean;
  userLabel: string;
}) {
  const t = useTranslations('admin.reports');
  const tUsers = useTranslations('admin.users');
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    const confirmKey = isSuspended ? 'unsuspendConfirm' : 'suspendConfirm';
    if (!window.confirm(tUsers(confirmKey, { email: userLabel }))) return;
    startTransition(async () => {
      try {
        await toggleSuspendAction({ userId, reason: 'report' });
        router.refresh();
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'failed';
        window.alert(msg);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={
        isSuspended
          ? 'px-3 py-1.5 rounded-md text-label font-medium border border-[var(--border-color)] hover:bg-[var(--surface-muted)] disabled:opacity-60'
          : 'px-3 py-1.5 rounded-md text-label font-medium border border-[var(--status-danger-border)] text-[var(--status-danger-ink)] hover:bg-[var(--status-danger-bg)] disabled:opacity-60'
      }
    >
      {pending ? '…' : isSuspended ? t('reactivateUser') : t('suspendUser')}
    </button>
  );
}
