import Link from 'next/link';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { notFound, redirect } from 'next/navigation';
import { db } from '@/db';
import { applications } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { getUserByClerkId } from '@/modules/profiles/queries';
import { getProjectById } from '@/modules/projects/queries';
import { getInternshipsByProject } from '@/modules/internships/queries';
import { PublishInternshipButton } from './_publish-button';

const STATUS_BADGE_STYLE: Record<string, string> = {
  draft: 'bg-[var(--surface-muted)] text-[var(--ink-3)]',
  active: 'bg-[#ECFDF5] text-[#15803D]',
  archived: 'bg-[var(--surface-muted)] text-[var(--ink-4)]',
};

const INTERNSHIP_STATUS_STYLE: Record<string, string> = {
  draft: 'bg-[var(--surface-muted)] text-[var(--ink-3)]',
  published: 'bg-[#ECFDF5] text-[#15803D]',
  closed: 'bg-[var(--surface-muted)] text-[var(--ink-4)]',
  archived: 'bg-[var(--surface-muted)] text-[var(--ink-4)]',
};

export default async function Page({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect('/sign-in');
  const user = await getUserByClerkId(clerkId);
  if (!user) redirect('/sign-in');

  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(clerkId);
  const role =
    (clerkUser.publicMetadata.role as 'intern' | 'company' | 'admin' | undefined) ?? 'company';

  const { projectId } = await params;
  const project = await getProjectById(projectId);
  if (!project) notFound();

  if (role !== 'admin' && !project.supervisorIds?.includes(user.id)) {
    notFound();
  }

  const internships = await getInternshipsByProject(projectId);
  const internshipIds = internships.map((i) => i.id);
  const applicationCounts =
    internshipIds.length > 0
      ? await db
          .select({
            internshipId: applications.internshipId,
            count: applications.id,
          })
          .from(applications)
          .where(inArray(applications.internshipId, internshipIds))
      : [];
  const countByInternship = applicationCounts.reduce<Record<string, number>>((acc, row) => {
    acc[row.internshipId] = (acc[row.internshipId] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="font-mono text-[11px] text-[var(--ink-3)] uppercase tracking-wider mb-1">
            {project.slug}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight inline-flex items-center gap-3">
            {project.name}
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium font-mono uppercase tracking-wider ${STATUS_BADGE_STYLE[project.status]}`}
            >
              {project.status}
            </span>
          </h1>
        </div>
      </div>
      {project.brief && (
        <p className="text-[14px] text-[var(--ink-2)] leading-relaxed max-w-prose mb-8">
          {project.brief}
        </p>
      )}

      <div className="flex items-center justify-between mb-4 pt-4 border-t border-[var(--border-color)]">
        <h2 className="text-lg font-semibold">Internships</h2>
        <Link
          href={`/company/projects/${projectId}/internships/new`}
          className="inline-flex items-center h-9 px-4 rounded-md text-sm font-medium bg-[var(--brand-500)] text-white hover:bg-[var(--brand-600)]"
        >
          + Post internship
        </Link>
      </div>

      {internships.length === 0 ? (
        <div className="border border-dashed border-[var(--border-color)] rounded-md p-8 text-center text-[var(--ink-3)] text-sm">
          No internships yet. Post your first one above.
        </div>
      ) : (
        <div className="border border-[var(--border-color)] rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface-muted)] text-left">
              <tr>
                <th className="px-4 py-2 font-medium text-[var(--ink-3)] text-[12px] uppercase tracking-wider">Title</th>
                <th className="px-4 py-2 font-medium text-[var(--ink-3)] text-[12px] uppercase tracking-wider">Status</th>
                <th className="px-4 py-2 font-medium text-[var(--ink-3)] text-[12px] uppercase tracking-wider">Applications</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {internships.map((i) => (
                <tr key={i.id} className="border-t border-[var(--border-color)]">
                  <td className="px-4 py-3 font-medium">{i.title}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium font-mono uppercase tracking-wider ${INTERNSHIP_STATUS_STYLE[i.status ?? 'draft']}`}
                    >
                      {i.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[12px]">
                    {countByInternship[i.id] ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      {i.status === 'draft' && <PublishInternshipButton internshipId={i.id} />}
                      <Link
                        href={`/company/projects/${projectId}/applications`}
                        className="text-[var(--brand-600)] hover:text-[var(--brand-700)] text-sm"
                      >
                        Applications →
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
