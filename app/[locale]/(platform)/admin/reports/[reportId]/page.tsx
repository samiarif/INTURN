import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getReportById } from '@/modules/reports/queries';
import { loadSubject } from '@/modules/reports/subject-loader';
import { ResolveReportForm } from './resolve-form';
import { SuspendUserButton } from './suspend-user-button';
import type { ReportSubjectType } from '@/modules/reports/server-actions';

const REASON_LABEL: Record<string, string> = {
  scam: 'Scam',
  misleading: 'Misleading',
  inappropriate: 'Inappropriate',
  spam: 'Spam',
  unsafe: 'Unsafe',
  other: 'Other',
};

export default async function Page({ params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params;
  const row = await getReportById(reportId);
  if (!row) notFound();

  const subject = await loadSubject(row.report.subjectType as ReportSubjectType, row.report.subjectId);

  return (
    <div className="max-w-3xl mx-auto p-8">
      <Link
        href="/admin/reports"
        className="text-[13px] text-[var(--ink-3)] hover:text-[var(--ink)] mb-4 inline-block"
      >
        ← Back to reports
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Report {reportId.slice(0, 8)}</h1>
      <p className="text-[13px] text-[var(--ink-3)] mb-6">
        {row.report.subjectType} · {REASON_LABEL[row.report.reason]} ·{' '}
        {new Date(row.report.createdAt).toLocaleString()}
      </p>

      <section className="border border-[var(--border-color)] rounded-lg bg-[var(--surface)] p-5 mb-4">
        <h2 className="text-[11px] uppercase tracking-wider font-mono text-[var(--brand-700)] mb-2">
          Subject
        </h2>
        <p className="font-semibold mb-1">{subject.label}</p>
        {subject.detail && <p className="text-[13px] text-[var(--ink-3)] mb-2">{subject.detail}</p>}
        {subject.href && (
          <Link
            href={subject.href}
            className="inline-block text-[13px] text-[var(--brand-700)] hover:underline"
          >
            Open subject →
          </Link>
        )}
        {!subject.exists && (
          <p className="text-[13px] text-[var(--danger)] mt-1">
            Subject no longer exists in the database.
          </p>
        )}
        {subject.user && subject.user.role !== 'admin' && (
          <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
            <SuspendUserButton
              userId={subject.user.id}
              isSuspended={subject.user.suspended}
              userLabel={subject.user.email}
            />
          </div>
        )}
      </section>

      <section className="border border-[var(--border-color)] rounded-lg bg-[var(--surface)] p-5 mb-4">
        <h2 className="text-[11px] uppercase tracking-wider font-mono text-[var(--brand-700)] mb-2">
          Report body
        </h2>
        <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{row.report.body}</p>
        <p className="text-[12px] text-[var(--ink-3)] mt-4">
          Reported by {row.reporter?.email ?? 'deleted user'}
        </p>
      </section>

      {row.report.status !== 'open' && row.report.resolution && (
        <section className="border border-[var(--border-color)] rounded-lg bg-[var(--surface-muted)] p-5 mb-4">
          <h2 className="text-[11px] uppercase tracking-wider font-mono text-[var(--ink-3)] mb-2">
            Resolution · {row.report.status}
          </h2>
          <p className="text-[14px] whitespace-pre-wrap">{row.report.resolution}</p>
          {row.report.resolvedAt && (
            <p className="text-[12px] text-[var(--ink-3)] mt-2">
              {new Date(row.report.resolvedAt).toLocaleString()}
            </p>
          )}
        </section>
      )}

      <ResolveReportForm
        reportId={reportId}
        status={row.report.status as 'open' | 'reviewed' | 'resolved'}
        subjectType={row.report.subjectType as ReportSubjectType}
        subjectId={row.report.subjectId}
        subjectExists={subject.exists}
      />
    </div>
  );
}
