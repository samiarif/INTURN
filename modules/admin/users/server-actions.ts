'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/modules/auth/session';
import { recordAuditLog } from '@/modules/audit/service';

export type ToggleSuspendResult = { ok: boolean; suspended: boolean };

/**
 * Toggle a user's suspended state. Admin only. Refuses to suspend other
 * admins — that's a "support manually" path. Audit logged.
 */
export async function toggleSuspendAction(input: {
  userId: string;
  reason?: string;
}): Promise<ToggleSuspendResult> {
  const session = await requireAdmin();
  if (input.userId === session.user.id) {
    throw new Error('Cannot suspend yourself');
  }

  const [target] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
  if (!target) throw new Error('User not found');
  if (target.role === 'admin') throw new Error('Admins cannot be suspended via this UI');

  const nowSuspended = !target.suspendedAt;
  const [updated] = await db
    .update(users)
    .set({
      suspendedAt: nowSuspended ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, input.userId))
    .returning();

  await recordAuditLog({
    actorId: session.user.id,
    action: nowSuspended ? 'user.suspend' : 'user.unsuspend',
    targetType: 'user',
    targetId: input.userId,
    metadata: {
      targetEmail: target.email,
      targetRole: target.role,
      reason: input.reason ?? null,
    },
  });

  revalidatePath('/admin/users');
  return { ok: true, suspended: Boolean(updated.suspendedAt) };
}
