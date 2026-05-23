import { db } from '@/db';
import { organizations, users, workspaces } from '@/db/schema';
import { and, eq, inArray, desc, sql, gte } from 'drizzle-orm';

export async function listOrganizationsByVerification(
  statuses: Array<'draft' | 'pending' | 'verified' | 'suspended'>,
) {
  if (statuses.length === 0) return [];
  return db
    .select({ organization: organizations, owner: users })
    .from(organizations)
    .innerJoin(users, eq(users.id, organizations.ownerId))
    .where(inArray(organizations.verificationStatus, statuses))
    .orderBy(desc(organizations.createdAt));
}

export async function getOrganizationDetail(orgId: string) {
  const [row] = await db
    .select({ organization: organizations, owner: users })
    .from(organizations)
    .innerJoin(users, eq(users.id, organizations.ownerId))
    .where(eq(organizations.id, orgId))
    .limit(1);
  return row ?? null;
}

export async function getAdminStats() {
  const since30d = new Date(Date.now() - 30 * 86400_000);
  const [pendingRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(organizations)
    .where(inArray(organizations.verificationStatus, ['draft', 'pending']));
  const [verifiedRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(organizations)
    .where(eq(organizations.verificationStatus, 'verified'));
  const [verifiedRecentRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(organizations)
    .where(
      and(eq(organizations.verificationStatus, 'verified'), gte(organizations.updatedAt, since30d)),
    );
  const [activeWsRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(workspaces)
    .where(eq(workspaces.status, 'active'));
  const [activeWsRecentRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(workspaces)
    .where(and(eq(workspaces.status, 'active'), gte(workspaces.createdAt, since30d)));

  return {
    verificationsPending: Number(pendingRow?.count ?? 0),
    companiesVerified: Number(verifiedRow?.count ?? 0),
    companiesVerifiedRecent: Number(verifiedRecentRow?.count ?? 0),
    activeWorkspaces: Number(activeWsRow?.count ?? 0),
    activeWorkspacesRecent: Number(activeWsRecentRow?.count ?? 0),
  };
}

export async function listRecentOrganizations(limit = 10) {
  return db
    .select({ organization: organizations, owner: users })
    .from(organizations)
    .innerJoin(users, eq(users.id, organizations.ownerId))
    .orderBy(desc(organizations.createdAt))
    .limit(limit);
}
