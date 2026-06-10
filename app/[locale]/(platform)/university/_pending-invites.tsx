'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { resendStudentInviteAction, revokeStudentInviteAction } from '@/modules/university/server-actions';

type Pending = { memberId: string; email: string; encadrantName: string | null };

export function PendingInvites({ invites }: { invites: Pending[] }) {
  const t = useTranslations('university.dashboard');
  const router = useRouter();
  const [pending, start] = useTransition();

  if (invites.length === 0) return null;

  return (
    <section>
      <h2 className="mb-2 flex items-baseline gap-2 font-mono text-eyebrow uppercase tracking-[0.08em] text-[var(--brand-700)]">
        {t('pendingTitle')}
        <span className="font-mono text-caption font-normal normal-case tracking-normal text-[var(--ink-4)]">
          {invites.length}
        </span>
      </h2>
      <div className="divide-y divide-[var(--border-color)] rounded-lg border border-[var(--border-color)] bg-[var(--surface)] shadow-[var(--elev-card)]">
        {invites.map((inv) => (
          <div
            key={inv.memberId}
            className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-[var(--surface-muted)]"
          >
            <span className="text-[var(--ink-2)]">
              {inv.email}
              {inv.encadrantName && (
                <span className="ml-2 text-caption text-[var(--ink-4)]">{'·'} {inv.encadrantName}</span>
              )}
            </span>
            <span className="flex items-center gap-3">
              <button
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    await resendStudentInviteAction({ memberId: inv.memberId, email: inv.email });
                    router.refresh();
                  })
                }
                className="text-caption text-[var(--brand-700)] hover:underline disabled:opacity-60"
              >
                {t('resend')}
              </button>
              <button
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    await revokeStudentInviteAction({ memberId: inv.memberId });
                    router.refresh();
                  })
                }
                className="text-caption text-[var(--danger)] hover:underline disabled:opacity-60"
              >
                {t('revoke')}
              </button>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
