'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toggleSuspendAction } from '@/modules/admin/users/server-actions';

export function ToggleSuspendButton({
  userId,
  isSuspended,
  userLabel,
}: {
  userId: string;
  isSuspended: boolean;
  userLabel: string;
}) {
  const t = useTranslations('admin.users');
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick() {
    const confirmKey = isSuspended ? 'unsuspendConfirm' : 'suspendConfirm';
    if (!window.confirm(t(confirmKey, { email: userLabel }))) return;
    startTransition(async () => {
      try {
        await toggleSuspendAction({ userId });
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
          ? 'text-label font-medium text-[var(--status-success-ink)] hover:underline disabled:opacity-60'
          : 'text-label font-medium text-[var(--status-danger-ink)] hover:underline disabled:opacity-60'
      }
    >
      {pending ? '…' : isSuspended ? t('unsuspend') : t('suspend')}
    </button>
  );
}
