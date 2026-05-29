import Link from 'next/link';
import { auth } from '@/lib/server-auth';
import { notFound, redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { db } from '@/db';
import { workspaces } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getUserByClerkId } from '@/modules/profiles/queries';
import { getApplicationById } from '@/modules/applications/queries';
import { WithdrawButton } from './withdraw-button';

const TIMELINE_STEPS = ['new', 'reviewed', 'shortlisted', 'interview', 'accepted'] as const;
type TimelineStep = (typeof TIMELINE_STEPS)[number];

export default async function Page({
  params,
}: {
  params: Promise<{ applicationId: string; locale: string }>;
}) {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect('/sign-in');
  const user = await getUserByClerkId(clerkId);
  if (!user) redirect('/sign-in');

  const { applicationId, locale } = await params;
  const data = await getApplicationById(applicationId);
  if (!data) notFound();
  if (data.application.applicantId !== user.id) notFound();

  const [t, tStatus] = await Promise.all([
    getTranslations({ locale, namespace: 'applications.detail' }),
    getTranslations({ locale, namespace: 'applications.status' }),
  ]);

  const { application, internship } = data;
  const status = application.status ?? 'new';
  const currentIdx =
    status === 'rejected' ? -1 : TIMELINE_STEPS.indexOf(status as TimelineStep);

  // If accepted, find the workspace and link to it
  let workspaceId: string | null = null;
  if (status === 'accepted') {
    const [ws] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.internshipId, application.internshipId))
      .limit(1);
    workspaceId = ws?.id ?? null;
  }

  const canWithdraw = status !== 'accepted' && status !== 'rejected';

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 md:p-8">
      <div className="mb-2 flex items-center justify-between gap-3">
        <Link
          href="/intern/applications"
          className="text-caption text-[var(--ink-3)] hover:text-[var(--ink)]"
        >
          {t('back')}
        </Link>
        {canWithdraw && <WithdrawButton applicationId={application.id} />}
      </div>
      <h1 className="text-display font-[family-name:var(--font-display)] text-[var(--ink)] mb-1">
        {internship.title}
      </h1>
      <div className="text-body text-[var(--ink-3)] mb-8">
        {t('appliedOn', { date: new Date(application.createdAt).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US') })}
      </div>

      <section className="mb-8">
        <h2 className="text-eyebrow font-mono uppercase text-[var(--ink-3)] mb-3">
          {t('statusLabel')}
        </h2>
        {status === 'rejected' ? (
          <div className="border border-[color-mix(in_srgb,var(--status-danger-ink)_22%,transparent)] bg-[var(--status-danger-bg)] text-[var(--status-danger-ink)] rounded-md p-3 text-label">
            {t('closedLabel')}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-y-2 gap-x-2">
            {TIMELINE_STEPS.map((step, i) => {
              const isCurrent = i === currentIdx;
              const isPast = i < currentIdx;
              return (
                <div key={step} className="flex items-center gap-2">
                  <div
                    className={
                      isCurrent
                        ? 'px-3 py-1.5 rounded-full text-caption font-medium bg-[var(--brand-500)] text-white whitespace-nowrap'
                        : isPast
                          ? 'px-3 py-1.5 rounded-full text-caption font-medium bg-[var(--brand-50)] text-[var(--brand-600)] whitespace-nowrap'
                          : 'px-3 py-1.5 rounded-full text-caption font-medium bg-[var(--surface)] text-[var(--ink-4)] border border-[var(--border-color)] whitespace-nowrap'
                    }
                  >
                    {tStatus(step)}
                  </div>
                  {i < TIMELINE_STEPS.length - 1 && (
                    <span className="hidden sm:inline h-px w-3 bg-[var(--border-color)]" />
                  )}
                </div>
              );
            })}
          </div>
        )}
        {status === 'accepted' && workspaceId && (
          <div className="mt-4">
            <Link
              href={`/intern/workspaces/${workspaceId}`}
              className="inline-flex items-center justify-center h-10 px-5 rounded-md text-sm font-medium bg-[var(--brand-500)] text-white hover:bg-[var(--brand-600)]"
            >
              {t('openWorkspace')}
            </Link>
          </div>
        )}
      </section>

      {application.coverNote && (
        <section className="mb-6">
          <h2 className="text-eyebrow font-mono uppercase text-[var(--ink-3)] mb-2">
            {t('yourCoverNote')}
          </h2>
          <div className="border border-[var(--border-color)] rounded-md p-4 bg-[var(--surface)] text-body text-[var(--ink-2)] whitespace-pre-line max-h-[300px] overflow-y-auto">
            {application.coverNote}
          </div>
        </section>
      )}

      {application.customAnswers && application.customAnswers.length > 0 && (
        <section>
          <h2 className="text-eyebrow font-mono uppercase text-[var(--ink-3)] mb-3">
            {t('yourAnswers')}
          </h2>
          <div className="space-y-3">
            {application.customAnswers.map((a, i) => (
              <div key={i} className="border border-[var(--border-color)] rounded-md p-4 bg-[var(--surface)]">
                <div className="text-caption text-[var(--ink-3)] mb-1">{a.question}</div>
                <div className="text-body text-[var(--ink-2)] whitespace-pre-line max-h-[200px] overflow-y-auto">{a.answer}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
