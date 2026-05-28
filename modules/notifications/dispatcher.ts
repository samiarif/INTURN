import { db } from '@/db';
import {
  notifications,
  users,
  applications,
  internships,
  projects,
  profiles,
  workspaces,
} from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { sendEmail } from '@/lib/email';
import { applicationReceivedTemplate } from '@/lib/email/templates/application-received';
import {
  applicationStatusTemplate,
  type ApplicationStatusForEmail,
} from '@/lib/email/templates/application-status';
import { checkInReminderTemplate } from '@/lib/email/templates/check-in-reminder';

type DispatchInput = {
  type: string;
  actorId: string | null;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
};

/**
 * Route an event to in-app notifications + transactional emails.
 * Called by recordEvent after inserting the event row. Best-effort:
 * any failure is logged but never thrown, so the originating action
 * always succeeds.
 */
export async function dispatchNotificationsFor(event: DispatchInput): Promise<void> {
  try {
    switch (event.type) {
      case 'application.created':
        await onApplicationCreated(event);
        break;
      case 'application.statusChanged':
      case 'application.status_changed':
        await onApplicationStatusChanged(event);
        break;
      case 'application.accepted':
        await onApplicationAccepted(event);
        break;
      case 'checkin.due':
        await onCheckinDue(event);
        break;
      // additional event types extend here
    }
  } catch (err) {
    console.error('[notifications/dispatcher] failed for', event.type, err);
  }
}

async function localeFor(userId: string): Promise<'fr' | 'en'> {
  const [row] = await db
    .select({ pref: profiles.preferredLanguage })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);
  return row?.pref === 'en' ? 'en' : 'fr';
}

/**
 * Recipient's master notification channel preferences (P9). Each dispatch
 * path already loads the recipient's full users row, so we read the toggles
 * straight off it — no extra query. Defaults are `true` (set NOT NULL DEFAULT
 * true in migration 0014), so users who never touched settings keep getting
 * everything; this gate only suppresses a channel a user explicitly turned
 * off. `notifyInApp=false` skips the in-app notification row; `notifyEmail=false`
 * skips the transactional email. The two are independent.
 */
type NotifyPrefs = { notifyInApp: boolean; notifyEmail: boolean };
function prefsFor(recipient: NotifyPrefs): NotifyPrefs {
  return {
    notifyInApp: recipient.notifyInApp ?? true,
    notifyEmail: recipient.notifyEmail ?? true,
  };
}

async function onApplicationCreated(event: DispatchInput): Promise<void> {
  if (!event.targetId) return;

  const [row] = await db
    .select({
      app: applications,
      internship: internships,
      project: projects,
      applicant: users,
    })
    .from(applications)
    .innerJoin(internships, eq(internships.id, applications.internshipId))
    .leftJoin(projects, eq(projects.id, internships.projectId))
    .innerJoin(users, eq(users.id, applications.applicantId))
    .where(eq(applications.id, event.targetId))
    .limit(1);
  if (!row) return;

  const supervisorIds = (row.project?.supervisorIds ?? []) as string[];
  if (supervisorIds.length === 0) return;

  const supervisors = await db
    .select()
    .from(users)
    .where(inArray(users.id, supervisorIds));

  const applicantName =
    `${row.applicant.firstName ?? ''} ${row.applicant.lastName ?? ''}`.trim() || 'Someone';

  for (const sup of supervisors) {
    const prefs = prefsFor(sup);

    if (prefs.notifyInApp) {
      await db.insert(notifications).values({
        recipientId: sup.id,
        type: 'application.received',
        body: `${applicantName} applied to ${row.internship.title}`,
        href: row.project
          ? `/company/projects/${row.project.id}/applications/${row.app.id}`
          : `/company/applications/${row.app.id}`,
        metadata: { applicationId: row.app.id, internshipId: row.internship.id },
      });
    }

    if (prefs.notifyEmail) {
      const locale = await localeFor(sup.id);
      const tpl = applicationReceivedTemplate({
        supervisorName: sup.firstName ?? 'Supervisor',
        internshipTitle: row.internship.title,
        applicantName,
        applicationId: row.app.id,
        locale,
      });
      await sendEmail({
        to: sup.email,
        subject: tpl.subject,
        text: tpl.text,
        html: tpl.html,
        tags: [{ name: 'type', value: 'application.received' }],
      });
    }
  }
}

