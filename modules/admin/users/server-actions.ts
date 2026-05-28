'use server';

import { revalidatePath } from 'next/cache';
import { clerkClient } from '@clerk/nextjs/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/modules/auth/session';
import { recordAuditLog } from '@/modules/audit/service';

export type ToggleSuspendResult = { ok: boolean; suspended: boolean };

export type Role = 'intern' | 'company' | 'admin';
const ROLES: ReadonlyArray<Role> = ['intern', 'company', 'admin'];

export type SetUserRoleResult = { ok: boolean; role: Role };

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

/**
 * Change a user's role among intern | company | admin. Admin only.
 *
 * The DB `users.role` is the source of truth for the app's role fallback
 * (see modules/auth/session.ts). We also best-effort sync the new role to
 * Clerk's publicMetadata so the JWT claim stays in step — but that call is
 * wrapped in try/catch: in dev-bypass / offline mode Clerk is unreachable,
 * and an admin changing a role must never crash because of that. The DB
 * write is what matters; the Clerk sync is opportunistic.
 *
 * Guards against self-lockout: an admin cannot change their own role (the
 * UI also disables the control on the admin's own row).
 */
export async function setUserRoleAction(input: {
  userId: string;
  role: Role;
}): Promise<SetUserRoleResult> {
  const session = await requireAdmin();

  if (!ROLES.includes(input.role)) {
    throw new Error('Invalid role');
  }
  if (input.userId === session.user.id) {
    throw new Error('Cannot change your own role');
  }

  const [target] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
  if (!target) throw new Error('User not found');

  const before = target.role ?? null;
  if (before === input.role) {
    // No-op — already this role. Don't write an audit entry for nothing.
    return { ok: true, role: input.role };
  }

  await db
    .update(users)
    .set({ role: input.role, updatedAt: new Date() })
    .where(eq(users.id, input.userId));

  // Best-effort Clerk sync. Swallow + log any failure (offline / dev-bypass).
  try {
    const clerk = await clerkClient();
    await clerk.users.updateUser(target.clerkId, {
      publicMetadata: { role: input.role },
    });
  } catch (err) {
    console.error('[admin/setUserRole] clerk sync failed (DB role is source of truth):', err);
  }

  await recordAuditLog({
    actorId: session.user.id,
    action: 'user.role_changed',
    targetType: 'user',
    targetId: input.userId,
    metadata: {
      targetEmail: target.email,
      before,
      after: input.role,
    },
  });

  revalidatePath('/admin/users');
  return { ok: true, role: input.role };
}
