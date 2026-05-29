'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Check } from 'lucide-react';
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
      {isValidVerificationTransition(currentStatus, 'verified') && (
        <button
          type="button"
          disabled={pending}
          onClick={() => setTo('verified')}
          className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-md text-sm font-medium bg-[#15803D] text-white hover:bg-[#166534] disabled:opacity-50"
        >
          <Check size={15} strokeWidth={2.5} aria-hidden />
          Mark verified
        </button>
      )}
      {isValidVerificationTransition(currentStatus, 'pending') && (
        <button
          type="button"
          disabled={pending}
          onClick={() => setTo('pending')}
          className="inline-flex items-center justify-center h-9 px-4 rounded-md text-sm font-medium bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A] hover:bg-[#FEF3C7] disabled:opacity-50"
        >
          Request changes
        </button>
      )}
      {isValidVerificationTransition(currentStatus, 'suspended') && (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (confirm('Suspend this organization? Their internships will be hidden from the marketplace.')) {
              setTo('suspended');
            }
          }}
          className="inline-flex items-center justify-center h-9 px-4 rounded-md text-sm font-medium bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA] hover:bg-[#FEE2E2] disabled:opacity-50"
        >
          Suspend
        </button>
      )}
    </div>
  );
}
