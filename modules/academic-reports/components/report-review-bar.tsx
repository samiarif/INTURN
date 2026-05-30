'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  approveReportAction,
  requestReportRevisionAction,
} from '@/modules/academic-reports/server-actions';

export function ReportReviewBar({
  reportId,
  whenLabel,
  labels,
}: {
  reportId: string;
  whenLabel: string;
  labels: {
    submittedBy: string;
    requestChanges: string;
    submitChanges: string;
    approve: string;
    cancel: string;
    feedbackPlaceholder: string;
    sending: string;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showRequest, setShowRequest] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState<string | null>(null);

  function approve() {
    setError(null);
    startTransition(async () => {
      const res = await approveReportAction({ reportId });
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  function sendRevision() {
    if (!feedback.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await requestReportRevisionAction({ reportId, feedback: feedback.trim() });
      if (res.ok) {
        setFeedback('');
        setShowRequest(false);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="rounded-lg border border-[var(--brand-200)] bg-[var(--brand-50)] p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-[var(--ink-2)]">
          {labels.submittedBy} · {whenLabel}
        </span>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" disabled={pending} onClick={() => setShowRequest((v) => !v)}>
            {showRequest ? labels.cancel : labels.requestChanges}
          </Button>
          <Button size="sm" disabled={pending} onClick={approve}>
            <Check size={14} aria-hidden /> {labels.approve}
          </Button>
        </div>
      </div>
      {showRequest && (
        <div className="mt-3">
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder={labels.feedbackPlaceholder}
            aria-label={labels.feedbackPlaceholder}
            className="w-full resize-y rounded border border-[var(--border-color)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)]"
          />
          <div className="mt-2 flex justify-end">
            <Button
              size="sm"
              disabled={pending || !feedback.trim()}
              onClick={sendRevision}
              style={{ background: 'var(--warning)', borderColor: 'var(--warning)' }}
            >
              {pending ? labels.sending : labels.submitChanges}
            </Button>
          </div>
        </div>
      )}
      {error && <p className="mt-1 text-caption text-[var(--danger)]">{error}</p>}
    </div>
  );
}
