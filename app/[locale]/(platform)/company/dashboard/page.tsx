import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { organizations, applications } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { getUserByClerkId } from '@/modules/profiles/queries';
import { getProjectsByOrganization } from '@/modules/projects/queries';
import { getInternshipsByProjectIds } from '@/modules/internships/queries';

const PROJECT_STATUS_STYLE: Record<string, string> = {
  draft: 'bg-[var(--surface-muted)] text-[var(--ink-3)]',
  active: 'bg-[#ECFDF5] text-[#15803D]',
  archived: 'bg-[var(--surface-muted)] text-[var(--ink-4)]',
};

export default async function Page() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect('/sign-in');
  const user = await getUserByClerkId(clerkId);
  if (!user) redirect('/sign-in');

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.ownerId, user.id))
    .limit(1);
  if (!org) redirect('/onboarding/company');

  const projects = await getProjectsByOrganization(org.id);
  const projectIds = projects.map((p) => p.id);
  const internshipsList = await getInternshipsByProjectIds(projectIds);
  const internshipIds = internshipsList.map((i) => i.id);
  const applicationRows =
    internshipIds.length > 0
      ? await db.select().from(applications).where(inArray(applications.internshipId, internshipIds))
      : [];

  const internshipsByProject = internshipsList.reduce<Record<string, number>>((acc, i) => {
    if (i.projectId) acc[i.projectId] = (acc[i.projectId] ?? 0) + 1;
    return acc;
  }, {});
  const applicationsByProject = applicationRows.reduce<Record<string, number>>((acc, a) => {
    const i = internshipsList.find((x) => x.id === a.internshipId);
    if (i?.projectId) acc[i.projectId] = (acc[i.projectId] ?? 0) + 1;
    return acc;
  }, {});

  const isVerified = org.verificationStatus === 'verified';

  return (
    <div className="max-w-5xl mx-auto p-8">
      <h1 className="text-2xl font-semibold tracking-tight mb-2">{org.name}</h1>
      <p className="text-[14px] text-[var(--ink-3)] mb-8">
        Your projects, internships, and applications.
      </p>

      {!isVerified && (
        <div className="border border-[#FDE68A] bg-[#FFFBEB] text-[#78350F] rounded-md p-4 text-[13px] mb-8">
          <b className="text-[#92400E] block mb-1">
            Your organization is awaiting verification (status: {org.verificationStatus}).
          </b>
          You can create draft projects and post draft internships now. Once an admin marks
          your organization as verified, your internships become visible on the marketplace
          and you can accept candidates.
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Projects</h2>
        {isVerified ? (
          <Link
            href="/company/projects/new"
            className="inline-flex items-center justify-center h-9 px-4 rounded-md text-sm font-medium bg-[var(--brand-500)] text-white hover:bg-[var(--brand-600)]"
          >
            + New project
          </Link>
        ) : (
          <button
            type="button"
            disabled
            title="Verify your organization first"
            className="inline-flex items-center justify-center h-9 px-4 rounded-md text-sm font-medium bg-[var(--surface-muted)] text-[var(--ink-4)] cursor-not-allowed"
          >
            + New project
          </button>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="border border-dashed border-[var(--border-color)] rounded-md p-12 text-center">
          <p className="text-[var(--ink-2)] font-medium mb-1">No projects yet</p>
          <p className="text-[var(--ink-3)] text-sm">
            {isVerified
              ? 'Create your first project to start posting internships.'
              : 'Once verified, create a project to post internships.'}
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/company/projects/${p.id}`}
              className="block border border-[var(--border-color)] rounded-lg bg-[var(--surface)] p-4 hover:border-[var(--border-strong)] hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="font-medium">{p.name}</div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium font-mono uppercase tracking-wider ${PROJECT_STATUS_STYLE[p.status]}`}>
                  {p.status}
                </span>
              </div>
              <div className="text-[12px] text-[var(--ink-3)]">
                {internshipsByProject[p.id] ?? 0} internships · {applicationsByProject[p.id] ?? 0} applications
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
