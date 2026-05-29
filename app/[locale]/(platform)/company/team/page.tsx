// Team page — staff (org members) + active interns for the current org.
//
// Server component (Next 16: params is a Promise — await it). Guards mirror
// company/projects: must be signed in, role company|admin, in an org, and an
// org-level manager (owner|admin) — supervisors are bounced to the dashboard.
// Members are enriched with user rows so active members show name + avatar;
// the interactive roster lives in <TeamClient>.
import { redirect } from 'next/navigation';
import { Users } from 'lucide-react';
import { inArray } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';
import { PageHeader } from '@/components/ui/page-header';
import { getSession } from '@/modules/auth/session';
import { getCurrentOrg, canManageOrg } from '@/modules/team/authz';
import { getOrgMembers, getOrgInterns } from '@/modules/team/queries';
import { getProjectsByOrganization } from '@/modules/projects/queries';
import { TeamClient } from '@/modules/team/components/team-client';
import { teamStrings } from '@/modules/team/components/strings';
import type { TeamMember, ProjectLite } from '@/modules/team/components/types';

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = teamStrings(locale);

  const session = await getSession();
  if (!session) redirect('/sign-in');
  if (session.role !== 'company' && session.role !== 'admin') {
    redirect(`/${session.role}/dashboard`);
  }

  const current = await getCurrentOrg(session.user.id);
  if (!current) redirect('/onboarding/company');
  if (!canManageOrg(current.role)) redirect('/company/dashboard');

  const org = current.org;

  const [rawMembers, interns, projects] = await Promise.all([
    getOrgMembers(org.id),
    getOrgInterns(org.id),
    getProjectsByOrganization(org.id),
  ]);

  // Enrich active members with their user row (name + avatar). Invited
  // members have no userId yet, so they keep null fields.
  const userIds = rawMembers.map((m) => m.userId).filter((x): x is string => !!x);
  const userById = new Map<
    string,
    { firstName: string | null; lastName: string | null; imageUrl: string | null }
  >();
  if (userIds.length > 0) {
    const userRows = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        imageUrl: users.imageUrl,
      })
      .from(users)
      .where(inArray(users.id, userIds));
    for (const u of userRows) {
      userById.set(u.id, {
        firstName: u.firstName,
        lastName: u.lastName,
        imageUrl: u.imageUrl,
      });
    }
  }

  const members: TeamMember[] = rawMembers.map((m) => {
    const u = m.userId ? userById.get(m.userId) : undefined;
    return {
      ...m,
      firstName: u?.firstName ?? null,
      lastName: u?.lastName ?? null,
      imageUrl: u?.imageUrl ?? null,
    };
  });

  const projectLites: ProjectLite[] = projects.map((p) => ({
    id: p.id,
    name: p.name,
    supervisorIds: p.supervisorIds,
  }));

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6">
      <PageHeader icon={<Users size={22} strokeWidth={1.75} />} title={t.title} description={t.subtitle} />
      <TeamClient
        members={members}
        interns={interns}
        projects={projectLites}
        currentUserId={session.user.id}
        role={current.role}
        orgId={org.id}
        locale={locale}
      />
    </div>
  );
}
