import { notFound, redirect } from 'next/navigation';
import { getTranslations, getLocale } from 'next-intl/server';
import { getSession } from '@/modules/auth/session';
import { getCurrentOrg, getActiveMembership } from '@/modules/team/authz';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { PageHeader } from '@/components/ui/page-header';
import { StatusPill, type StatusTone } from '@/components/status-pill';
import { getStudentInternshipSnapshot } from '@/modules/university/queries';
import { getReportForStudent, getReportComments } from '@/modules/academic-reports/queries';
import { ReportVersionStack } from '@/modules/academic-reports/components/report-version-stack';
import { ReportCommentsThread } from '@/modules/academic-reports/components/report-comments-thread';
import { ReportReviewBar } from '@/modules/academic-reports/components/report-review-bar';

function toneFor(status: string): StatusTone {
  if (status === 'submitted') return 'info';
  if (status === 'approved') return 'success';
  if (status === 'revision-requested') return 'warn';
  return 'neutral';
}

function relativeWhen(d: Date | string | null, locale: string): string {
  if (!d) return '';
  return new Date(d).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default async function Page({ params }: { params: Promise<{ studentId: string }> }) {
  const session = await getSession();
  if (!session) redirect('/sign-in');
  const { studentId } = await params;

  const [t, locale] = await Promise.all([getTranslations('academicReport'), getLocale()]);
  const tUni = await getTranslations('university.review');

  // Resolve the coordinator's active university org.
  const current = await getCurrentOrg(session.user.id);
  if (!current || current.org.kind !== 'university') notFound();

  // IDOR gate: the target studentId MUST be an active student member of THIS
  // university org. A foreign student → not found (same opaque outcome).
  const studentMembership = await getActiveMembership(studentId, current.org.id);
  if (!studentMembership || studentMembership.role !== 'student') notFound();

  // Student identity (safe fields only).
  const [student] = await db
    .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email, imageUrl: users.imageUrl })
    .from(users)
    .where(eq(users.id, studentId))
    .limit(1);
  if (!student) notFound();

  // Firewalled snapshot + the rapport. NEVER canViewWorkspace.
  const [snapshot, report] = await Promise.all([
    getStudentInternshipSnapshot(studentId),
    getReportForStudent(studentId, current.org.id),
  ]);
  const comments = report ? await getReportComments(report.id) : [];
  const studentName = [student.firstName, student.lastName].filter(Boolean).join(' ') || student.email;

  const statusLabels: Record<string, string> = {
    draft: t('status.draft'),
    submitted: t('status.submitted'),
    approved: t('status.approved'),
    'revision-requested': t('status.revisionRequested'),
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 md:p-8">
      <PageHeader title={studentName} description={student.email} className="mb-6" />

      {/* Firewalled internship snapshot (no workspace internals). */}
      <section className="mb-6 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] p-4">
        <h2 className="mb-3 text-sm font-semibold text-[var(--ink-2)]">{tUni('snapshotTitle')}</h2>
        {snapshot ? (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-[var(--ink-2)]">
            <span><b>{snapshot.companyName}</b> · {snapshot.internshipTitle}</span>
            {snapshot.phaseCount > 0 && (
              <StatusPill tone="info">
                {tUni('phaseOf', { current: snapshot.currentPhaseIndex + 1, total: snapshot.phaseCount })}
              </StatusPill>
            )}
            <span className="font-mono text-caption text-[var(--ink-3)]">
              {tUni('weekOf', { current: snapshot.weekCurrent, total: snapshot.weekTotal })}
            </span>
          </div>
        ) : (
          <p className="text-sm text-[var(--ink-3)]">{tUni('notPlaced')}</p>
        )}
      </section>

      {/* The rapport. */}
      {!report ? (
        <div className="rounded-md border border-dashed border-[var(--border-color)] p-8 text-center text-sm text-[var(--ink-3)]">
          {tUni('noReport')}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <StatusPill tone={toneFor(report.status)}>{statusLabels[report.status]}</StatusPill>
            <span className="font-mono text-caption text-[var(--ink-3)]">v{report.version}</span>
          </div>

          {/* Role-gated review bar — only when awaiting review. */}
          {report.status === 'submitted' && (
            <ReportReviewBar
              reportId={report.id}
              submitterName={studentName}
              whenLabel={relativeWhen(report.submittedAt, locale)}
              labels={{
                submittedBy: t('review.submittedBy'),
                requestChanges: t('review.requestChanges'),
                submitChanges: t('review.submitChanges'),
                approve: t('review.approve'),
                cancel: t('review.cancel'),
                feedbackPlaceholder: t('review.feedbackPlaceholder'),
                sending: t('review.sending'),
              }}
            />
          )}

          <section>
            <h2 className="mb-3 text-sm font-semibold text-[var(--ink-2)]">{t('home.versionsTitle')}</h2>
            <ReportVersionStack
              report={report}
              authorName={studentName}
              statusLabels={statusLabels}
              locale={locale}
              noFileLabel={t('home.noFile')}
              openLabel={t('home.open')}
            />
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold text-[var(--ink-2)]">{t('home.commentsTitle')}</h2>
            <ReportCommentsThread
              reportId={report.id}
              comments={comments}
              currentUserId={session.user.id}
              locale={locale}
              labels={{
                placeholder: t('comments.placeholder'),
                empty: t('comments.empty'),
                post: t('comments.post'),
                sending: t('comments.sending'),
              }}
            />
          </section>
        </div>
      )}
    </div>
  );
}