async function onApplicationStatusChanged(event: DispatchInput): Promise<void> {
  if (!event.targetId) return;
  const newStatus = event.metadata?.to as string | undefined;
  if (!newStatus) return;
  const allowed: ApplicationStatusForEmail[] = [
    'reviewed',
    'shortlisted',
    'interview',
    'accepted',
    'rejected',
  ];
  if (!(allowed as readonly string[]).includes(newStatus)) return;

  const [row] = await db
    .select({
      app: applications,
      internship: internships,
      applicant: users,
    })
    .from(applications)
    .innerJoin(internships, eq(internships.id, applications.internshipId))
    .innerJoin(users, eq(users.id, applications.applicantId))
    .where(eq(applications.id, event.targetId))
    .limit(1);
  if (!row) return;

  const applicantName =
    `${row.applicant.firstName ?? ''} ${row.applicant.lastName ?? ''}`.trim() || 'there';
  const prefs = prefsFor(row.applicant);

  if (prefs.notifyInApp) {
    await db.insert(notifications).values({
      recipientId: row.applicant.id,
      type: 'application.status',
      body: `Your application to ${row.internship.title} was ${newStatus}`,
      href: `/intern/applications/${row.app.id}`,
      metadata: {
        applicationId: row.app.id,
        internshipId: row.internship.id,
        to: newStatus,
      },
    });
  }

  if (prefs.notifyEmail) {
    const locale = await localeFor(row.applicant.id);
    const tpl = applicationStatusTemplate({
      applicantName,
      internshipTitle: row.internship.title,
      status: newStatus as ApplicationStatusForEmail,
      applicationId: row.app.id,
      locale,
    });
    await sendEmail({
      to: row.applicant.email,
      subject: tpl.subject,
      text: tpl.text,
      html: tpl.html,
      tags: [{ name: 'type', value: 'application.status' }],
    });
  }
}

async function onApplicationAccepted(event: DispatchInput): Promise<void> {
  // Acceptance also flows through statusChanged via the service layer, so
  // this is just an extra in-app notification if we want a distinct event.
  // For v1, treat as a status change with status='accepted'.
  await onApplicationStatusChanged({
    ...event,
    metadata: { ...(event.metadata ?? {}), to: 'accepted' },
  });
}

async function onCheckinDue(event: DispatchInput): Promise<void> {
  if (!event.targetId) return;

  const [row] = await db
    .select({
      workspace: workspaces,
      internship: internships,
      intern: users,
    })
    .from(workspaces)
    .innerJoin(internships, eq(internships.id, workspaces.internshipId))
    .innerJoin(users, eq(users.id, workspaces.internId))
    .where(eq(workspaces.id, event.targetId))
    .limit(1);
  if (!row) return;
  const prefs = prefsFor(row.intern);

  if (prefs.notifyInApp) {
    await db.insert(notifications).values({
      recipientId: row.intern.id,
      type: 'checkin.due',
      body: `Weekly check-in due for ${row.internship.title}`,
      href: `/intern/workspaces/${row.workspace.id}/check-in`,
      metadata: { workspaceId: row.workspace.id },
    });
  }

  if (prefs.notifyEmail) {
    const locale = await localeFor(row.intern.id);
    const tpl = checkInReminderTemplate({
      internName: row.intern.firstName ?? 'there',
      workspaceTitle: row.internship.title,
      workspaceId: row.workspace.id,
      locale,
    });
    await sendEmail({
      to: row.intern.email,
      subject: tpl.subject,
      text: tpl.text,
      html: tpl.html,
      tags: [{ name: 'type', value: 'checkin.due' }],
    });
  }
}
