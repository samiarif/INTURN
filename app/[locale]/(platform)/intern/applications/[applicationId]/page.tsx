import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { notFound, redirect } from 'next/navigation';
import { db } from '@/db';
import { workspaces } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getUserByClerkId } from '@/modules/profiles/queries';
import { getApplicationById } from '@/modules/applications/queries';

const TIMELINE_STEPS = ['new', 'reviewed', 'shortlisted', 'interview', 'accepted'] as const;
type TimelineStep = (typeof TIMELINE_STEPS)[number];

export default async function Page({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect('/sign-in');
  const user = await getUserByClerkId(clerkId);
  if (!user) redirect('/sign-in');

  const { applicationId } = await params;
  const data = await getApplicationById(applicationId);
  if (!data) notFound();
  if (data.application.applicantId !== user.id) notFound();

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

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="mb-2">
        <Link
          href="/intern/applications"
          className="text-[13px] text-[var(--ink-3)] hover:text-[var(--ink)]"
        >
          ← All applications
        </Link>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight mb-1">{internship.title}</h1>
      <div className="text-[14px] text-[var(--ink-3)] mb-8">
        Applied {new Date(application.createdAt).toLocaleDateString()}
      </div>

      <section className="mb-8">
        <h2 className="text-[12px] font-mono uppercase tracking-wider text-[var(--ink-3)] mb-3">
          Status
        </h2>
        {status === 'rejected' ? (
          <div className="border border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C] rounded-md p-3 text-[14px] font-medium">
            Application closed
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {TIMELINE_STEPS.map((step, i) => {
              const isCurrent = i === currentIdx;
              const isPast = i < currentIdx;
              return (
                <div key={step} className="flex items-center gap-2">
                  <div
                    className={
                      isCurrent
                        ? 'px-3 py-1.5 rounded-full text-[12.5px] font-medium bg-[var(--brand-500)] text-white'
                        : isPast
                          ? 'px-3 py-1.5 rounded-full text-[12.5px] font-medium bg-[var(--brand-50)] text-[var(--brand-600)]'
                          : 'px-3 py-1.5 rounded-full text-[12.5px] font-medium bg-[var(--surface)] text-[var(--ink-4)] border border-[var(--border-color)]'
                    }
                  >
                    {step}
                  </div>
                  {i < TIMELINE_STEPS.length - 1 && (
                    <span className="h-px w-3 bg-[var(--border-color)]" />
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
              Open workspace →
            </Link>
          </div>
        )}
      </section>

      {application.coverNote && (
        <section className="mb-6">
          <h2 className="text-[12px] font-mono uppercase tracking-wider text-[var(--ink-3)] mb-2">
            Your cover note
          </h2>
          <div className="border border-[var(--border-color)] rounded-md p-4 bg-[var(--surface)] text-[14px] text-[var(--ink-2)] whitespace-pre-line">
            {application.coverNote}
          </div>
        </section>
      )}

      {application.customAnswers && application.customAnswers.length > 0 && (
        <section>
          <h2 className="text-[12px] font-mono uppercase tracking-wider text-[var(--ink-3)] mb-3">
            Your answers
          </h2>
          <div className="space-y-3">
            {application.customAnswers.map((a, i) => (
              <div key={i} className="border border-[var(--border-color)] rounded-md p-4 bg-[var(--surface)]">
                <div className="text-[12.5px] text-[var(--ink-3)] mb-1">{a.question}</div>
                <div className="text-[14px] text-[var(--ink-2)] whitespace-pre-line">{a.answer}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
