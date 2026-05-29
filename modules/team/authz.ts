import { cookies } from 'next/headers';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { organizationMembers, organizations } from '@/db/schema';
import type { MemberRole, OrganizationMember, Organization } from '@/db/schema';
import { canManageOrg } from './roles';

// Re-exported so existing server-side importers can keep `import { canManageOrg }
// from '@/modules/team/authz'`. The implementation lives in the client-safe
// roles.ts (no next/headers) so Client Components can import it without leaking
// this module's server-only deps into the browser bundle.
export { canManageOrg };

export const ACTIVE_ORG_COOKIE = 'inturn-active-org';

export type ViewerMembership = OrganizationMember & { org: Organization };

export async function getViewerMemberships(userId: string): Promise<ViewerMembership[]> {
  const rows = await db.select().from(organizationMembers)
    .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
    .where(and(eq(organizationMembers.userId, userId), eq(organizationMembers.status, 'active')));
  return (rows as Array<{ organization_members: OrganizationMember; organizations: Organization }>)
    .map((r) => ({ ...r.organization_members, org: r.organizations }));
}

export async function getActiveMembership(userId: string, orgId: string): Promise<OrganizationMember | null> {
  const [m] = await db.select().from(organizationMembers)
    .where(and(
      eq(organizationMembers.userId, userId),
      eq(organizationMembers.organizationId, orgId),
      eq(organizationMembers.status, 'active'),
    )).limit(1);
  return (m as OrganizationMember) ?? null;
}

/**
 * May this user view a single project? Allowed when the user is platform staff
 * (`globalRole === 'admin'`), an assigned supervisor on the project, or an
 * org-level owner/admin of the project's organization. Short-circuits the first
 * two cases without a DB read; only the org-manager check queries membership.
 */
export async function canViewProject(
  userId: string,
  globalRole: string | null | undefined,
  project: { organizationId: string; supervisorIds: string[] | null },
): Promise<boolean> {
  if (globalRole === 'admin') return true;
  if (project.supervisorIds?.includes(userId)) return true;
  const m = await getActiveMembership(userId, project.organizationId);
  return canManageOrg(m?.role);
}

export async function getCurrentOrg(userId: string): Promise<{ org: Organization; role: MemberRole; memberships: ViewerMembership[] } | null> {
  const memberships = await getViewerMemberships(userId);
  if (memberships.length === 0) return null;
  const cookieVal = (await cookies()).get(ACTIVE_ORG_COOKIE)?.value;
  const chosen =
    (cookieVal ? memberships.find((m) => m.organizationId === cookieVal) : undefined) ??
    memberships.find((m) => m.role === 'owner') ??
    memberships[0];
  return { org: chosen.org, role: chosen.role as MemberRole, memberships };
}

export async function requireOrgRole(userId: string, orgId: string, roles: MemberRole[]): Promise<OrganizationMember> {
  const m = await getActiveMembership(userId, orgId);
  if (!m || !roles.includes(m.role as MemberRole)) throw new Error('Forbidden');
  return m;
}
