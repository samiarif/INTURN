import { redirect } from 'next/navigation';
import { getTranslations, getLocale } from 'next-intl/server';
import { getSession } from '@/modules/auth/session';
import { getViewerMemberships } from '@/modules/team/authz';
import { PageHeader } from '@/components/ui/page-header';
import { StatusPill } from '@/components/status-pill';
import { getReportForStudent, getReportComments } from '@/modules/academic-reports/queries';
import { createReportDraftAction } from '@/modules/academic-reports/server-actions';
import { ReportVersionStack } from '@/modules/academic-reports/components/report-version-stack';
import { ReportUploadZone } from '@/modules/academic-reports/components/report-upload-zone';
import { ReportCommentsThread } from '@/modules/academic-reports/components/report-comments-thread';
import { toneFor } from '@/modules/academic-reports/status-tone';

export default async function Page() {
  const session = await getSession();
  if (!session) redirect('/sign-in');

  const [t, locale] = await Promise.all([getTranslations('academicReport'), getLocale()]);

  // The student's active university membership (role 'student').
  const memberships = await getViewerMemberships(session.user.id);
  const studentMembership = memberships.find(
    (m) => m.role === 'student' && m.org.kind === 'university',
  );

  if (!studentMembership) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8 md:p-8">
        <PageHeader title={t('home.title')} description={t('home.subtitle')} className="mb-6" />
        <div className="rounded-md border border-dashed border-[var(--border-color)] p-8 text-center text-sm text-[var(--ink-3)]">
          {t('home.notSupervised')}
        </div>
      </div>
    );
  }

  const universityOrgId = studentMembership.org.id;
  const report = await getReportForStudent(session.user.id, universityOrgId);
  const comments = report ? await getReportComments(report.id) : [];
  const studentName = [session.user.firstName, session.user.lastName].filter(Boolean).join(' ') || session.user.email;

  const statusLabels: Record<string, string> = {
    draft: t('status.draft'),
    submitted: t('status.submitted'),
    approved: t('status.approved'),
    'revision-requested': t('status.revisionRequested'),
  };

  // Wrap the action in a void-returning inline server action for use in <form
  // action>. createReportDraftAction returns ActionResult (not void), so we
  // can't use it directly as a form action — the form discards the result.
  async function startReportAction(): Promise<void> {
    'use server';
    await createReportDraftAction({ universityOrgId });
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 md:p-8">
      <PageHeader title={t('home.title')} description={t('home.subtitle')} className="mb-6" />

      <div className="mb-6 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] p-4">
        <div className="text-caption font-mono uppercase text-[var(--ink-4)]">{t('home.supervisedBy')}</div>
        <div className="mt-1 font-semibold text-[var(--ink)]">{studentMembership.org.name}</div>
      </div>

      {!report ? (
        <div className="rounded-md border border-dashed border-[var(--border-color)] p-8 text-center">
          <p className="mb-4 text-sm text-[var(--ink-3)]">{t('home.noReport')}</p>
          <form action={startReportAction}>
            <button
              type="submit"
              className="inline-flex items-center rounded-md bg-[var(--brand-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--brand-600)]"
            >
              {t('home.startReport')}
            </button>
          </form>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <StatusPill tone={toneFor(report.status)}>{statusLabels[report.status]}</StatusPill>
            <span className="font-mono text-caption text-[var(--ink-3)]">v{report.version}</span>
            {(report.status === 'draft' || report.status === 'revision-requested') && (
              <span className="ml-auto">
                <ReportUploadZone
                  reportId={report.id}
                  labels={{
                    title: t('upload.title'),
                    helper: t('upload.helper'),
                    notePlaceholder: t('upload.notePlaceholder'),
                    cancel: t('upload.cancel'),
                    send: t('upload.send'),
                    sending: t('upload.sending'),
                  }}
                />
              </span>
            )}
          </div>

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
