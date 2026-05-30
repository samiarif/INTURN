import { db } from '@/db';
import {
  academicReports,
  academicReportComments,
  type AcademicReportRevision,
} from '@/db/schema';
import { eq } from 'drizzle-orm';
import { recordEvent } from '@/modules/events/service';
import { nextReviewState, type ReviewStatus } from '@/modules/review/state-machine';

/** First-create a draft rapport for a student+university pair. */
export async function createReportDraft(input: {
  studentUserId: string;
  universityOrgId: string;
  internshipId?: string | null;
  title?: string | null;
  description?: string | null;
}) {
  const [created] = await db
    .insert(academicReports)
    .values({
      studentUserId: input.studentUserId,
      universityOrgId: input.universityOrgId,
      internshipId: input.internshipId ?? null,
      title: input.title ?? null,
      description: input.description ?? null,
      status: 'draft',
      version: 1,
    })
    .returning();
  return created;
}

export async function submitReport(input: {
  reportId: string;
  fileUrl: string;
  fileName: string;
  fileType: string | null;
  note?: string | null;
  actorId: string;
}) {
  const [current] = await db
    .select()
    .from(academicReports)
    .where(eq(academicReports.id, input.reportId))
    .limit(1);
  if (!current) throw new Error('Report not found');

  const from = (current.status ?? 'draft') as ReviewStatus;
  // Pure resolver owns the transition guard + the version-bump rule.
  const next = nextReviewState({ status: from, version: current.version }, 'submit');
  const isResubmit = from === 'revision-requested';
  const nextVersion = next.version;

  // Snapshot the just-rejected version into history before overwriting — only
  // on a genuine resubmit (never on a fresh draft → submitted first pass,
  // which would leave a duplicate ghost v1 in history).
  const history: AcademicReportRevision[] = Array.isArray(current.revisionHistory)
    ? [...current.revisionHistory]
    : [];
  if (isResubmit) {
    const snapshot: AcademicReportRevision = {
      version: current.version,
      submittedAt: (current.submittedAt ?? current.updatedAt ?? new Date()).toISOString(),
      submittedBy: input.actorId,
      fileUrl: current.fileUrl,
      fileName: current.fileName,
      fileType: current.fileType,
      note: null,
      status: 'revision-requested',
    };
    if (current.feedback) {
      snapshot.review = {
        reviewerId: input.actorId,
        reviewedAt: (current.updatedAt ?? new Date()).toISOString(),
        state: 'changes',
        text: current.feedback,
      };
    }
    history.unshift(snapshot);
  }

  const [updated] = await db
    .update(academicReports)
    .set({
      status: 'submitted',
      fileUrl: input.fileUrl,
      fileName: input.fileName,
      fileType: input.fileType,
      feedback: null, // clear stale feedback — it now lives in history
      version: nextVersion,
      submittedAt: new Date(),
      revisionHistory: history,
      updatedAt: new Date(),
    })
    .where(eq(academicReports.id, input.reportId))
    .returning();

  await recordEvent({
    type: 'academicReport.submitted',
    actorId: input.actorId,
    targetType: 'academicReport',
    targetId: input.reportId,
    metadata: {
      name: current.title ?? 'Rapport',
      version: nextVersion,
      fileName: input.fileName,
      note: input.note ?? null,
    },
  });

  return updated;
}

export async function approveReport(input: { reportId: string; actorId: string }) {
  const [current] = await db
    .select()
    .from(academicReports)
    .where(eq(academicReports.id, input.reportId))
    .limit(1);
  if (!current) throw new Error('Report not found');
  const from = (current.status ?? 'draft') as ReviewStatus;
  nextReviewState({ status: from, version: current.version }, 'approve');

  await db
    .update(academicReports)
    .set({ status: 'approved', updatedAt: new Date() })
    .where(eq(academicReports.id, input.reportId));

  await recordEvent({
    type: 'academicReport.approved',
    actorId: input.actorId,
    targetType: 'academicReport',
    targetId: input.reportId,
    metadata: { name: current.title ?? 'Rapport', version: current.version },
  });
}

export async function requestReportRevision(input: {
  reportId: string;
  feedback: string;
  actorId: string;
}) {
  const [current] = await db
    .select()
    .from(academicReports)
    .where(eq(academicReports.id, input.reportId))
    .limit(1);
  if (!current) throw new Error('Report not found');
  const from = (current.status ?? 'draft') as ReviewStatus;
  nextReviewState({ status: from, version: current.version }, 'request-revision');

  await db
    .update(academicReports)
    .set({ status: 'revision-requested', feedback: input.feedback, updatedAt: new Date() })
    .where(eq(academicReports.id, input.reportId));

  await recordEvent({
    type: 'academicReport.revision.requested',
    actorId: input.actorId,
    targetType: 'academicReport',
    targetId: input.reportId,
    metadata: { name: current.title ?? 'Rapport', version: current.version, note: input.feedback },
  });
}

/**
 * Add a comment to the rapport thread. Writes to the DEDICATED
 * academic_report_comments table (NO workspaceId). Deliberately records NO
 * event — report comments are their own surface and must NOT leak onto the
 * company activity feed (the firewall).
 */
export async function addReportComment(input: {
  reportId: string;
  authorId: string;
  body: string;
}) {
  const trimmed = input.body.trim();
  if (!trimmed) throw new Error('Comment body is required');
  if (trimmed.length > 4000) throw new Error('Comment is too long (max 4000 chars)');

  const [created] = await db
    .insert(academicReportComments)
    .values({ reportId: input.reportId, authorId: input.authorId, body: trimmed })
    .returning();
  return created;
}
