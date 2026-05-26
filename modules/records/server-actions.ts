'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import {
  workspaces,
  organizations,
  profiles,
  type InternshipRecord,
} from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireSession } from '@/modules/auth/session';
import { issueRecord, revokeRecord } from './service';

export type IssueRecordResult =
  | { ok: true; recordId: string; shareToken: string }
  | { ok: false; error: string };

/**
 * Supervisor-initiated record issuance. Must be the org owner of the
 * workspace's organization (or admin).
 */
export async function issueRecordAction(input: {
  workspaceId: string;
  reviewText: string;
  rating: number | null;
}): Promise<IssueRecordResult> {
  const session = await requireSession();

  if (input.reviewText.trim().length < 40) {
    return { ok: false, error: 'review_too_short' };
  }
  if (input.rating !== null && (input.rating < 1 || input.rating > 5)) {
    return { ok: false, error: 'invalid_rating' };
  }

  const [ws] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, input.workspaceId))
    .limit(1);
  if (!ws) return { ok: false, error: 'workspace_not_found' };

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, ws.organizationId))
    .limit(1);
  if (!org) return { ok: false, error: 'org_not_found' };

  if (session.role !== 'admin' && org.ownerId !== session.user.id) {
    return { ok: false, error: 'forbidden' };
  }

  // Use the intern's preferred language if set; default to French.
  const [internProfile] = await db
    .select({ lang: profiles.preferredLanguage })
    .from(profiles)
    .where(eq(profiles.userId, ws.internId))
    .limit(1);
  const locale: 'fr' | 'en' = internProfile?.lang === 'en' ? 'en' : 'fr';

  let record: InternshipRecord;
  try {
    record = await issueRecord({
      workspaceId: input.workspaceId,
      supervisorId: session.user.id,
      reviewText: input.reviewText.trim(),
      rating: input.rating,
      locale,
    });
  } catch (e) {
    console.error('[records/issue] failed:', e);
    return { ok: false, error: 'issue_failed' };
  }

  revalidatePath(`/intern/workspace/${input.workspaceId}`, 'layout');
  revalidatePath(`/company/workspace/${input.workspaceId}`, 'layout');
  revalidatePath('/intern/records');
  return { ok: true, recordId: record.id, shareToken: record.shareToken };
}

export async function revokeRecordAction(recordId: string): Promise<{ ok: boolean }> {
  const session = await requireSession();
  if (session.role !== 'admin') return { ok: false };
  await revokeRecord(recordId);
  revalidatePath('/intern/records');
  return { ok: true };
}
