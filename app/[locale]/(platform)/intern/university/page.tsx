import { redirect } from 'next/navigation';
import { getTranslations, getLocale } from 'next-intl/server';
import { getSession } from '@/modules/auth/session';
import { getViewerMemberships } from '@/modules/team/authz';
import { PageHeader } from '@/components/ui/page-header';
import { StatusPill } from '@/components/status-pill';
import { getReportsForStudent, getReportComments } from '@/modules/academic-reports/queries';
import { ReportVersionStack } from '@/modules/academic-reports/components/report-version-stack';
import { ReportUploadZone } from '@/modules/academic-reports/components/report-upload-zone';
import { ReportCommentsThread } from '@/modules/academic-reports/components/report-comments-thread';
import { AddDeliverable } from '@/modules/academic-reports/components/add-deliverable';
import { toneFor } from '@/modules/academic-reports/status-tone';
import { DELIVERABLE_KINDS } from '@/modules/academic-reports/kinds';

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
  const reports = await getReportsForStudent(session.user.id, universityOrgId);
  const commentsByReport = await Promise.all(reports.map((r) => getReportComments(r.id)));
  const studentName = [session.user.firstName, session.user.lastName].filter(Boolean).join(' ') || session.user.email;

  const statusLabels: Record<string, string> = {
    draft: t('status.draft'),
    submitted: t('status.submitted'),
    approved: t('status.approved'),
    'revision-requested': t('status.revisionRequested'),
  };

  const kindOptions = DELIVERABLE_KINDS.map((k) => ({ value: k, label: t(`kind.${k}`) }));

  return (
    <div className="mx-auto max-w-3xl px-6 py-8 md:p-8">
      <PageHeader title={t('home.title')} description={t('home.subtitle')} className="mb-6" />

      <div className="mb-6 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] p-4">
        <div className="text-caption font-mono uppercase text-[var(--ink-4)]">{t('home.supervisedBy')}</div>
        <div className="mt-1 font-semibold text-[var(--ink)]">{studentMembership.org.name}</div>
      </div>

      <div className="mb-6 flex justify-end">
        <AddDeliverable
          universityOrgId={universityOrgId}
          kindOptions={kindOptions}
          labels={{
            add: t('home.addDeliverable'),
            kindLabel: t('home.kindLabel'),
            titleLabel: t('home.titleLabel'),
            create: t('home.create'),
            creating: t('home.creating'),
          }}
        />
      </div>

      {reports.length === 0 ? (
        <div className="rounded-md border border-dashed border-[var(--border-color)] p-8 text-center text-sm text-[var(--ink-3)]">
          {t('home.noDeliverables')}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {reports.map((report, i) => (
            <div
              key={report.id}
              className="rounded-lg border border-[var(--border-color)] bg-[var(--surface)] p-4"
            >
              <div className="mb-4 flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-[var(--ink)]">
                    {report.title || t(`kind.${report.kind}`)}
                  </h2>
                  <span className="text-caption text-[var(--ink-4)]">{t(`kind.${report.kind}`)}</span>
                </div>
              </div>

              <div className="mb-4 flex items-center gap-3">
                <StatusPill tone={toneFor(report.status)}>{statusLabels[report.status]}</StatusPill>
                <span className="font-mono text-caption text-[var(--ink-3)]">{`v${report.version}`}</span>
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
                        errorRateLimited: t('upload.errorRateLimited'),
                        errorGeneric: t('upload.errorGeneric'),
                      }}
                    />
                  </span>
                )}
              </div>

              <section className="mb-4">
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
                  comments={commentsByReport[i]}
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
          ))}
        </div>
      )}
    </div>
  );
}
