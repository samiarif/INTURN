import Link from 'next/link';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getUserByClerkId, getProfileByUserId } from '@/modules/profiles/queries';
import { getInternSidebarData } from '@/modules/workspace/queries';
import { getApplicationsByApplicant } from '@/modules/applications/queries';
import { listPublishedInternships } from '@/modules/internships/queries';
import { InternshipCard } from '@/components/marketplace/internship-card';

const STATUS_STYLE: Record<string, string> = {
  new: 'bg-[#EFF6FF] text-[#1D4ED8]',
  reviewed: 'bg-[var(--surface-muted)] text-[var(--ink-2)]',
  shortlisted: 'bg-[var(--brand-50)] text-[var(--brand-600)]',
  interview: 'bg-[#FFFBEB] text-[#92400E]',
  accepted: 'bg-[#ECFDF5] text-[#15803D]',
  rejected: 'bg-[#FEF2F2] text-[#B91C1C]',
};

export default async function Page() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect('/sign-in');
  const user = await getUserByClerkId(clerkId);
  if (!user) redirect('/sign-in');

  // Belt-and-braces redirect to onboarding if the user hasn't completed it.
  // Admins (looking through "intern eyes") bypass — they don't need to
  // complete the intern wizard to view this surface.
  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(clerkId);
  const isAdmin = clerkUser.publicMetadata.role === 'admin';

  const earlyProfile = await getProfileByUserId(user.id);
  if (!isAdmin && (!earlyProfile || earlyProfile.profileStep !== 'complete')) {
    redirect('/onboarding/intern/basics');
  }

  const [profile, sidebarData, applicationRows, recommendedAll] = await Promise.all([
    Promise.resolve(earlyProfile),
    getInternSidebarData(user.id),
    getApplicationsByApplicant(user.id),
    listPublishedInternships({ limit: 12 }),
  ]);

  const workspaces = sidebarData.role === 'intern' ? sidebarData.activeWorkspaces : [];
  const recentApplications = applicationRows.slice(0, 5);

  // Recommend top 3 by role match (in-memory filter). If no profile.roles,
  // fall back to first 3.
  const profileRoles = new Set((profile?.roles ?? []).map((r) => r.toLowerCase()));
  const recommended = profileRoles.size > 0
    ? recommendedAll
        .filter((r) => (r.internship.sector ?? '').toLowerCase().split(/\s+/).some((w) => profileRoles.has(w)))
        .slice(0, 3)
    : recommendedAll.slice(0, 3);

  return (
    <div className="max-w-5xl mx-auto p-8">
      <h1 className="text-2xl font-semibold tracking-tight mb-1">
        Welcome back, {user.firstName ?? 'there'}
      </h1>
      <p className="text-[14px] text-[var(--ink-3)] mb-10">
        Your workspaces, applications, and matched internships.
      </p>

      <section className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">My active workspaces</h2>
        </div>
        {workspaces.length === 0 ? (
          <div className="border border-dashed border-[var(--border-color)] rounded-md p-8 text-center text-[var(--ink-3)] text-sm">
            No active workspaces yet. Apply to internships and once a company accepts you,
            your workspace opens automatically.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {workspaces.map((w) => (
              <Link
                key={w.id}
                href={`/intern/workspaces/${w.id}`}
                className="block border border-[var(--border-color)] rounded-lg bg-[var(--surface)] p-4 hover:border-[var(--border-strong)] hover:shadow-sm"
              >
                <div className="font-medium">{w.label}</div>
                <div className="text-[12px] text-[var(--ink-3)] mt-1">
                  {w.live ? '● Active' : 'Done'}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent applications</h2>
          {applicationRows.length > 0 && (
            <Link href="/intern/applications" className="text-[13px] text-[var(--brand-600)] hover:text-[var(--brand-700)]">
              See all {applicationRows.length} →
            </Link>
          )}
        </div>
        {recentApplications.length === 0 ? (
          <div className="border border-dashed border-[var(--border-color)] rounded-md p-8 text-center text-[var(--ink-3)] text-sm">
            No applications yet. Find an internship below and apply.
          </div>
        ) : (
          <div className="border border-[var(--border-color)] rounded-md overflow-hidden bg-[var(--surface)]">
            {recentApplications.map(({ application, internship }) => (
              <Link
                key={application.id}
                href={`/intern/applications/${application.id}`}
                className="block border-b border-[var(--border-color)] last:border-b-0 px-4 py-3 hover:bg-[var(--surface-muted)]"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{internship.title}</div>
                    <div className="text-[12px] text-[var(--ink-3)] mt-0.5">
                      Applied {new Date(application.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${STATUS_STYLE[application.status ?? 'new']}`}>
                    {application.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recommended for you</h2>
          <Link href="/marketplace" className="text-[13px] text-[var(--brand-600)] hover:text-[var(--brand-700)]">
            Browse all →
          </Link>
        </div>
        {recommended.length === 0 ? (
          <div className="border border-dashed border-[var(--border-color)] rounded-md p-8 text-center text-[var(--ink-3)] text-sm">
            No internships match yet — check back as new ones get posted.
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            {recommended.map(({ internship, organization }) => (
              <InternshipCard key={internship.id} internship={internship} organization={organization} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
