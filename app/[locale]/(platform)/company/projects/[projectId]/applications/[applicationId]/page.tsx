import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getSession } from '@/modules/auth/session';
import { getProjectById } from '@/modules/projects/queries';
import { canViewProject } from '@/modules/team/authz';
import { getApplicationById, getApplicationTimeline } from '@/modules/applications/queries';
import { daysSince } from '@/lib/format-time';
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
  if (!(await canViewProject(user.id, role, project))) notFound();

  const data = await getApplicationById(applicationId);
  if (!data) notFound();
  if (data.internship.projectId !== projectId) notFound();

  const [t, tStatus] = await Promise.all([
    getTranslations({ locale, namespace: 'applications.review' }),
    getTranslations({ locale, namespace: 'applications.status' }),
  ]);

  const { application, internship, applicant, profile } = data;

  const timeline = await getApplicationTimeline(applicationId);
  const latestEntry = timeline[timeline.length - 1];
  const daysInStatus = latestEntry ? daysSince(latestEntry.at) : 0;
  const customQuestions = internship.customQuestions ?? [];
  const customAnswers = application.customAnswers ?? [];

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 md:p-8">
      <div className="mb-2">
        <Link
          href={`/company/projects/${projectId}/applications`}
          className="text-caption text-[var(--ink-3)] hover:text-[var(--ink)]"
        >
          {t('back')}
        </Link>
      </div>
      <div className="text-eyebrow font-mono text-[var(--ink-3)] uppercase mb-1">
        {internship.title}
      </div>
      <div className="flex items-center justify-between gap-4 flex-wrap mb-2">
        <h1 className="text-display font-[family-name:var(--font-display)]">
          {applicant.firstName} {applicant.lastName}
        </h1>
        <span className="text-eyebrow font-mono text-[var(--ink-3)]">
          {t('appliedOn', {
            date: new Date(application.createdAt).toLocaleDateString(
              locale === 'fr' ? 'fr-FR' : 'en-US',
            ),
          })}
        </span>
      </div>
      {latestEntry && application.status !== 'rejected' && application.status !== 'accepted' ? (
        <p className="text-caption text-[var(--ink-3)] mb-8">
          {t('agingLine', { status: tStatus(application.status ?? 'new'), days: daysInStatus })}
        </p>
      ) : (
        <div className="mb-6" />
      )}

      <section className="mb-8">
        <h2 className="text-eyebrow font-mono uppercase text-[var(--ink-3)] mb-3">
          {t('profile')}
        </h2>
        <div className="border border-[var(--border-color)] rounded-md p-4 bg-[var(--surface)]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-caption text-[var(--ink-3)]">{t('email')}</div>
              <div className="font-medium break-all">{applicant.email}</div>
            </div>
            <div>
              <div className="text-caption text-[var(--ink-3)]">{t('university')}</div>
              <div className="font-medium">{profile?.university ?? '—'}</div>
            </div>
            <div>
              <div className="text-caption text-[var(--ink-3)]">{t('year')}</div>
              <div className="font-medium">{profile?.yearOfStudy ?? '—'}</div>
            </div>
            <div>
              <div className="text-caption text-[var(--ink-3)]">{t('field')}</div>
              <div className="font-medium">{profile?.fieldOfStudy ?? '—'}</div>
            </div>
            <div>
              <div className="text-caption text-[var(--ink-3)]">{t('city')}</div>
              <div className="font-medium">{profile?.city ?? '—'}</div>
            </div>
            <div>
              <div className="text-caption text-[var(--ink-3)]">{t('language')}</div>
              <div className="font-medium uppercase">{profile?.preferredLanguage ?? '—'}</div>
            </div>
          </div>
          {profile?.skills && profile.skills.length > 0 && (
            <div className="mt-4">
              <div className="text-caption text-[var(--ink-3)] mb-1">{t('skills')}</div>
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
                className="text-label text-[var(--brand-600)] hover:text-[var(--brand-700)]"
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
                  className="inline-flex items-center gap-1 text-label text-[var(--brand-600)] hover:text-[var(--brand-700)]"
                >
                  {l.platform}
                  <ExternalLink size={13} strokeWidth={2.25} aria-hidden />
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

      {application.coverNote && (
        <section className="mb-8">
          <h2 className="text-eyebrow font-mono uppercase text-[var(--ink-3)] mb-3">
            {t('coverNote')}
          </h2>
          <div className="border border-[var(--border-color)] rounded-md p-4 bg-[var(--surface)] text-body text-[var(--ink-2)] whitespace-pre-line max-h-[400px] overflow-y-auto">
            {application.coverNote}
          </div>
        </section>
      )}

      {customAnswers.length > 0 && (
        <section className="mb-8">
          <h2 className="text-eyebrow font-mono uppercase text-[var(--ink-3)] mb-3">
            {t('applicationAnswers')}
          </h2>
          <div className="space-y-3">
            {customQuestions.map((q, i) => (
              <div key={i} className="border border-[var(--border-color)] rounded-md p-4 bg-[var(--surface)]">
                <div className="text-caption text-[var(--ink-3)] mb-1">{q.question}</div>
                <div className="text-body text-[var(--ink-2)] whitespace-pre-line max-h-[200px] overflow-y-auto">
                  {customAnswers[i]?.answer ?? '—'}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mb-8">
        <h2 className="text-eyebrow font-mono uppercase text-[var(--ink-3)] mb-3">
          {t('internalNotes')}
        </h2>
        <NotesEditor
          applicationId={applicationId}
          projectId={projectId}
          initialNotes={application.internalNotes ?? ''}
        />
      </section>

      <section className="border-t border-[var(--border-color)] pt-6">
        <h2 className="text-eyebrow font-mono uppercase text-[var(--ink-3)] mb-3">
          {t('pipeline')}
        </h2>
        <StatusPipeline
          applicationId={applicationId}
          projectId={projectId}
          currentStatus={(application.status ?? 'new') as ApplicationStatus}
          labels={{
            reject: t('reject'),
            feedbackHint: t('feedbackHint'),
            feedbackPlaceholder: t('feedbackPlaceholder'),
            confirmReject: t('confirmReject'),
            confirmAccept: t('confirmAccept'),
            cancel: t('cancel'),
          }}
        />
      </section>
    </div>
  );
}
