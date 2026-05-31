import { db } from '@/db';
import {
  notifications,
  users,
  applications,
  internships,
  projects,
  profiles,
  workspaces,
  organizationMembers,
  organizations,
  academicReports,
} from '@/db/schema';
import { eq, inArray, and } from 'drizzle-orm';
import { sendEmail } from '@/lib/email';
import { applicationReceivedTemplate } from '@/lib/email/templates/application-received';
import {
  applicationStatusTemplate,
  type ApplicationStatusForEmail,
} from '@/lib/email/templates/application-status';
import { checkInReminderTemplate } from '@/lib/email/templates/check-in-reminder';
import { academicReportSubmittedTemplate } from '@/lib/email/templates/academic-report-submitted';
import { academicReportReviewedTemplate } from '@/lib/email/templates/academic-report-reviewed';

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
      case 'application.status.changed':
        await onApplicationStatusChanged(event);
        break;
      case 'application.accepted':
        await onApplicationAccepted(event);
        break;
      case 'checkin.due':
        await onCheckinDue(event);
        break;
      case 'academicReport.submitted':
        await onAcademicReportSubmitted(event);
        break;
      case 'academicReport.approved':
        await onAcademicReportReviewed(event, 'approved');
        break;
      case 'academicReport.revision.requested':
        await onAcademicReportReviewed(event, 'revision');
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

  // Real applicant name, possibly empty (invited-but-not-onboarded applicants
  // have no name yet). Keep it RAW in `metadata` so the bell can localize the
  // empty case at the recipient's render-time locale; the English fallback only
  // lives where English is correct: the stored `body` (English-only by design).
  const applicantName =
    `${row.applicant.firstName ?? ''} ${row.applicant.lastName ?? ''}`.trim();

  for (const sup of supervisors) {
    const prefs = prefsFor(sup);

    if (prefs.notifyInApp) {
      await db.insert(notifications).values({
        recipientId: sup.id,
        type: 'application.received',
        body: `${applicantName || 'Someone'} applied to ${row.internship.title}`,
        href: row.project
          ? `/company/projects/${row.project.id}/applications/${row.app.id}`
          : `/company/applications/${row.app.id}`,
        metadata: {
          applicationId: row.app.id,
          internshipId: row.internship.id,
          applicantName,
          internshipTitle: row.internship.title,
        },
      });
    }

    if (prefs.notifyEmail) {
      const locale = await localeFor(sup.id);
      const tpl = applicationReceivedTemplate({
        // Pass raw names; the template localizes empty fallbacks (FR emails must
        // not say "Bonjour Supervisor," or "… Someone vient de postuler").
        supervisorName: sup.firstName ?? '',
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

// Applicant-facing statuses that notify on a plain status change, EXCLUDING
// 'accepted'. Accept is owned by onApplicationAccepted (it fires a separate
// application.accepted event); handling it here too would double-notify.
const NOTIFIABLE_STATUSES: ApplicationStatusForEmail[] = [
  'reviewed',
  'shortlisted',
  'interview',
  'rejected',
];

/**
 * Shared applicant-notification body. Re-selects the freshly-updated application
 * row (joined to internship + applicant) and reads applications.decisionNote
 * straight off the row, so the optional company→candidate feedback rides along
 * into both the email and (implicitly) whatever the applicant page renders.
 * Honors the recipient's per-channel prefs.
 */
async function notifyApplicant(
  applicationId: string,
  status: ApplicationStatusForEmail,
): Promise<void> {
  const [row] = await db
    .select({ app: applications, internship: internships, applicant: users })
    .from(applications)
    .innerJoin(internships, eq(internships.id, applications.internshipId))
    .innerJoin(users, eq(users.id, applications.applicantId))
    .where(eq(applications.id, applicationId))
    .limit(1);
  if (!row) return;

  const note = row.app.decisionNote ?? null;
  // Raw name (possibly empty); the email template localizes the greeting.
  const applicantName =
    `${row.applicant.firstName ?? ''} ${row.applicant.lastName ?? ''}`.trim();
  const prefs = prefsFor(row.applicant);

  if (prefs.notifyInApp) {
    await db.insert(notifications).values({
      recipientId: row.applicant.id,
      type: 'application.status',
      body: `Your application to ${row.internship.title} was ${status}`,
      href: `/intern/applications/${row.app.id}`,
      metadata: {
        applicationId: row.app.id,
        internshipId: row.internship.id,
        to: status,
        internshipTitle: row.internship.title,
      },
    });
  }

  if (prefs.notifyEmail) {
    const locale = await localeFor(row.applicant.id);
    const tpl = applicationStatusTemplate({
      applicantName,
      internshipTitle: row.internship.title,
      status,
      applicationId: row.app.id,
      locale,
      note: note ?? undefined,
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

async function onApplicationStatusChanged(event: DispatchInput): Promise<void> {
  if (!event.targetId) return;
  const newStatus = event.metadata?.to as string | undefined;
  if (!newStatus) return;
  if (newStatus === 'accepted') return;
  if (!(NOTIFIABLE_STATUSES as readonly string[]).includes(newStatus)) return;
  await notifyApplicant(event.targetId, newStatus as ApplicationStatusForEmail);
}

async function onApplicationAccepted(event: DispatchInput): Promise<void> {
  if (!event.targetId) return;
  await notifyApplicant(event.targetId, 'accepted');
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
      metadata: { workspaceId: row.workspace.id, internshipTitle: row.internship.title },
    });
  }

  if (prefs.notifyEmail) {
    const locale = await localeFor(row.intern.id);
    const tpl = checkInReminderTemplate({
      internName: row.intern.firstName ?? '',
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

async function onAcademicReportSubmitted(event: DispatchInput): Promise<void> {
  if (!event.targetId) return;

  const [row] = await db
    .select({ report: academicReports, student: users })
    .from(academicReports)
    .innerJoin(users, eq(users.id, academicReports.studentUserId))
    .where(eq(academicReports.id, event.targetId))
    .limit(1);
  if (!row) return;

  const version = (event.metadata?.version as number | undefined) ?? row.report.version;
  // Raw student name (possibly empty); the bell localizes the empty case at
  // render time. English fallback stays only on the English-only stored `body`.
  const studentName =
    `${row.student.firstName ?? ''} ${row.student.lastName ?? ''}`.trim();

  // Recipient = the student's assigned encadrant; fall back to the head (org
  // owner) when unassigned or the encadrant is no longer an active coordinator.
  // NEVER broadcast to all coordinators — gated visibility (spec §3.3c).
  // University↔student only — no canViewWorkspace, no workspace tables.
  const [studentMember] = await db
    .select({ assigned: organizationMembers.assignedCoordinatorId })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, row.report.universityOrgId),
        eq(organizationMembers.userId, row.report.studentUserId),
        eq(organizationMembers.role, 'student'),
      ),
    )
    .limit(1);

  let recipientId: string | null = studentMember?.assigned ?? null;

  // Guard: only notify an assigned encadrant who is still an active coordinator.
  if (recipientId) {
    const [stillActive] = await db
      .select({ userId: organizationMembers.userId })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, row.report.universityOrgId),
          eq(organizationMembers.userId, recipientId),
          eq(organizationMembers.status, 'active'),
          inArray(organizationMembers.role, ['owner', 'admin']),
        ),
      )
      .limit(1);
    if (!stillActive) recipientId = null;
  }

  if (!recipientId) {
    const [org] = await db
      .select({ ownerId: organizations.ownerId })
      .from(organizations)
      .where(eq(organizations.id, row.report.universityOrgId))
      .limit(1);
    recipientId = org?.ownerId ?? null;
  }
  if (!recipientId) return;

  const coordinators = await db.select().from(users).where(eq(users.id, recipientId));

  for (const coord of coordinators) {
    const prefs = prefsFor(coord);

    if (prefs.notifyInApp) {
      await db.insert(notifications).values({
        recipientId: coord.id,
        type: 'academicReport.submitted',
        body: `${studentName || 'A student'} submitted their report (v${version})`,
        href: `/university/students/${row.report.studentUserId}`,
        // `studentName` is carried in metadata so the notification bell can
        // render a localized line (the stored `body` is English-only).
        metadata: {
          reportId: row.report.id,
          studentUserId: row.report.studentUserId,
          version,
          studentName,
        },
      });
    }

    if (prefs.notifyEmail) {
      const locale = await localeFor(coord.id);
      const tpl = academicReportSubmittedTemplate({
        coordinatorName: coord.firstName ?? '',
        studentName,
        version,
        studentUserId: row.report.studentUserId,
        locale,
      });
      await sendEmail({
        to: coord.email,
        subject: tpl.subject,
        text: tpl.text,
        html: tpl.html,
        tags: [{ name: 'type', value: 'academicReport.submitted' }],
      });
    }
  }
}

async function onAcademicReportReviewed(
  event: DispatchInput,
  outcome: 'approved' | 'revision',
): Promise<void> {
  if (!event.targetId) return;

  const [row] = await db
    .select({ report: academicReports, student: users })
    .from(academicReports)
    .innerJoin(users, eq(users.id, academicReports.studentUserId))
    .where(eq(academicReports.id, event.targetId))
    .limit(1);
  if (!row) return;

  // Raw first name (possibly empty); the email template localizes the greeting.
  const studentName = row.student.firstName ?? '';
  const feedback = (event.metadata?.note as string | undefined) ?? undefined;
  const prefs = prefsFor(row.student);

  if (prefs.notifyInApp) {
    await db.insert(notifications).values({
      recipientId: row.student.id,
      type: outcome === 'approved' ? 'academicReport.approved' : 'academicReport.revision.requested',
      body:
        outcome === 'approved'
          ? 'Your report was approved'
          : 'Your report needs a revision',
      href: `/intern/university`,
      metadata: { reportId: row.report.id, outcome },
    });
  }

  if (prefs.notifyEmail) {
    const locale = await localeFor(row.student.id);
    const tpl = academicReportReviewedTemplate({ studentName, outcome, feedback, locale });
    await sendEmail({
      to: row.student.email,
      subject: tpl.subject,
      text: tpl.text,
      html: tpl.html,
      tags: [{ name: 'type', value: event.type }],
    });
  }
}
