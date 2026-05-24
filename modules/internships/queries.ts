import { unstable_cache } from 'next/cache';
import { db } from '@/db';
import { internships, organizations } from '@/db/schema';
import { and, desc, eq, ilike, inArray } from 'drizzle-orm';

export const MARKETPLACE_TAG = 'marketplace-internships';

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

type ListFilters = {
  search?: string;
  paid?: 'paid' | 'unpaid' | 'all';
  limit?: number;
  offset?: number;
};

async function queryPublishedInternships(filters: ListFilters) {
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

/**
 * Marketplace listing, cached at the data layer. Revalidate by calling
 * `revalidateTag(MARKETPLACE_TAG)` from the publish/unpublish server actions.
 *
 * Search variants are cached per (search, paid, limit, offset) tuple via the
 * unstable_cache key — only filter-less hits share a cache entry.
 */
export async function listPublishedInternships(filters: ListFilters = {}) {
  const cached = unstable_cache(
    () => queryPublishedInternships(filters),
    [
      'marketplace-internships',
      filters.search ?? '',
      filters.paid ?? 'all',
      String(filters.limit ?? 20),
      String(filters.offset ?? 0),
    ],
    { tags: [MARKETPLACE_TAG], revalidate: 300 },
  );
  return cached();
}
