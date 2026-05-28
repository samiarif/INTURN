import { unstable_cache } from 'next/cache';
import { db } from '@/db';
import { internships, organizations } from '@/db/schema';
import { and, desc, eq, inArray, sql, lt, lte, gt, gte } from 'drizzle-orm';

// NOTE [S4-D]: `'use cache'` Cache Components adoption was evaluated for these
// marketplace reads and deliberately DEFERRED (Next 16.2.6). The audit floated
// migrating from `unstable_cache` to `'use cache'` + `cacheTag` + `cacheLife`,
// but per the Next 16 docs (node_modules/next/dist/docs):
//   1. `'use cache'` requires the APP-WIDE `cacheComponents: true` flag
//      (cacheComponents.md). That flag inverts the rendering default: every
//      page becomes dynamic and all data access is excluded from prerenders
//      unless explicitly cached, with build-time errors for any unhandled
//      runtime data (migrating-to-cache-components.md; use-cache.md).
//   2. This app does heavy per-request work behind Clerk — ~21 files call
//      auth()/currentUser() and getSession() (modules/auth/session.ts) calls
//      auth() across the dashboard/admin/intern/company trees. Enabling the
//      flag would force every such route into <Suspense> boundaries or break
//      `pnpm build`. High blast radius, exactly the failure mode S4-D guards
//      against.
//   3. The marketplace page itself is inherently dynamic (awaits searchParams
//      + getSession + per-user bookmarks), so the page can't be statically
//      prerendered regardless — only these query helpers are cacheable, and
//      they ALREADY are, via unstable_cache below.
//   4. `unstable_cache` is NOT deprecated in 16.2.6 — it's the documented model
//      for apps not on Cache Components (caching-without-cache-components.md).
// To adopt later: enable cacheComponents app-wide, audit + <Suspense>-wrap all
// 20+ dynamic/auth pages, then swap these helpers to `'use cache'`. Invalidation
// already uses the Cache-Components `updateTag(MARKETPLACE_TAG)` API in
// server-actions.ts, so that side is forward-compatible.
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
  /** Exact match against the listing org's `organizations.city`. */
  city?: string;
  limit?: number;
  offset?: number;
};

async function queryPublishedInternships(filters: ListFilters) {
  const conditions = [
    eq(internships.status, 'published'),
    eq(organizations.verificationStatus, 'verified'),
  ];
  if (filters.search) {
    // Hybrid: tsvector @@ (full-token, indexed) OR ilike substring fallback so
    // partial-word queries like "marketin" still match "marketing". Substring
    // matching becomes the dominant path until ~5k listings; tsvector kicks in
    // when ranking starts to matter.
    const q = filters.search;
    const like = `%${q}%`;
    conditions.push(
      sql`(
        ${internships.searchVector} @@ plainto_tsquery('simple', ${q})
        OR ${internships.title} ILIKE ${like}
        OR ${internships.sector} ILIKE ${like}
        OR ${internships.description} ILIKE ${like}
      )`,
    );
  }
  if (filters.paid === 'paid') conditions.push(eq(internships.isPaid, true));
  if (filters.paid === 'unpaid') conditions.push(eq(internships.isPaid, false));
  if (filters.sector) conditions.push(eq(internships.sector, filters.sector));
  if (filters.locationType) conditions.push(eq(internships.locationType, filters.locationType));
  if (filters.language) conditions.push(eq(internships.language, filters.language));
  // City is a facet on the listing's org (organizations.city), filtered with
  // an exact match so it stays in sync with computeFacetCounts' city buckets.
  if (filters.city) conditions.push(eq(organizations.city, filters.city));
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
      filters.city ?? '',
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

/**
 * Facet counts for the explore filter rail. Counts represent the number
 * of published, verified-org listings broken down per facet value.
 *
 * v1 keeps it simple: counts are computed against the unfiltered published
 * set (snapshot at page load). Trade-off vs. the "minus-that-facet"
 * approach: filter labels stay stable as the user toggles, and we avoid
 * fan-out queries. Acceptable until the catalog grows enough that the
 * counts look misleading.
 *
 * Cached at the data layer; invalidated on publish/unpublish via
 * MARKETPLACE_TAG.
 */
export type MarketplaceFacetCounts = {
  sector: Record<string, number>;
  locationType: Record<string, number>;
  duration: Record<string, number>;
  paid: { paid: number; unpaid: number };
  language: Record<string, number>;
  city: Record<string, number>;
};

export async function computeFacetCounts(): Promise<MarketplaceFacetCounts> {
  const cached = unstable_cache(
    async (): Promise<MarketplaceFacetCounts> => {
      const baseWhere = and(
        eq(internships.status, 'published'),
        eq(organizations.verificationStatus, 'verified'),
      );

      const rows = await db
        .select({
          sector: internships.sector,
          locationType: internships.locationType,
          duration: internships.duration,
          isPaid: internships.isPaid,
          language: internships.language,
          city: organizations.city,
        })
        .from(internships)
        .innerJoin(organizations, eq(organizations.id, internships.organizationId))
        .where(baseWhere);

      const counts: MarketplaceFacetCounts = {
        sector: {},
        locationType: {},
        duration: { short: 0, medium: 0, long: 0 },
        paid: { paid: 0, unpaid: 0 },
        language: {},
        city: {},
      };

      for (const r of rows) {
        if (r.sector) counts.sector[r.sector] = (counts.sector[r.sector] ?? 0) + 1;
        if (r.locationType) counts.locationType[r.locationType] = (counts.locationType[r.locationType] ?? 0) + 1;
        if (typeof r.duration === 'number') {
          if (r.duration < 8) counts.duration.short += 1;
          else if (r.duration <= 12) counts.duration.medium += 1;
          else counts.duration.long += 1;
        }
        if (r.isPaid) counts.paid.paid += 1;
        else counts.paid.unpaid += 1;
        if (r.language) counts.language[r.language] = (counts.language[r.language] ?? 0) + 1;
        if (r.city) counts.city[r.city] = (counts.city[r.city] ?? 0) + 1;
      }

      return counts;
    },
    ['marketplace-facet-counts'],
    { tags: [MARKETPLACE_TAG], revalidate: 600 },
  );
  return cached();
}
