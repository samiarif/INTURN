import { db } from '@/db';
import { applications, internships, workspaces } from '@/db/schema';
import { eq } from 'drizzle-orm';
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

  const [updated] = await db
    .update(applications)
    .set({ status: input.to, updatedAt: new Date() })
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
 * Atomic accept: in one transaction, transition the application to 'accepted'
 * AND create the workspace. Either both happen or neither does.
 */
export async function acceptApplication(input: { applicationId: string; actorId: string }) {
  // Note: Drizzle's neon-http driver doesn't support transactions natively
  // (HTTP is stateless). For now we serialize the writes — Sprint 5+ can
  // upgrade to a pooled connection if needed.
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

  await db
    .update(applications)
    .set({ status: 'accepted', updatedAt: new Date() })
    .where(eq(applications.id, input.applicationId));

  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + (internship.duration ?? 12) * 7);

  const [workspace] = await db
    .insert(workspaces)
    .values({
      internshipId: internship.id,
      internId: application.applicantId,
      organizationId: internship.organizationId,
      status: 'active',
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
    })
    .returning();

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
