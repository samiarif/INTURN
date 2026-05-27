import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getSession } from '@/modules/auth/session';
import { getProjectById } from '@/modules/projects/queries';
import { getApplicationById } from '@/modules/applications/queries';
import { NotesEditor } from './_notes';
import { StatusPipeline } from './_status-pipeline';
import type { ApplicationStatus } from '@/modules/applications/state-machine';

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string; applicationId: string; locale: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/sign-in');
  const { user, role } = session;

  const { projectId, applicationId, locale } = await params;
  const project = await getProjectById(projectId);
  if (!project) notFound();
  if (role !== 'admin' && !project.supervisorIds?.includes(user.id)) notFound();

  const data = await getApplicationById(applicationId);
  if (!data) notFound();
  if (data.internship.projectId !== projectId) notFound();

  const t = await getTranslations({ locale, namespace: 'applications.review' });

  const { application, internship, applicant, profile } = data;
  const customQuestions = internship.customQuestions ?? [];
  const customAnswers = application.customAnswers ?? [];

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 md:p-8">
      <div className="mb-2">
        <Link
          href={`/company/projects/${projectId}/applications`}
          className="text-[13px] text-[var(--ink-3)] hover:text-[var(--ink)]"
        >
          {t('back')}
        </Link>
      </div>
      <div className="font-mono text-[11px] text-[var(--ink-3)] uppercase tracking-wider mb-1">
        {internship.title}
      </div>
      <div className="flex items-center justify-between gap-4 flex-wrap mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          {applicant.firstName} {applicant.lastName}
        </h1>
        <span className="font-mono text-[12px] text-[var(--ink-3)]">
          {t('appliedOn', {
            date: new Date(application.createdAt).toLocaleDateString(
              locale === 'fr' ? 'fr-FR' : 'en-US',
            ),
          })}
        </span>
      </div>

      <section className="mb-8">
        <h2 className="text-[12px] font-mono uppercase tracking-wider text-[var(--ink-3)] mb-3">
          {t('profile')}
        </h2>
        <div className="border border-[var(--border-color)] rounded-md p-4 bg-[var(--surface)]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-[12px] text-[var(--ink-3)]">{t('email')}</div>
              <div className="font-medium break-all">{applicant.email}</div>
            </div>
            <div>
              <div className="text-[12px] text-[var(--ink-3)]">{t('university')}</div>
              <div className="font-medium">{profile?.university ?? '—'}</div>
            </div>
            <div>
              <div className="text-[12px] text-[var(--ink-3)]">{t('year')}</div>
              <div className="font-medium">{profile?.yearOfStudy ?? '—'}</div>
            </div>
            <div>
              <div className="text-[12px] text-[var(--ink-3)]">{t('field')}</div>
              <div className="font-medium">{profile?.fieldOfStudy ?? '—'}</div>
            </div>
            <div>
              <div className="text-[12px] text-[var(--ink-3)]">{t('city')}</div>
              <div className="font-medium">{profile?.city ?? '—'}</div>
            </div>
            <div>
              <div className="text-[12px] text-[var(--ink-3)]">{t('language')}</div>
              <div className="font-medium uppercase">{profile?.preferredLanguage ?? '—'}</div>
            </div>
          </div>
          {profile?.skills && profile.skills.length > 0 && (
            <div className="mt-4">
              <div className="text-[12px] text-[var(--ink-3)] mb-1">{t('skills')}</div>
              <div className="flex flex-wrap gap-1.5">
                {profile.skills.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center px-2 py-0.5 rounded-full bg-[var(--brand-50)] text-[var(--brand-600)] text-[11.5px] font-medium"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
          {profile?.resumeUrl && (
            <div className="mt-4">
              <a
                href={profile.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] text-[var(--brand-600)] hover:text-[var(--brand-700)]"
              >
                {t('viewCv')}
              </a>
            </div>
          )}
          {profile?.portfolioLinks && profile.portfolioLinks.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-3">
              {profile.portfolioLinks.map((l, i) => (
                <a
                  key={i}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[13px] text-[var(--brand-600)] hover:text-[var(--brand-700)]"
                >
                  {l.platform} ↗
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

      {application.coverNote && (
        <section className="mb-8">
          <h2 className="text-[12px] font-mono uppercase tracking-wider text-[var(--ink-3)] mb-3">
            {t('coverNote')}
          </h2>
          <div className="border border-[var(--border-color)] rounded-md p-4 bg-[var(--surface)] text-[14px] text-[var(--ink-2)] whitespace-pre-line max-h-[400px] overflow-y-auto">
            {application.coverNote}
          </div>
        </section>
      )}

      {customAnswers.length > 0 && (
        <section className="mb-8">
          <h2 className="text-[12px] font-mono uppercase tracking-wider text-[var(--ink-3)] mb-3">
            {t('applicationAnswers')}
          </h2>
          <div className="space-y-3">
            {customQuestions.map((q, i) => (
              <div key={i} className="border border-[var(--border-color)] rounded-md p-4 bg-[var(--surface)]">
                <div className="text-[12.5px] text-[var(--ink-3)] mb-1">{q.question}</div>
                <div className="text-[14px] text-[var(--ink-2)] whitespace-pre-line max-h-[200px] overflow-y-auto">
                  {customAnswers[i]?.answer ?? '—'}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mb-8">
        <h2 className="text-[12px] font-mono uppercase tracking-wider text-[var(--ink-3)] mb-3">
          {t('internalNotes')}
        </h2>
        <NotesEditor
          applicationId={applicationId}
          projectId={projectId}
          initialNotes={application.internalNotes ?? ''}
        />
      </section>

      <section className="border-t border-[var(--border-color)] pt-6">
        <h2 className="text-[12px] font-mono uppercase tracking-wider text-[var(--ink-3)] mb-3">
          {t('pipeline')}
        </h2>
        <StatusPipeline
          applicationId={applicationId}
          projectId={projectId}
          currentStatus={(application.status ?? 'new') as ApplicationStatus}
        />
      </section>
    </div>
  );
}
