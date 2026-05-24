'use client';

import { useTransition } from 'react';
import {
  acceptApplicationAction,
  transitionApplicationStatusAction,
} from '@/modules/applications/server-actions';
import {
  isValidApplicationTransition,
  type ApplicationStatus,
} from '@/modules/applications/state-machine';

const STEPS: Array<{ value: ApplicationStatus; label: string }> = [
  { value: 'new', label: 'New' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'interview', label: 'Interview' },
  { value: 'accepted', label: 'Accepted' },
];

export function StatusPipeline({
  applicationId,
  projectId,
  currentStatus,
}: {
  applicationId: string;
  projectId: string;
  currentStatus: ApplicationStatus;
}) {
  const [pending, startTransition] = useTransition();

  function transitionTo(to: ApplicationStatus) {
    startTransition(async () => {
      if (to === 'accepted') {
        await acceptApplicationAction({ applicationId, projectId });
      } else {
        await transitionApplicationStatusAction({ applicationId, projectId, to });
      }
    });
  }

  return (
    <div>
      <div className="flex items-center gap-1 mb-3 flex-wrap">
        {STEPS.map((step) => {
          const isCurrent = step.value === currentStatus;
          const isPast =
            STEPS.findIndex((s) => s.value === step.value) <
            STEPS.findIndex((s) => s.value === currentStatus);
          const canTransition = isValidApplicationTransition(currentStatus, step.value);
          return (
            <button
              key={step.value}
              type="button"
              disabled={!canTransition || pending}
              onClick={() => transitionTo(step.value)}
              className={
                isCurrent
                  ? 'px-3 py-1.5 rounded-full text-[13px] font-medium bg-[var(--ink)] text-white'
                  : isPast
                    ? 'px-3 py-1.5 rounded-full text-[13px] font-medium bg-[var(--surface-muted)] text-[var(--ink-3)]'
                    : canTransition
                      ? 'px-3 py-1.5 rounded-full text-[13px] font-medium bg-[var(--surface)] text-[var(--ink-2)] border border-[var(--border-color)] hover:border-[var(--border-strong)]'
                      : 'px-3 py-1.5 rounded-full text-[13px] font-medium bg-[var(--surface)] text-[var(--ink-4)] border border-[var(--border-color)] opacity-50 cursor-not-allowed'
              }
            >
              {step.label}
            </button>
          );
        })}
      </div>
      {currentStatus !== 'rejected' && currentStatus !== 'accepted' && (
        <button
          type="button"
          disabled={pending}
          onClick={() => transitionTo('rejected')}
          className="text-[13px] text-[var(--danger)] hover:underline"
        >
          Reject application
        </button>
      )}
    </div>
  );
}
