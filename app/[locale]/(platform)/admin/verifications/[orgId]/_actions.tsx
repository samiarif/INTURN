'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { setVerificationStatusAction } from '@/modules/admin/server-actions';
import {
  isValidVerificationTransition,
  type VerificationStatus,
} from '@/modules/admin/state-machine';

export function VerificationActions({
  orgId,
  currentStatus,
}: {
  orgId: string;
  currentStatus: VerificationStatus;
}) {
  const t = useTranslations('admin.verifyActions');
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function setTo(to: VerificationStatus) {
    startTransition(async () => {
      await setVerificationStatusAction({ orgId, to });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Approving a verification is the one admin value moment (an org
          becomes verified) → brand. The cautionary transitions stay quiet
          status-token outlines, same idiom as the report triage buttons. */}
      {isValidVerificationTransition(currentStatus, 'verified') && (
        <Button
          variant="brand"
          size="lg"
          className="px-4"
          disabled={pending}
          onClick={() => setTo('verified')}
        >
          <Check size={15} strokeWidth={2.5} aria-hidden />
          {t('markVerified')}
        </Button>
      )}
      {isValidVerificationTransition(currentStatus, 'pending') && (
        <button
          type="button"
          disabled={pending}
          onClick={() => setTo('pending')}
          className="inline-flex items-center justify-center h-9 px-4 rounded-lg text-sm font-medium border border-[color-mix(in_srgb,var(--status-warn-ink)_30%,transparent)] bg-[var(--surface)] text-[var(--status-warn-ink)] hover:bg-[var(--status-warn-bg)] transition-colors disabled:opacity-50"
        >
          {t('requestChanges')}
        </button>
      )}
      {isValidVerificationTransition(currentStatus, 'suspended') && (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (confirm(t('suspendConfirm'))) {
              setTo('suspended');
            }
          }}
          className="inline-flex items-center justify-center h-9 px-4 rounded-lg text-sm font-medium border border-[var(--status-danger-border)] bg-[var(--surface)] text-[var(--status-danger-ink)] hover:bg-[var(--status-danger-bg)] transition-colors disabled:opacity-50"
        >
          {t('suspend')}
        </button>
      )}
    </div>
  );
}
