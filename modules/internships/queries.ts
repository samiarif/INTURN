import { unstable_cache } from 'next/cache';
import { db } from '@/db';
import { internships, organizations } from '@/db/schema';
import { and, desc, eq, inArray, sql, lt, lte, gt, gte } from 'drizzle-orm';

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
  sector?: string;
  locationType?: 'on-site' | 'virtual' | 'hybrid';
  duration?: 'short' | 'medium' | 'long';
  language?: 'fr' | 'en' | 'ar';
  skill?: string;
  limit?: number;
  offset?: number;
};

async function queryPublishedInternships(filters: ListFilters) {
  const conditions = [
    eq(internships.status, 'published'),
    eq(organizations.verificationStatus, 'verified'),
  ];
  if (filters.search) {
    // tsvector match — search_vector is maintained by a trigger (0003 migration).
    conditions.push(sql`${internships.searchVector} @@ plainto_tsquery('simple', ${filters.search})`);
  }
  if (filters.paid === 'paid') conditions.push(eq(internships.isPaid, true));
  if (filters.paid === 'unpaid') conditions.push(eq(internships.isPaid, false));
  if (filters.sector) conditions.push(eq(internships.sector, filters.sector));
  if (filters.locationType) conditions.push(eq(internships.locationType, filters.locationType));
  if (filters.language) conditions.push(eq(internships.language, filters.language));
  if (filters.duration === 'short') {
    conditions.push(lt(internships.duration, 8));
  } else if (filters.duration === 'medium') {
    const dur = and(gte(internships.duration, 8), lte(internships.duration, 12));
    if (dur) conditions.push(dur);
  } else if (filters.duration === 'long') {
    conditions.push(gt(internships.duration, 12));
  }
  if (filters.skill) {
    conditions.push(sql`${internships.skills} @> ${JSON.stringify([filters.skill])}::jsonb`);
  }

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
      filters.sector ?? '',
      filters.locationType ?? '',
      filters.duration ?? '',
      filters.language ?? '',
      filters.skill ?? '',
      String(filters.limit ?? 20),
      String(filters.offset ?? 0),
    ],
    { tags: [MARKETPLACE_TAG], revalidate: 300 },
  );
  return cached();
}

export async function listMarketplaceSectors(): Promise<string[]> {
  const cached = unstable_cache(
    async () => {
      const rows = await db
        .selectDistinct({ sector: internships.sector })
        .from(internships)
        .innerJoin(organizations, eq(organizations.id, internships.organizationId))
        .where(and(eq(internships.status, 'published'), eq(organizations.verificationStatus, 'verified')));
      return rows.map((r) => r.sector).filter((s): s is string => Boolean(s)).sort();
    },
    ['marketplace-sectors'],
    { tags: [MARKETPLACE_TAG], revalidate: 600 },
  );
  return cached();
}
