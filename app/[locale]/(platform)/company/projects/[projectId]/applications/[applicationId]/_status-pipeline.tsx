'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  acceptApplicationAction,
  transitionApplicationStatusAction,
} from '@/modules/applications/server-actions';
import {
  isValidApplicationTransition,
  type ApplicationStatus,
} from '@/modules/applications/state-machine';

// Ordered pipeline steps. Labels are injected via the `labels.steps` prop so
// the rendered copy stays localized (the parent sources it from the shared
// `applications.status` namespace).
const STEPS: Array<{ value: ApplicationStatus }> = [
  { value: 'new' },
  { value: 'reviewed' },
  { value: 'shortlisted' },
  { value: 'interview' },
  { value: 'accepted' },
];

export type StatusPipelineLabels = {
  reject: string;
  feedbackHint: string;
  feedbackPlaceholder: string;
  confirmReject: string;
  confirmAccept: string;
  cancel: string;
  steps: Record<ApplicationStatus, string>;
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

  // Progress under the step pills — same brand→accent gradient idiom as the
  // workspace `.ph-phase-strip` fill. -1 (rejected) clamps to 0.
  const currentIndex = STEPS.findIndex((s) => s.value === currentStatus);
  const progressPct = currentIndex > 0 ? (currentIndex / (STEPS.length - 1)) * 100 : 0;

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
                  ? 'px-3 py-1.5 rounded-full text-eyebrow font-mono uppercase bg-[var(--ink)] text-[var(--surface)]'
                  : isPast
                    ? 'px-3 py-1.5 rounded-full text-eyebrow font-mono uppercase bg-[var(--surface-muted)] text-[var(--ink-3)]'
                    : canTransition
                      ? 'px-3 py-1.5 rounded-full text-eyebrow font-mono uppercase bg-[var(--surface)] text-[var(--ink-2)] border border-[var(--border-color)] hover:border-[var(--border-strong)] hover:text-[var(--ink)] transition-colors'
                      : 'px-3 py-1.5 rounded-full text-eyebrow font-mono uppercase bg-[var(--surface)] text-[var(--ink-4)] border border-[var(--border-color)] opacity-50 cursor-not-allowed'
              }
            >
              {labels.steps[step.value]}
            </button>
          );
        })}
      </div>

      <div
        aria-hidden
        className="mb-4 h-0.5 max-w-md overflow-hidden rounded-full bg-[var(--border-color)]"
      >
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,var(--brand-500),var(--accent-500))] transition-[width] duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {currentStatus !== 'rejected' && currentStatus !== 'accepted' && (
        <button
          type="button"
          disabled={pending}
          onClick={() => openFeedback('rejected')}
          className="px-3 py-1.5 rounded-md text-label font-medium border border-[var(--status-danger-border)] text-[var(--status-danger-ink)] hover:bg-[var(--status-danger-bg)] transition-colors disabled:opacity-50"
        >
          {labels.reject}
        </button>
      )}

      {feedbackFor && (
        <div className="mt-3 border border-[var(--border-color)] rounded-lg p-4 bg-[var(--surface)] shadow-[var(--elev-card)]">
          <label htmlFor="decision-note" className="block text-label text-[var(--ink-2)] mb-1.5">
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
          <div className="mt-3 flex items-center gap-2">
            {/* Accept = THE value moment → brand violet; reject stays a
                destructive outline per the resolve-form idiom. */}
            {feedbackFor === 'rejected' ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => transitionTo(feedbackFor, note)}
                className="px-3 py-1.5 rounded-md text-label font-medium border border-[var(--status-danger-border)] text-[var(--status-danger-ink)] hover:bg-[var(--status-danger-bg)] transition-colors disabled:opacity-50"
              >
                {labels.confirmReject}
              </button>
            ) : (
              <Button
                type="button"
                variant="brand"
                size="sm"
                disabled={pending}
                onClick={() => transitionTo(feedbackFor, note)}
              >
                {labels.confirmAccept}
              </Button>
            )}
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setFeedbackFor(null);
                setNote('');
              }}
              className="px-3 py-1.5 rounded-md text-label text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors"
            >
              {labels.cancel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
