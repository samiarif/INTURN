import { cache } from 'react';
import { db } from '@/db';
import {
  internshipRecords,
  internships,
  workspaces,
  organizations,
  users,
  profiles,
  deliverables,
  tasks,
  type InternshipRecord,
  type RecordSnapshot,
} from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export type RecordWithRelations = InternshipRecord;

/**
 * Public lookup by share token. Returns null for unknown OR revoked records.
 */
export const findRecordByShareToken = cache(
  async (token: string): Promise<InternshipRecord | null> => {
    const [row] = await db
      .select()
      .from(internshipRecords)
      .where(eq(internshipRecords.shareToken, token))
      .limit(1);
    if (!row || row.revokedAt) return null;
    return row;
  },
);

/**
 * Owner lookup (intern or supervisor / org owner). Used by the PDF route.
 */
export async function findRecordById(id: string): Promise<InternshipRecord | null> {
  const [row] = await db
    .select()
    .from(internshipRecords)
    .where(eq(internshipRecords.id, id))
    .limit(1);
  return row ?? null;
}

/**
 * Existing record for a given workspace (a workspace can have at most one
 * active record — supervisor re-issues by revoking + generating again).
 */
export async function findActiveRecordByWorkspace(
  workspaceId: string,
): Promise<InternshipRecord | null> {
  const [row] = await db
    .select()
    .from(internshipRecords)
    .where(
      and(eq(internshipRecords.workspaceId, workspaceId), sql`${internshipRecords.revokedAt} IS NULL`),
    )
    .limit(1);
  return row ?? null;
}

/**
 * All records the intern has earned, newest first. For the /intern/records list.
 */
export async function listRecordsForIntern(internUserId: string): Promise<InternshipRecord[]> {
  return db
    .select()
    .from(internshipRecords)
    .where(eq(internshipRecords.internUserId, internUserId))
    .orderBy(sql`${internshipRecords.createdAt} DESC`);
}

/**
 * Build the snapshot payload from live data. Called when a supervisor
 * issues a new record — freezes everything that needs to appear on the
 * PDF / public viewer so future profile/org edits don't break the record.
 */
export async function buildRecordSnapshot(input: {
  workspaceId: string;
  reviewText: string;
  rating: number | null;
  supervisorId: string;
  locale: 'fr' | 'en';
}): Promise<RecordSnapshot> {
  const [ws] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, input.workspaceId))
    .limit(1);
  if (!ws) throw new Error('Workspace not found');

  const [internship] = await db
    .select()
    .from(internships)
    .where(eq(internships.id, ws.internshipId))
    .limit(1);
  if (!internship) throw new Error('Internship not found');

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, ws.organizationId))
    .limit(1);
  if (!org) throw new Error('Organization not found');

  const [intern] = await db.select().from(users).where(eq(users.id, ws.internId)).limit(1);
  if (!intern) throw new Error('Intern not found');

  const [internProfile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, ws.internId))
    .limit(1);

  const [supervisor] = await db
    .select()
    .from(users)
    .where(eq(users.id, input.supervisorId))
    .limit(1);
  if (!supervisor) throw new Error('Supervisor not found');

  const wsDeliverables = await db
    .select()
    .from(deliverables)
    .where(eq(deliverables.workspaceId, input.workspaceId));

  const allTasks = await db.select().from(tasks).where(eq(tasks.workspaceId, input.workspaceId));
  const doneTasks = allTasks.filter((t) => t.status === 'done').length;

  const internName =
    [intern.firstName, intern.lastName].filter(Boolean).join(' ').trim() || intern.email;
  const supervisorName =
    [supervisor.firstName, supervisor.lastName].filter(Boolean).join(' ').trim() ||
    supervisor.email;

  return {
    intern: {
      name: internName,
      email: intern.email,
      university: internProfile?.university ?? null,
      fieldOfStudy: internProfile?.fieldOfStudy ?? null,
      graduationYear: internProfile?.graduationYear ?? null,
    },
    organization: {
      name: org.name,
      location: org.location,
      website: org.website,
      logoUrl: org.logoUrl,
    },
    internship: {
      title: internship.title,
      sector: internship.sector,
      duration: internship.duration,
      startDate: ws.startDate,
      endDate: ws.endDate,
      description: internship.description,
    },
    supervisor: {
      name: supervisorName,
      email: supervisor.email,
    },
    deliverables: wsDeliverables.map((d) => ({
      title: d.title,
      status: d.status ?? 'draft',
      version: d.version,
      submittedAt: d.submittedAt ? d.submittedAt.toISOString() : null,
      feedback: d.feedback,
    })),
    taskStats: {
      total: allTasks.length,
      done: doneTasks,
    },
    signature: {
      reviewText: input.reviewText,
      rating: input.rating,
      signedAt: new Date().toISOString(),
    },
    locale: input.locale,
  };
}
