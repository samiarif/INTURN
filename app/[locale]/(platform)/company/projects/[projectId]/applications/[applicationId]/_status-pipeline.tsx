'use client';

import { useState, useTransition } from 'react';
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

export type StatusPipelineLabels = {
  reject: string;
  feedbackHint: string;
  feedbackPlaceholder: string;
  confirmReject: string;
  confirmAccept: string;
  cancel: string;
};

export function StatusPipeline({
  applicationId,
  projectId,
  currentStatus,
  labels,
}: {
  applicationId: string;
  projectId: string;
  currentStatus: ApplicationStatus;
  labels: StatusPipelineLabels;
}) {
  const [pending, startTransition] = useTransition();
  // Which decision (if any) is awaiting an optional feedback note + confirm.
  const [feedbackFor, setFeedbackFor] = useState<'rejected' | 'accepted' | null>(null);
  const [note, setNote] = useState('');

  function transitionTo(to: ApplicationStatus, decisionNote?: string) {
    startTransition(async () => {
      if (to === 'accepted') {
        await acceptApplicationAction({ applicationId, projectId, decisionNote });
      } else {
        await transitionApplicationStatusAction({ applicationId, projectId, to, decisionNote });
      }
      setFeedbackFor(null);
      setNote('');
    });
  }

  function openFeedback(target: 'rejected' | 'accepted') {
    setNote('');
    setFeedbackFor(target);
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
              onClick={() =>
                step.value === 'accepted' ? openFeedback('accepted') : transitionTo(step.value)
              }
              className={
                isCurrent
                  ? 'px-3 py-1.5 rounded-full text-label bg-[var(--ink)] text-white'
                  : isPast
                    ? 'px-3 py-1.5 rounded-full text-label bg-[var(--surface-muted)] text-[var(--ink-3)]'
                    : canTransition
                      ? 'px-3 py-1.5 rounded-full text-label bg-[var(--surface)] text-[var(--ink-2)] border border-[var(--border-color)] hover:border-[var(--border-strong)]'
                      : 'px-3 py-1.5 rounded-full text-label bg-[var(--surface)] text-[var(--ink-4)] border border-[var(--border-color)] opacity-50 cursor-not-allowed'
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
          onClick={() => openFeedback('rejected')}
          className="text-label text-[var(--danger)] hover:underline"
        >
          {labels.reject}
        </button>
      )}

      {feedbackFor && (
        <div className="mt-3 border border-[var(--border-color)] rounded-md p-3 bg-[var(--surface)]">
          <label htmlFor="decision-note" className="block text-caption text-[var(--ink-3)] mb-1">
            {labels.feedbackHint}
          </label>
          <textarea
            id="decision-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder={labels.feedbackPlaceholder}
            className="w-full rounded-md border border-[var(--border-color)] bg-[var(--surface)] p-2 text-body text-[var(--ink)] focus:border-[var(--border-strong)] focus:outline-none"
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => transitionTo(feedbackFor, note)}
              className={
                feedbackFor === 'rejected'
                  ? 'px-3 py-1.5 rounded-md text-label bg-[var(--danger)] text-white disabled:opacity-50'
                  : 'px-3 py-1.5 rounded-md text-label bg-[var(--brand-500)] text-white disabled:opacity-50'
              }
            >
              {feedbackFor === 'rejected' ? labels.confirmReject : labels.confirmAccept}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setFeedbackFor(null);
                setNote('');
              }}
              className="px-3 py-1.5 rounded-md text-label text-[var(--ink-3)] hover:text-[var(--ink)]"
            >
              {labels.cancel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
