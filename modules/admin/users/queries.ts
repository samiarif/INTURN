import { db } from '@/db';
import { users, profiles, organizations, type User, type Profile } from '@/db/schema';
import { and, desc, eq, ilike, isNull, isNotNull, or, sql, type SQL } from 'drizzle-orm';

export type AdminUserRow = User & {
  profile: Pick<Profile, 'university' | 'fieldOfStudy' | 'city'> | null;
  orgName: string | null;
};

export type AdminUserFilter = {
  search?: string; // matches email, first/last name
  role?: 'intern' | 'company' | 'admin';
  suspended?: 'active' | 'suspended';
};

export async function listAdminUsers(
  limit = 50,
  filter: AdminUserFilter = {},
): Promise<AdminUserRow[]> {
  const conditions: SQL[] = [];
  if (filter.role) conditions.push(eq(users.role, filter.role));
  if (filter.suspended === 'active') conditions.push(isNull(users.suspendedAt));
  if (filter.suspended === 'suspended') conditions.push(isNotNull(users.suspendedAt));
  if (filter.search) {
    const term = `%${filter.search}%`;
    const searchCond = or(
      ilike(users.email, term),
      ilike(users.firstName, term),
      ilike(users.lastName, term),
    );
    if (searchCond) conditions.push(searchCond);
  }

  const baseQuery = db
    .select({
      user: users,
      profile: profiles,
      orgName: organizations.name,
    })
    .from(users)
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .leftJoin(organizations, eq(organizations.ownerId, users.id));

  const rows = await (conditions.length > 0
    ? baseQuery.where(and(...conditions))
    : baseQuery
  )
    .orderBy(desc(users.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    ...r.user,
    profile: r.profile
      ? {
          university: r.profile.university,
          fieldOfStudy: r.profile.fieldOfStudy,
          city: r.profile.city,
        }
      : null,
    orgName: r.orgName ?? null,
  }));
}

export async function getAdminUserStats(): Promise<{
  total: number;
  byRole: { intern: number; company: number; admin: number };
  suspended: number;
}> {
  const [totalRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users);
  const [internRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(eq(users.role, 'intern'));
  const [companyRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(eq(users.role, 'company'));
  const [adminRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(eq(users.role, 'admin'));
  const [suspRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(isNotNull(users.suspendedAt));
  return {
    total: Number(totalRow?.count ?? 0),
    byRole: {
      intern: Number(internRow?.count ?? 0),
      company: Number(companyRow?.count ?? 0),
      admin: Number(adminRow?.count ?? 0),
    },
    suspended: Number(suspRow?.count ?? 0),
  };
}
