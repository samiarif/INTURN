import { cookies } from 'next/headers';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { organizationMembers, organizations } from '@/db/schema';
import type { MemberRole, OrganizationMember, Organization } from '@/db/schema';

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

export function canManageOrg(role: MemberRole | null | undefined): boolean {
  return role === 'owner' || role === 'admin';
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
