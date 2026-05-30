import { db } from '@/db';
import { applications, internships, workspaces } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { recordEvent } from '@/modules/events/service';

export type ApplicationStatus =
  | 'new'
  | 'reviewed'
  | 'shortlisted'
  | 'interview'
  | 'accepted'
  | 'rejected';

const VALID_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  new: ['reviewed', 'rejected'],
  reviewed: ['shortlisted', 'rejected'],
  shortlisted: ['interview', 'accepted', 'rejected'],
  interview: ['accepted', 'rejected'],
  accepted: [],
  rejected: [],
};

export function isValidApplicationTransition(
  from: ApplicationStatus,
  to: ApplicationStatus,
): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

export async function createApplication(input: {
  internshipId: string;
  applicantId: string;
  coverNote?: string;
  customAnswers?: Array<{ question: string; answer: string }>;
  actorId: string;
}) {
  // Reject duplicates (one application per intern per internship)
  const existing = await db
    .select()
    .from(applications)
    .where(eq(applications.internshipId, input.internshipId))
    .limit(50);
  const dup = existing.find((a) => a.applicantId === input.applicantId);
  if (dup) throw new Error('You have already applied to this internship');

  const [created] = await db
    .insert(applications)
    .values({
      internshipId: input.internshipId,
      applicantId: input.applicantId,
      coverNote: input.coverNote,
      customAnswers: input.customAnswers,
      status: 'new',
    })
    .returning();

  await recordEvent({
    type: 'application.created',
    actorId: input.actorId,
    targetType: 'application',
    targetId: created.id,
    metadata: { internshipId: input.internshipId },
  });

  return created;
}

export async function transitionApplicationStatus(input: {
  applicationId: string;
  to: ApplicationStatus;
  actorId: string;
  decisionNote?: string;
}) {
  const [current] = await db
    .select()
    .from(applications)
    .where(eq(applications.id, input.applicationId))
    .limit(1);
  if (!current) throw new Error('Application not found');
  const from = current.status as ApplicationStatus;
  if (!isValidApplicationTransition(from, input.to)) {
    throw new Error(`Invalid transition: ${from} → ${input.to}`);
  }

  // Persist optional applicant-visible feedback in the SAME update that flips
  // status, BEFORE recordEvent fires — so the dispatcher's re-select reads it off
  // the freshly-updated row. Empty/whitespace → undefined: leave the column as-is.
  const decisionNote = input.decisionNote?.trim() || undefined;

  const [updated] = await db
    .update(applications)
    .set({
      status: input.to,
      ...(decisionNote !== undefined ? { decisionNote } : {}),
      updatedAt: new Date(),
    })
    .where(eq(applications.id, input.applicationId))
    .returning();

  await recordEvent({
    type: 'application.status.changed',
    actorId: input.actorId,
    targetType: 'application',
    targetId: input.applicationId,
    metadata: { from, to: input.to },
  });

  return updated;
}

export async function updateInternalNotes(input: {
  applicationId: string;
  notes: string;
}) {
  await db
    .update(applications)
    .set({ internalNotes: input.notes, updatedAt: new Date() })
    .where(eq(applications.id, input.applicationId));
}

/**
 * Crash-safe accept: workspace is created FIRST, then the application status
 * is flipped to 'accepted'. If the process dies between the two writes, the
 * application remains 'pending' (safe to retry) rather than being left in an
 * 'accepted' state with no workspace.
 *
 * The neon-http driver is stateless HTTP and does not support db.transaction(),
 * so we rely on write ordering + an idempotency guard instead.
 */
export async function acceptApplication(input: {
  applicationId: string;
  actorId: string;
  decisionNote?: string;
}) {
  const [application] = await db
    .select()
    .from(applications)
    .where(eq(applications.id, input.applicationId))
    .limit(1);
  if (!application) throw new Error('Application not found');

  const from = application.status as ApplicationStatus;
  if (!isValidApplicationTransition(from, 'accepted')) {
    throw new Error(`Cannot accept from status ${from}`);
  }

  const [internship] = await db
    .select()
    .from(internships)
    .where(eq(internships.id, application.internshipId))
    .limit(1);
  if (!internship) throw new Error('Internship not found');

  // Idempotency: reuse an existing workspace for this (intern, internship) pair
  // rather than inserting a duplicate (e.g. a retry after a partial failure).
  const [existingWorkspace] = await db
    .select()
    .from(workspaces)
    .where(
      and(
        eq(workspaces.internId, application.applicantId),
        eq(workspaces.internshipId, internship.id),
      ),
    )
    .limit(1);

  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + (internship.duration ?? 12) * 7);

  // Write 1: create (or reuse) workspace BEFORE flipping application status.
  // A crash here leaves the application still pending — safe to retry.
  const workspace =
    existingWorkspace ??
    (
      await db
        .insert(workspaces)
        .values({
          internshipId: internship.id,
          internId: application.applicantId,
          organizationId: internship.organizationId,
          status: 'active',
          startDate: startDate.toISOString().slice(0, 10),
          endDate: endDate.toISOString().slice(0, 10),
        })
        .returning()
    )[0];

  // Write 2: only after the workspace exists, mark the application accepted. The
  // optional decision note rides on this same UPDATE, before recordEvent fires.
  const decisionNote = input.decisionNote?.trim() || undefined;
  await db
    .update(applications)
    .set({
      status: 'accepted',
      ...(decisionNote !== undefined ? { decisionNote } : {}),
      updatedAt: new Date(),
    })
    .where(eq(applications.id, input.applicationId));

  await recordEvent({
    type: 'application.status.changed',
    actorId: input.actorId,
    targetType: 'application',
    targetId: input.applicationId,
    metadata: { from, to: 'accepted' },
  });
  await recordEvent({
    type: 'application.accepted',
    actorId: input.actorId,
    targetType: 'application',
    targetId: input.applicationId,
    metadata: { workspaceId: workspace.id },
  });
  await recordEvent({
    type: 'workspace.created',
    actorId: input.actorId,
    targetType: 'workspace',
    targetId: workspace.id,
    metadata: { applicationId: input.applicationId, internshipId: application.internshipId },
  });

  return { application, workspace };
}
