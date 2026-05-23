import Link from 'next/link';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { notFound, redirect } from 'next/navigation';
import { getUserByClerkId } from '@/modules/profiles/queries';
import { getProjectById } from '@/modules/projects/queries';
import { getApplicationById } from '@/modules/applications/queries';
import { NotesEditor } from './_notes';
import { StatusPipeline } from './_status-pipeline';
import type { ApplicationStatus } from '@/modules/applications/service';

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string; applicationId: string }>;
}) {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect('/sign-in');
  const user = await getUserByClerkId(clerkId);
  if (!user) redirect('/sign-in');

  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(clerkId);
  const role =
    (clerkUser.publicMetadata.role as 'intern' | 'company' | 'admin' | undefined) ?? 'company';

  const { projectId, applicationId } = await params;
  const project = await getProjectById(projectId);
  if (!project) notFound();
  if (role !== 'admin' && !project.supervisorIds?.includes(user.id)) notFound();

  const data = await getApplicationById(applicationId);
  if (!data) notFound();
  if (data.internship.projectId !== projectId) notFound();

  const { application, internship, applicant, profile } = data;
  const customQuestions = internship.customQuestions ?? [];
  const customAnswers = application.customAnswers ?? [];

  return (
    <div className="max-w-3xl mx-auto p-8">
      <div className="mb-2">
        <Link
          href={`/company/projects/${projectId}/applications`}
          className="text-[13px] text-[var(--ink-3)] hover:text-[var(--ink)]"
        >
          ← All applications
        </Link>
      </div>
      <div className="font-mono text-[11px] text-[var(--ink-3)] uppercase tracking-wider mb-1">
        {internship.title}
      </div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          {applicant.firstName} {applicant.lastName}
        </h1>
        <span className="font-mono text-[12px] text-[var(--ink-3)]">
          Applied {new Date(application.createdAt).toLocaleDateString()}
        </span>
      </div>

      <section className="mb-8">
        <h2 className="text-[12px] font-mono uppercase tracking-wider text-[var(--ink-3)] mb-3">
          Profile
        </h2>
        <div className="border border-[var(--border-color)] rounded-md p-4 bg-[var(--surface)]">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-[12px] text-[var(--ink-3)]">Email</div>
              <div className="font-medium">{applicant.email}</div>
            </div>
            <div>
              <div className="text-[12px] text-[var(--ink-3)]">University</div>
              <div className="font-medium">{profile?.university ?? '—'}</div>
            </div>
            <div>
              <div className="text-[12px] text-[var(--ink-3)]">Year</div>
              <div className="font-medium">{profile?.yearOfStudy ?? '—'}</div>
            </div>
            <div>
              <div className="text-[12px] text-[var(--ink-3)]">Field</div>
              <div className="font-medium">{profile?.fieldOfStudy ?? '—'}</div>
            </div>
            <div>
              <div className="text-[12px] text-[var(--ink-3)]">City</div>
              <div className="font-medium">{profile?.city ?? '—'}</div>
            </div>
            <div>
              <div className="text-[12px] text-[var(--ink-3)]">Language</div>
              <div className="font-medium uppercase">{profile?.preferredLanguage ?? '—'}</div>
            </div>
          </div>
          {profile?.skills && profile.skills.length > 0 && (
            <div className="mt-4">
              <div className="text-[12px] text-[var(--ink-3)] mb-1">Skills</div>
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
                View CV ↗
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
            Cover note
          </h2>
          <div className="border border-[var(--border-color)] rounded-md p-4 bg-[var(--surface)] text-[14px] text-[var(--ink-2)] whitespace-pre-line">
            {application.coverNote}
          </div>
        </section>
      )}

      {customAnswers.length > 0 && (
        <section className="mb-8">
          <h2 className="text-[12px] font-mono uppercase tracking-wider text-[var(--ink-3)] mb-3">
            Application answers
          </h2>
          <div className="space-y-3">
            {customQuestions.map((q, i) => (
              <div key={i} className="border border-[var(--border-color)] rounded-md p-4 bg-[var(--surface)]">
                <div className="text-[12.5px] text-[var(--ink-3)] mb-1">{q.question}</div>
                <div className="text-[14px] text-[var(--ink-2)] whitespace-pre-line">
                  {customAnswers[i]?.answer ?? '—'}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mb-8">
        <h2 className="text-[12px] font-mono uppercase tracking-wider text-[var(--ink-3)] mb-3">
          Internal notes
        </h2>
        <NotesEditor
          applicationId={applicationId}
          projectId={projectId}
          initialNotes={application.internalNotes ?? ''}
        />
      </section>

      <section className="border-t border-[var(--border-color)] pt-6">
        <h2 className="text-[12px] font-mono uppercase tracking-wider text-[var(--ink-3)] mb-3">
          Pipeline
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
