import type { AcademicReport, AcademicReportRevision } from '@/db/schema';
import { StatusPill } from '@/components/status-pill';
import { toneFor } from '@/modules/academic-reports/status-tone';

function fmt(d: Date | string | null, locale: string): string {
  if (!d) return '';
  return new Date(d).toLocaleString(locale, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type StackEntry = {
  version: number;
  status: string;
  fileUrl: string | null;
  fileName: string | null;
  fileType: string | null;
  note: string | null;
  submittedAt: string | null;
  review: { state: 'approved' | 'changes'; text: string } | null;
  active: boolean;
};

/**
 * Read-only version stack for a rapport — current row on top, then
 * revisionHistory (newest-first). Used by BOTH the student and coordinator
 * surfaces. Pure presentation; no workspace coupling, no dv-* CSS.
 */
export function ReportVersionStack({
  report,
  authorName,
  statusLabels,
  locale,
  noFileLabel,
  openLabel,
}: {
  report: AcademicReport;
  authorName: string;
  statusLabels: Record<string, string>;
  locale: string;
  noFileLabel: string;
  openLabel: string;
}) {
  const history = (report.revisionHistory ?? []) as AcademicReportRevision[];
  const current: StackEntry = {
    version: report.version,
    status: report.status,
    fileUrl: report.fileUrl,
    fileName: report.fileName,
    fileType: report.fileType,
    note: null,
    submittedAt: report.submittedAt ? new Date(report.submittedAt).toISOString() : null,
    review:
      report.status === 'revision-requested' && report.feedback
        ? { state: 'changes', text: report.feedback }
        : null,
    active: report.status === 'submitted',
  };
  const past: StackEntry[] = history.map((h) => ({
    version: h.version,
    status: h.status,
    fileUrl: h.fileUrl,
    fileName: h.fileName,
    fileType: h.fileType,
    note: h.note,
    submittedAt: h.submittedAt,
    review: h.review ? { state: h.review.state, text: h.review.text } : null,
    active: false,
  }));
  const stack = [current, ...past];

  // Typographic quotes around free-text notes/feedback — French uses guillemets.
  const [lq, rq] = locale === 'fr' ? ['« ', ' »'] : ['“', '”'];

  return (
    <div className="flex flex-col gap-3">
      {stack.map((v) => (
        <div
          key={`${v.version}-${v.active ? 'cur' : 'hist'}`}
          className={
            'rounded-lg border bg-[var(--surface)] p-4 ' +
            (v.active ? 'border-[var(--brand-300)]' : 'border-[var(--border-color)]')
          }
        >
          <div className="mb-2 flex items-center gap-2">
            <span className="font-mono text-caption text-[var(--ink-3)]">{`v${v.version}`}</span>
            <span className="text-sm text-[var(--ink-2)]">{authorName}</span>
            {v.submittedAt && (
              <span className="font-mono text-caption text-[var(--ink-4)]">{fmt(v.submittedAt, locale)}</span>
            )}
            <span className="ml-auto">
              <StatusPill tone={toneFor(v.status)}>{statusLabels[v.status] ?? v.status}</StatusPill>
            </span>
          </div>
          {v.note && (
            <p className="mb-2 text-sm text-[var(--ink-2)]">{lq}{v.note}{rq}</p>
          )}
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded bg-[var(--surface-muted)] font-mono text-[10px] text-[var(--ink-2)]">
              {'PDF'}
            </div>
            <div className="min-w-0 flex-1 truncate text-sm text-[var(--ink)]">
              {v.fileName ?? noFileLabel}
            </div>
            {v.fileUrl && (
              <a
                href={v.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-[var(--brand-600)] hover:underline"
              >
                {openLabel}
              </a>
            )}
          </div>
          {v.review && (
            <div className="mt-3 rounded-md border border-[var(--border-color)] bg-[var(--surface-muted)] p-3">
              <div className="mb-1 flex items-center gap-2">
                <StatusPill tone={v.review.state === 'approved' ? 'success' : 'warn'}>
                  {v.review.state === 'approved' ? statusLabels['approved'] : statusLabels['revision-requested']}
                </StatusPill>
              </div>
              <p className="text-sm text-[var(--ink-2)]">{lq}{v.review.text}{rq}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
