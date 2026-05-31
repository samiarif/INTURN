import { randomBytes } from 'node:crypto';
import { db } from '@/db';
import {
  internshipRecords,
  workspaces,
  type InternshipRecord,
} from '@/db/schema';
import { eq } from 'drizzle-orm';
import { buildRecordSnapshot, findActiveRecordByWorkspace } from './queries';

/**
 * URL-safe 24-byte token. Collisions are astronomically unlikely; the
 * column has a unique constraint so we retry on the rare clash.
 */
function generateShareToken(): string {
  return randomBytes(24).toString('base64url');
}

export type IssueRecordInput = {
  workspaceId: string;
  supervisorId: string;
  reviewText: string;
  rating: number | null;
  locale: 'fr' | 'en';
};

/**
 * Issue a new record for a workspace. Revokes any existing active record
 * first — a workspace has at most one valid record at a time, but the
 * supervisor can re-issue with an updated review.
 */
export async function issueRecord(input: IssueRecordInput): Promise<InternshipRecord> {
  const [ws] = await db.select().from(workspaces).where(eq(workspaces.id, input.workspaceId)).limit(1);
  if (!ws) throw new Error('Workspace not found');

  const existing = await findActiveRecordByWorkspace(input.workspaceId);

  // Build the snapshot BEFORE touching any record. neon-http has no
  // transactions, so a failure here must not have already revoked the intern's
  // existing credential.
  const snapshot = await buildRecordSnapshot({
    workspaceId: input.workspaceId,
    reviewText: input.reviewText,
    rating: input.rating,
    supervisorId: input.supervisorId,
    locale: input.locale,
  });

  // Insert the NEW record first; only revoke the old one once the replacement
  // exists. A crash anywhere before the revoke leaves the existing record valid
  // — worst case a brief overlap of two active records, never a gap with none.
  let created: InternshipRecord | null = null;
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const [row] = await db
        .insert(internshipRecords)
        .values({
          workspaceId: input.workspaceId,
          internshipId: ws.internshipId,
          internUserId: ws.internId,
          organizationId: ws.organizationId,
          generatedBy: input.supervisorId,
          shareToken: generateShareToken(),
          snapshot,
        })
        .returning();
      created = row;
      break;
    } catch (e: unknown) {
      lastErr = e;
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes('share_token')) throw e;
    }
  }
  if (!created) throw lastErr ?? new Error('Failed to issue record after 3 attempts');

  if (existing) {
    await db
      .update(internshipRecords)
      .set({ revokedAt: new Date() })
      .where(eq(internshipRecords.id, existing.id));
  }

  return created;
}

/**
 * Soft revoke — public viewer returns "revoked"; PDF route returns 410.
 */
export async function revokeRecord(id: string): Promise<void> {
  await db
    .update(internshipRecords)
    .set({ revokedAt: new Date() })
    .where(eq(internshipRecords.id, id));
}
