/**
 * Pulse push — the weekly sweep. For each ACTIVE internship, compute Pulse;
 * for every supervisor (org owner) with an intern at attention/at-risk, send
 * ONE in-app notification + ONE digest email (their localePref, honoring the
 * per-channel notify prefs). This is the "co-supervisor taps you on the
 * shoulder" half of Pulse. Best-effort per supervisor — one failure never
 * aborts the sweep. Triggered by the /api/cron/pulse route.
 */
import { db } from '@/db';
import { workspaces, users, organizations, notifications, type User } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { sendEmail } from '@/lib/email';
import { computePulse } from './engine';
import { pulseDigestTemplate, type PulseAlert } from '@/lib/email/templates/pulse-digest';

export type PulseSweepResult = {
  workspacesScanned: number;
  alerts: number;
  supervisorsNotified: number;
};

export async function runPulseSweep(): Promise<PulseSweepResult> {
  const active = await db.select().from(workspaces).where(eq(workspaces.status, 'active'));

  // Bucket alerts per supervisor (org owner).
  const buckets = new Map<string, { owner: User; alerts: PulseAlert[] }>();
  let scanned = 0;
  let alertCount = 0;

  for (const ws of active) {
    scanned++;
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, ws.organizationId))
      .limit(1);
    if (!org) continue;

    let bucket = buckets.get(org.ownerId);
    if (!bucket) {
      const [owner] = await db.select().from(users).where(eq(users.id, org.ownerId)).limit(1);
      if (!owner) continue;
      bucket = { owner, alerts: [] };
      buckets.set(org.ownerId, bucket);
    }

    const locale = (bucket.owner.localePref ?? 'fr') as 'fr' | 'en';
    const pulse = await computePulse(ws.id, locale);
    if (!pulse || (pulse.status !== 'attention' && pulse.status !== 'at-risk')) continue;

    const [intern] = await db.select().from(users).where(eq(users.id, ws.internId)).limit(1);
    const internName =
      [intern?.firstName, intern?.lastName].filter(Boolean).join(' ').trim() ||
      intern?.email ||
      (locale === 'fr' ? 'Stagiaire' : 'Intern');

    bucket.alerts.push({
      internName,
      status: pulse.status,
      headline: pulse.headline,
      action: pulse.action,
      workspaceId: ws.id,
    });
    alertCount++;
  }

  let notified = 0;
  for (const { owner, alerts } of buckets.values()) {
    if (alerts.length === 0) continue;
    try {
      await notifySupervisor(owner, alerts);
      notified++;
    } catch (err) {
      console.error('[pulse/notify] failed for', owner.id, err);
    }
  }

  return { workspacesScanned: scanned, alerts: alertCount, supervisorsNotified: notified };
}

export async function notifySupervisor(owner: User, alerts: PulseAlert[]): Promise<void> {
  const locale = (owner.localePref ?? 'fr') as 'fr' | 'en';
  const n = alerts.length;

  if (owner.notifyInApp) {
    const body =
      locale === 'fr'
        ? `Pulse · ${n === 1 ? '1 stagiaire a' : `${n} stagiaires ont`} besoin de votre attention`
        : `Pulse · ${n} intern${n === 1 ? '' : 's'} need${n === 1 ? 's' : ''} your attention`;
    await db.insert(notifications).values({
      recipientId: owner.id,
      type: 'pulse.alert',
      body,
      href: locale === 'en' ? '/en/company/dashboard' : '/company/dashboard',
      metadata: { count: n },
    });
  }

  if (owner.notifyEmail && owner.email) {
    try {
      const tpl = pulseDigestTemplate({
        supervisorName: owner.firstName ?? (locale === 'fr' ? 'Superviseur' : 'Supervisor'),
        alerts,
        locale,
      });
      await sendEmail({
        to: owner.email,
        subject: tpl.subject,
        text: tpl.text,
        html: tpl.html,
        tags: [{ name: 'type', value: 'pulse.alert' }],
      });
    } catch (err) {
      // Best-effort: a missing RESEND key (local) or a send hiccup must not
      // undo the in-app notification we already wrote.
      console.error('[pulse/notify] email send failed for', owner.id, err);
    }
  }
}
