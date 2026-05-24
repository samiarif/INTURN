import { db } from '@/db';
import { internshipBookmarks, internships, organizations } from '@/db/schema';
import { and, desc, eq, inArray } from 'drizzle-orm';

export async function isBookmarked(internId: string, internshipId: string): Promise<boolean> {
  const [row] = await db
    .select({ internId: internshipBookmarks.internId })
    .from(internshipBookmarks)
    .where(
      and(
        eq(internshipBookmarks.internId, internId),
        eq(internshipBookmarks.internshipId, internshipId),
      ),
    )
    .limit(1);
  return Boolean(row);
}

export async function listInternBookmarks(internId: string) {
  return db
    .select({
      bookmark: internshipBookmarks,
      internship: internships,
      organization: organizations,
    })
    .from(internshipBookmarks)
    .innerJoin(internships, eq(internships.id, internshipBookmarks.internshipId))
    .innerJoin(organizations, eq(organizations.id, internships.organizationId))
    .where(eq(internshipBookmarks.internId, internId))
    .orderBy(desc(internshipBookmarks.createdAt))
    .limit(100);
}

/**
 * Bulk lookup: of a candidate set of internship IDs, which ones are bookmarked
 * by the given intern? Used to decorate marketplace listings without N+1.
 */
export async function getBookmarkedSet(
  internId: string,
  internshipIds: string[],
): Promise<Set<string>> {
  if (internshipIds.length === 0) return new Set();
  const rows = await db
    .select({ internshipId: internshipBookmarks.internshipId })
    .from(internshipBookmarks)
    .where(
      and(
        eq(internshipBookmarks.internId, internId),
        inArray(internshipBookmarks.internshipId, internshipIds),
      ),
    );
  return new Set(rows.map((r) => r.internshipId));
}
