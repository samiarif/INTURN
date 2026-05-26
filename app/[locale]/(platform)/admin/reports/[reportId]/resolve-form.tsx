'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  resolveReportAction,
  reopenReportAction,
  unpublishInternshipAction,
  type ReportSubjectType,
} from '@/modules/reports/server-actions';

export function ResolveReportForm({
  reportId,
  status,
  subjectType,
  subjectId,
  subjectExists,
}: {
  reportId: string;
  status: 'open' | 'reviewed' | 'resolved';
  subjectType: ReportSubjectType;
  subjectId: string;
  subjectExists: boolean;
}) {
  const router = useRouter();
  const [resolution, setResolution] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(nextStatus: 'reviewed' | 'resolved') {
    setError(null);
    if (resolution.trim().length < 5) {
      setError('Add a short resolution note (min 5 chars).');
      return;
    }
    startTransition(async () => {
      const res = await resolveReportAction({ reportId, status: nextStatus, resolution });
      if (!res.ok) {
        setError(res.error ?? 'failed');
        return;
      }
      router.refresh();
      setResolution('');
    });
  }

  function reopen() {
    startTransition(async () => {
      await reopenReportAction(reportId);
      router.refresh();
    });
  }

  function unpublishSubject() {
    if (subjectType !== 'internship' || !subjectExists) return;
    if (!window.confirm('Unpublish this internship from the marketplace?')) return;
    startTransition(async () => {
      await unpublishInternshipAction(subjectId);
      router.refresh();
    });
  }

  return (
    <section className="border border-[var(--border-color)] rounded-lg bg-[var(--surface)] p-5">
      <h2 className="text-[11px] uppercase tracking-wider font-mono text-[var(--brand-700)] mb-3">
        Triage
      </h2>

      {status !== 'open' ? (
        <div className="flex items-center justify-between">
          <p className="text-[13px] text-[var(--ink-3)]">
            This report is {status}. Re-open to make changes.
          </p>
          <button
            type="button"
            onClick={reopen}
            disabled={pending}
            className="px-3 py-1.5 rounded-md text-[13px] font-medium border border-[var(--border-color)] hover:bg-[var(--surface-muted)]"
          >
            Re-open
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <textarea
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            rows={4}
            placeholder="What did you do about it? (e.g. unpublished internship, contacted org, no action)"
            className="w-full px-3 py-2 rounded-md border border-[var(--border-color)] bg-[var(--surface)] text-sm resize-y"
          />
          {error && <p className="text-[13px] text-[var(--danger)]">{error}</p>}
          <div className="flex items-center gap-2 flex-wrap">
            {subjectType === 'internship' && subjectExists && (
              <button
                type="button"
                onClick={unpublishSubject}
                disabled={pending}
                className="px-3 py-1.5 rounded-md text-[13px] font-medium border border-[#FCA5A5] text-[#B91C1C] hover:bg-[#FEF2F2]"
              >
                Unpublish internship
              </button>
            )}
            <span className="flex-1" />
            <button
              type="button"
              onClick={() => submit('reviewed')}
              disabled={pending}
              className="px-3 py-1.5 rounded-md text-[13px] font-medium border border-[var(--border-color)] hover:bg-[var(--surface-muted)]"
            >
              Mark reviewed
            </button>
            <button
              type="button"
              onClick={() => submit('resolved')}
              disabled={pending}
              className="px-3 py-1.5 rounded-md text-[13px] font-medium bg-[var(--brand-500)] text-white hover:bg-[var(--brand-600)]"
            >
              {pending ? 'Saving…' : 'Resolve'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
