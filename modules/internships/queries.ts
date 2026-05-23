import { db } from '@/db';
import { internships, organizations } from '@/db/schema';
import { and, desc, eq, ilike, inArray } from 'drizzle-orm';

export async function getInternshipById(id: string) {
  const [row] = await db.select().from(internships).where(eq(internships.id, id)).limit(1);
  return row ?? null;
}

export async function getInternshipsByProject(projectId: string) {
  return db.select().from(internships).where(eq(internships.projectId, projectId));
}

export async function getInternshipsByProjectIds(projectIds: string[]) {
  if (projectIds.length === 0) return [];
  return db.select().from(internships).where(inArray(internships.projectId, projectIds));
}

export async function getInternshipWithOrgById(id: string) {
  const [row] = await db
    .select({ internship: internships, organization: organizations })
    .from(internships)
    .innerJoin(organizations, eq(organizations.id, internships.organizationId))
    .where(eq(internships.id, id))
    .limit(1);
  return row ?? null;
}

export async function listPublishedInternships(
  filters: {
    search?: string;
    paid?: 'paid' | 'unpaid' | 'all';
    limit?: number;
    offset?: number;
  } = {},
) {
  const conditions = [
    eq(internships.status, 'published'),
    eq(organizations.verificationStatus, 'verified'),
  ];
  if (filters.search) {
    conditions.push(ilike(internships.title, `%${filters.search}%`));
  }
  if (filters.paid === 'paid') conditions.push(eq(internships.isPaid, true));
  if (filters.paid === 'unpaid') conditions.push(eq(internships.isPaid, false));

  return db
    .select({ internship: internships, organization: organizations })
    .from(internships)
    .innerJoin(organizations, eq(organizations.id, internships.organizationId))
    .where(and(...conditions))
    .orderBy(desc(internships.createdAt))
    .limit(filters.limit ?? 20)
    .offset(filters.offset ?? 0);
}
