'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('admin.reportDetail');
  const tStatus = useTranslations('admin.status');
  const [resolution, setResolution] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Localize the resolve action's machine error codes; unknown codes fall back
  // to the generic message.
  function mapError(code: string): string {
    switch (code) {
      case 'resolution_required':
        return t('validationMin');
      case 'not_found':
        return t('errorNotFound');
      default:
        return t('genericError');
    }
  }

  function submit(nextStatus: 'reviewed' | 'resolved') {
    setError(null);
    if (resolution.trim().length < 5) {
      setError(t('validationMin'));
      return;
    }
    startTransition(async () => {
      const res = await resolveReportAction({ reportId, status: nextStatus, resolution });
      if (!res.ok) {
        setError(mapError(res.error ?? ''));
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
    if (!window.confirm(t('confirmUnpublish'))) return;
    startTransition(async () => {
      await unpublishInternshipAction(subjectId);
      router.refresh();
    });
  }

  return (
    <section className="border border-[var(--border-color)] rounded-lg bg-[var(--surface)] shadow-[var(--elev-card)] p-5">
      <h2 className="text-eyebrow font-mono uppercase text-[var(--brand-700)] mb-3">
        {t('triage')}
      </h2>

      {status !== 'open' ? (
        <div className="flex items-center justify-between">
          <p className="text-caption text-[var(--ink-3)]">
            {t('reopenHint', { status: tStatus(status).toLowerCase() })}
          </p>
          <button
            type="button"
            onClick={reopen}
            disabled={pending}
            className="px-3 py-1.5 rounded-md text-label font-medium border border-[var(--border-color)] hover:bg-[var(--surface-muted)]"
          >
            {t('reopen')}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <textarea
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            rows={4}
            placeholder={t('placeholder')}
            className="w-full px-3 py-2 rounded-md border border-[var(--border-color)] bg-[var(--surface)] text-sm resize-y"
          />
          {error && <p className="text-caption text-[var(--danger)]">{error}</p>}
          <div className="flex items-center gap-2 flex-wrap">
            {subjectType === 'internship' && subjectExists && (
              <button
                type="button"
                onClick={unpublishSubject}
                disabled={pending}
                className="px-3 py-1.5 rounded-md text-label font-medium border border-[var(--status-danger-border)] text-[var(--status-danger-ink)] hover:bg-[var(--status-danger-bg)]"
              >
                {t('unpublishInternship')}
              </button>
            )}
            <span className="flex-1" />
            <button
              type="button"
              onClick={() => submit('reviewed')}
              disabled={pending}
              className="px-3 py-1.5 rounded-md text-label font-medium border border-[var(--border-color)] hover:bg-[var(--surface-muted)]"
            >
              {t('markReviewed')}
            </button>
            <button
              type="button"
              onClick={() => submit('resolved')}
              disabled={pending}
              className="px-3 py-1.5 rounded-md text-label font-medium bg-[var(--ink)] text-[var(--surface)] hover:opacity-90"
            >
              {pending ? t('saving') : t('resolve')}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
