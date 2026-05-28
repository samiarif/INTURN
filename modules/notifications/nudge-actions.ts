'use server';

import { db } from '@/db';
import { notifications, users, internships, workspaces } from '@/db/schema';
import { and, eq, gt } from 'drizzle-orm';
import { loadWorkspaceAccess } from '@/modules/workspace/access';
import { sendEmail } from '@/lib/email';
import { nudgeTemplate } from '@/lib/email/templates/nudge';

const MAX_MESSAGE_LENGTH = 280;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

async function localeFor(userId: string): Promise<'fr' | 'en'> {
  const { profiles } = await import('@/db/schema');
  const [row] = await db
    .select({ pref: profiles.preferredLanguage })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);
  return row?.pref === 'en' ? 'en' : 'fr';
}

/**
 * Send a nudge from a supervisor to the intern in a workspace.
 * Rate-limited to 1 nudge per 24 hours per workspace (DB-enforced, durable).
 */
export async function sendNudgeAction(
  workspaceId: string,
  message: string | null,
): Promise<{ ok: true } | { ok: false; error: 'forbidden' | 'rate_limited' | 'failed' }> {
  try {
    const { session, workspace } = await loadWorkspaceAccess(workspaceId);

    // Only supervisors/admins can nudge — interns cannot.
    if (session.role !== 'company' && session.role !== 'admin') {
      return { ok: false, error: 'forbidden' };
    }

    // Durable rate-limit: check if a nudge notification for this workspace's
    // intern was already created in the last 24 hours.
    const since = new Date(Date.now() - TWENTY_FOUR_HOURS_MS);
    const [existing] = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientId, workspace.internId),
          eq(notifications.type, 'nudge'),
          gt(notifications.createdAt, since),
        ),
      )
      .limit(1);

    if (existing) {
      return { ok: false, error: 'rate_limited' };
    }

    // Sanitize message.
    const trimmedMessage =
      message && message.trim().length > 0
        ? message.trim().slice(0, MAX_MESSAGE_LENGTH)
        : null;

    // Fetch intern + internship data for notification content.
    const [row] = await db
      .select({
        intern: users,
        internship: internships,
      })
      .from(workspaces)
      .innerJoin(internships, eq(internships.id, workspaces.internshipId))
      .innerJoin(users, eq(users.id, workspaces.internId))
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    if (!row) {
      return { ok: false, error: 'failed' };
    }

    const supervisorName =
      `${session.user.firstName ?? ''} ${session.user.lastName ?? ''}`.trim() ||
      'Your supervisor';

    const body = trimmedMessage
      ? `Your supervisor sent a nudge: "${trimmedMessage}"`
      : 'Your supervisor sent a nudge.';

    // Insert in-app notification.
    await db.insert(notifications).values({
      recipientId: workspace.internId,
      type: 'nudge',
      body,
      href: `/intern/workspaces/${workspaceId}`,
      metadata: {
        workspaceId,
        supervisorId: session.user.id,
        message: trimmedMessage,
      },
    });

    // Fire-and-forget email — failure is caught and logged, never thrown.
    // Honor the recipient's master email toggle (P9). The in-app nudge above
    // is always created: it carries the rate-limit marker and is the primary
    // payload of this deliberate, rate-limited action; only the email channel
    // is suppressible here. `notifyEmail` defaults to true (migration 0014).
    try {
      if (row.intern.notifyEmail ?? true) {
        const locale = await localeFor(workspace.internId);
        const tpl = nudgeTemplate({
          internName: row.intern.firstName ?? 'there',
          supervisorName,
          workspaceTitle: row.internship.title,
          workspaceId,
          message: trimmedMessage,
          locale,
        });
        await sendEmail({
          to: row.intern.email,
          subject: tpl.subject,
          text: tpl.text,
          html: tpl.html,
          tags: [{ name: 'type', value: 'nudge' }],
        });
      }
    } catch (emailErr) {
      // Email is best-effort. The in-app notification was already created.
      // This path triggers locally when RESEND_API_KEY is unset — degrade
      // gracefully and do not surface the error to the user.
      console.error('[nudge] email failed (non-fatal):', emailErr);
    }

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === 'Forbidden') return { ok: false, error: 'forbidden' };
    console.error('[nudge] sendNudgeAction failed:', err);
    return { ok: false, error: 'failed' };
  }
}
