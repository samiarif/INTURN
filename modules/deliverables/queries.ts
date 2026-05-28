import { cache } from 'react';
import { db } from '@/db';
import { deliverables, type Deliverable } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Public lookup by share token — mirrors records' `findRecordByShareToken`.
 * No auth: the token IS the credential. Returns null for unknown tokens.
 *
 * The deliverable row already carries its full version history in the
 * `revisionHistory` jsonb column plus the live "current" version on the
 * row itself, so a single row is the whole public payload.
 */
export const getDeliverableByShareToken = cache(
  async (token: string): Promise<Deliverable | null> => {
    if (!token) return null;
    const [row] = await db
      .select()
      .from(deliverables)
      .where(eq(deliverables.shareToken, token))
      .limit(1);
    return row ?? null;
  },
);
