'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { deliverables } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { loadWorkspaceAccess } from '@/modules/workspace/access';
import { ensureDeliverableShareToken } from './service';

export type EnsureShareTokenResult =
  | { ok: true; token: string }
  | { ok: false; error: string };

/**
 * Generate (or return the existing) public share token for a deliverable.
 *
 * Any workspace participant may share — both the intern and the supervisor —
 * so authz is just `loadWorkspaceAccess` (throws on Forbidden / Unauthorized),
 * matching how the other deliverable actions gate access. Mirrors the records
 * share-link pattern: idempotent, url-safe token, revalidate the workspace.
 */
export async function ensureDeliverableShareTokenAction(
  deliverableId: string,
): Promise<EnsureShareTokenResult> {
  const [deliverable] = await db
    .select()
    .from(deliverables)
    .where(eq(deliverables.id, deliverableId))
    .limit(1);
  if (!deliverable) return { ok: false, error: 'not_found' };

  try {
    // Any participant (intern or supervisor) is allowed — this throws on
    // Unauthorized / Forbidden / Workspace not found.
    await loadWorkspaceAccess(deliverable.workspaceId);
  } catch {
    return { ok: false, error: 'forbidden' };
  }

  // Fast path: already shared.
  if (deliverable.shareToken) {
    return { ok: true, token: deliverable.shareToken };
  }

  let token: string;
  try {
    token = await ensureDeliverableShareToken(deliverableId);
  } catch (e) {
    console.error('[deliverables/share] failed:', e);
    return { ok: false, error: 'share_failed' };
  }

  revalidatePath(`/intern/workspaces/${deliverable.workspaceId}`);
  revalidatePath(`/company/workspaces/${deliverable.workspaceId}`);
  revalidatePath(`/intern/workspaces/${deliverable.workspaceId}/deliverables`);
  revalidatePath(`/company/workspaces/${deliverable.workspaceId}/deliverables`);

  return { ok: true, token };
}
