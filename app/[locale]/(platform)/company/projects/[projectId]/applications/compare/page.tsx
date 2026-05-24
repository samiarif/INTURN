import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/modules/auth/session';
import { getProjectById } from '@/modules/projects/queries';
import { getApplicationsByIds } from '@/modules/applications/queries';

const STATUS_STYLE: Record<string, string> = {
  new: 'bg-[#EFF6FF] text-[#1D4ED8]',
  reviewed: 'bg-[var(--surface-muted)] text-[var(--ink-2)]',
  shortlisted: 'bg-[var(--brand-50)] text-[var(--brand-600)]',
  interview: 'bg-[#FFFBEB] text-[#92400E]',
  accepted: 'bg-[#ECFDF5] text-[#15803D]',
  rejected: 'bg-[#FEF2F2] text-[#B91C1C]',
};

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ ids?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/sign-in');
  const { user, role } = session;

  const { projectId } = await params;
  const project = await getProjectById(projectId);
  if (!project) notFound();
  if (role !== 'admin' && !project.supervisorIds?.includes(user.id)) notFound();

  const sp = await searchParams;
  const idList = (sp.ids ?? '').split(',').filter(Boolean).slice(0, 4);
  if (idList.length < 2) {
    redirect(`/company/projects/${projectId}/applications`);
  }

  const apps = await getApplicationsByIds(idList);
  // Sort to match the URL order.
  apps.sort((a, b) => idList.indexOf(a.application.id) - idList.indexOf(b.application.id));

  // Match skills against the first application's internship (assumes all are
  // for the same internship; if not, skill matching falls back to no highlight).
  const internshipSkills = new Set(apps[0]?.internship?.skills ?? []);

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="mb-2">
        <Link
          href={`/company/projects/${projectId}/applications`}
          className="text-[13px] text-[var(--ink-3)] hover:text-[var(--ink)]"
        >
          ← All applications
        </Link>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight mb-2">
        Compare {apps.length} candidates
      </h1>
      <p className="text-[14px] text-[var(--ink-3)] mb-8">
        Skills highlighted in violet match this internship&apos;s required skills.
      </p>
      <div className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${apps.length}, minmax(0, 1fr))` }}>
        {apps.map(({ application, internship, applicant, profile }) => (
          <div
            key={application.id}
            className="border border-[var(--border-color)] rounded-lg p-5 bg-[var(--surface)]"
          >
            <div className="font-mono text-[10.5px] text-[var(--ink-3)] uppercase tracking-wider mb-1">
              {internship.title}
            </div>
            <h2 className="text-lg font-semibold tracking-tight mb-1">
              {applicant.firstName} {applicant.lastName}
            </h2>
            <div className="text-[13px] text-[var(--ink-3)] mb-3">
              {profile?.university ?? '—'} · {profile?.yearOfStudy ?? '—'} · {profile?.fieldOfStudy ?? '—'}
            </div>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${STATUS_STYLE[application.status ?? 'new']} mb-4`}
            >
              {application.status}
            </span>
            <div className="mb-4">
              <div className="text-[12px] font-mono uppercase tracking-wider text-[var(--ink-3)] mb-2">
                Skills
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(profile?.skills ?? []).map((s) => {
                  const matched = internshipSkills.has(s);
                  return (
                    <span
                      key={s}
                      className={
                        matched
                          ? 'inline-flex items-center px-2 py-0.5 rounded-full bg-[var(--brand-50)] text-[var(--brand-600)] text-[11.5px] font-medium'
                          : 'inline-flex items-center px-2 py-0.5 rounded-full bg-[var(--surface-muted)] text-[var(--ink-3)] text-[11.5px]'
                      }
                    >
                      {s}
                    </span>
                  );
                })}
              </div>
            </div>
            {(profile?.roles ?? []).length > 0 && (
              <div className="mb-4">
                <div className="text-[12px] font-mono uppercase tracking-wider text-[var(--ink-3)] mb-2">
                  Role chips
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(profile?.roles ?? []).map((r) => (
                    <span
                      key={r}
                      className="inline-flex items-center px-2 py-0.5 rounded-full bg-[var(--ink)] text-white text-[11.5px] font-medium"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {application.coverNote && (
              <div className="mb-4">
                <div className="text-[12px] font-mono uppercase tracking-wider text-[var(--ink-3)] mb-1">
                  Cover note
                </div>
                <p className="text-[13px] text-[var(--ink-2)] line-clamp-4">
                  {application.coverNote}
                </p>
              </div>
            )}
            <Link
              href={`/company/projects/${projectId}/applications/${application.id}`}
              className="inline-flex items-center justify-center h-9 px-4 rounded-md text-sm font-medium border border-[var(--border-color)] hover:border-[var(--border-strong)]"
            >
              Open full →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
