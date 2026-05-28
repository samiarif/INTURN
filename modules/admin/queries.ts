import { db } from '@/db';
import { organizations, users, workspaces } from '@/db/schema';
import { and, asc, desc, eq, gte, inArray, sql } from 'drizzle-orm';

/**
 * List orgs in the given verification statuses, oldest-first when any
 * unreviewed status is in the set (so admin always sees the longest-
 * waiting org first — fair queue). When listing verified/suspended
 * only, sort newest-first (browsing history).
 */
export async function listOrganizationsByVerification(
  statuses: Array<'draft' | 'pending' | 'verified' | 'suspended'>,
) {
  if (statuses.length === 0) return [];
  const isQueue = statuses.some((s) => s === 'draft' || s === 'pending');
  return db
    .select({ organization: organizations, owner: users })
    .from(organizations)
    .innerJoin(users, eq(users.id, organizations.ownerId))
    .where(inArray(organizations.verificationStatus, statuses))
    .orderBy(isQueue ? asc(organizations.createdAt) : desc(organizations.createdAt))
    .limit(500);
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

  // Oldest unreviewed org in the queue — surfaces "we're behind"
  // before it becomes a problem.
  const [oldestPending] = await db
    .select({ createdAt: organizations.createdAt })
    .from(organizations)
    .where(inArray(organizations.verificationStatus, ['draft', 'pending']))
    .orderBy(asc(organizations.createdAt))
    .limit(1);

  const oldestPendingHours = oldestPending
    ? Math.floor((Date.now() - new Date(oldestPending.createdAt).getTime()) / (1000 * 60 * 60))
    : null;

  return {
    verificationsPending: Number(pendingRow?.count ?? 0),
    companiesVerified: Number(verifiedRow?.count ?? 0),
    companiesVerifiedRecent: Number(verifiedRecentRow?.count ?? 0),
    activeWorkspaces: Number(activeWsRow?.count ?? 0),
    activeWorkspacesRecent: Number(activeWsRecentRow?.count ?? 0),
    oldestPendingHours,
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
