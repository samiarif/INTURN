'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { internshipBookmarks } from '@/db/schema';
import { requireSession } from '@/modules/auth/session';
import { and, eq } from 'drizzle-orm';

export type ToggleResult = { bookmarked: boolean };

/**
 * Toggle a bookmark for the current intern. Idempotent semantics:
 * - If a row exists for (internId, internshipId), delete it and return
 *   `{ bookmarked: false }`.
 * - Otherwise insert it and return `{ bookmarked: true }`.
 *
 * Composite primary key on `(intern_id, internship_id)` means concurrent
 * double-clicks can't create duplicates even if our select-then-branch
 * pattern races with itself.
 */
export async function toggleBookmarkAction(internshipId: string): Promise<ToggleResult> {
  const session = await requireSession();
  if (session.role !== 'intern') {
    throw new Error('Only interns can bookmark internships');
  }

  const [existing] = await db
    .select()
    .from(internshipBookmarks)
    .where(
      and(
        eq(internshipBookmarks.internId, session.user.id),
        eq(internshipBookmarks.internshipId, internshipId),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .delete(internshipBookmarks)
      .where(
        and(
          eq(internshipBookmarks.internId, session.user.id),
          eq(internshipBookmarks.internshipId, internshipId),
        ),
      );
    revalidatePath('/intern/saved');
    return { bookmarked: false };
  }

  await db.insert(internshipBookmarks).values({
    internId: session.user.id,
    internshipId,
  });
  revalidatePath('/intern/saved');
  return { bookmarked: true };
}
