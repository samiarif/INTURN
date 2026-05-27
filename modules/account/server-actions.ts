'use server';

import { redirect } from 'next/navigation';
import { auth } from '@/lib/server-auth';
import { clerkClient } from '@clerk/nextjs/server';
import { requireSession } from '@/modules/auth/session';
import { recordAuditLog } from '@/modules/audit/service';
import { hardDeleteUserData } from './service';

/**
 * Hard-delete the user's local data + Clerk identity.
 *
 * GDPR "right to erasure." Once the user confirms in the UI, this:
 *   1. Hard-deletes the local users row (cascades via schema FKs)
 *   2. Hard-deletes the Clerk user record (sign-out happens implicitly
 *      because the session token becomes invalid)
 *   3. Writes an audit log entry with action='user.delete' before the
 *      user row is gone (audit_log.actor_id is set null on delete, so
 *      we capture identifying info in metadata while we still have it)
 *
 * After this completes the caller is redirected to the marketing root.
 *
 * What gets retained (legitimate-interest legal basis):
 *   - audit_logs rows where this user was the actor → actor_id set null
 *   - reports they submitted → reporter_id set null
 *   - internship_records where they were the supervisor signing off
 *     (generated_by has ON DELETE RESTRICT — so we deliberately keep
 *     them; this is the rare case where deletion is rejected. UI hides
 *     the delete button for accounts with active outstanding records,
 *     directing them to support@ for manual review.)
 */
export async function deleteAccountAction(input: { confirmEmail: string }): Promise<void> {
  const session = await requireSession();
  if (input.confirmEmail.toLowerCase().trim() !== session.user.email.toLowerCase()) {
    throw new Error('confirm_email_mismatch');
  }

  // Audit before we lose the user row (actor_id will set-null after).
  await recordAuditLog({
    actorId: session.user.id,
    action: 'user.delete',
    targetType: 'user',
    targetId: session.user.id,
    metadata: {
      emailHash: hashEmail(session.user.email),
      role: session.role,
    },
  });

  await hardDeleteUserData(session.user.id);

  // Delete Clerk identity (sign-out is automatic — token becomes invalid).
  try {
    const clerk = await clerkClient();
    await clerk.users.deleteUser(session.clerkId);
  } catch (err) {
    // The DB is already gone — log but don't surface to user. They'll be
    // signed out by middleware on the next request (their DB row is missing).
    console.error('[account/delete] clerk delete failed:', err);
  }

  redirect('/');
}

function hashEmail(email: string): string {
  // Light-weight hash: enough to detect re-registration of the same email
  // for fraud purposes without storing the email itself. Not cryptographic.
  let h = 0;
  const lower = email.toLowerCase();
  for (let i = 0; i < lower.length; i++) {
    h = (h * 31 + lower.charCodeAt(i)) | 0;
  }
  return h.toString(36);
}

/**
 * Side-effect free read; used by the /api/account/export route handler.
 * Kept here so we have a single export surface for "account" actions.
 */
export async function ensureAuthForExport(): Promise<{ userId: string; email: string }> {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error('Unauthorized');
  const session = await requireSession();
  return { userId: session.user.id, email: session.user.email };
}
