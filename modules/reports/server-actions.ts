'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { reports, type NewReport, type Report } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireActiveSession, requireAdmin } from '@/modules/auth/session';
import { recordAuditLog } from '@/modules/audit/service';

export type ReportReason = 'scam' | 'misleading' | 'inappropriate' | 'spam' | 'unsafe' | 'other';
export type ReportSubjectType = 'internship' | 'organization' | 'user';

export type SubmitReportInput = {
  subjectType: ReportSubjectType;
  subjectId: string;
  reason: ReportReason;
  body: string;
};

export type SubmitReportResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

const REASONS: ReadonlyArray<ReportReason> = [
  'scam',
  'misleading',
  'inappropriate',
  'spam',
  'unsafe',
  'other',
];
const SUBJECTS: ReadonlyArray<ReportSubjectType> = ['internship', 'organization', 'user'];

/**
 * Public-facing: any authenticated user can submit a report. Anti-spam:
 * (1) min body length, (2) UI rate-limiting via debounce — server-side
 * rate limit can be added later if abuse appears.
 */
export async function submitReportAction(input: SubmitReportInput): Promise<SubmitReportResult> {
  const session = await requireActiveSession();

  if (!REASONS.includes(input.reason)) return { ok: false, error: 'invalid_reason' };
  if (!SUBJECTS.includes(input.subjectType)) return { ok: false, error: 'invalid_subject' };
  if (!input.subjectId || input.subjectId.length < 30) return { ok: false, error: 'invalid_subject_id' };
  if (input.body.trim().length < 20) return { ok: false, error: 'body_too_short' };
  if (input.body.length > 4000) return { ok: false, error: 'body_too_long' };

  const newRow: NewReport = {
    reporterId: session.user.id,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    reason: input.reason,
    body: input.body.trim(),
    status: 'open',
  };

  const [row] = await db.insert(reports).values(newRow).returning();
  return { ok: true, id: row.id };
}

export type ResolveReportInput = {
  reportId: string;
  status: 'reviewed' | 'resolved';
  resolution: string;
};

export async function resolveReportAction(
  input: ResolveReportInput,
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireAdmin();

  if (!['reviewed', 'resolved'].includes(input.status)) {
    return { ok: false, error: 'invalid_status' };
  }
  if (input.resolution.trim().length < 5) {
    return { ok: false, error: 'resolution_required' };
  }

  const [updated] = await db
    .update(reports)
    .set({
      status: input.status,
      resolution: input.resolution.trim(),
      resolvedBy: session.user.id,
      resolvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(reports.id, input.reportId))
    .returning();

  if (!updated) return { ok: false, error: 'not_found' };

  await recordAuditLog({
    actorId: session.user.id,
    action: `report.${input.status}`,
    targetType: 'report',
    targetId: input.reportId,
    metadata: {
      subjectType: updated.subjectType,
      subjectId: updated.subjectId,
      resolution: input.resolution,
    },
  });

  revalidatePath('/admin/reports');
  return { ok: true };
}

export async function reopenReportAction(reportId: string): Promise<{ ok: boolean }> {
  const session = await requireAdmin();
  const [updated] = await db
    .update(reports)
    .set({
      status: 'open',
      resolution: null,
      resolvedAt: null,
      resolvedBy: null,
      updatedAt: new Date(),
    })
    .where(eq(reports.id, reportId))
    .returning();
  if (!updated) return { ok: false };

  await recordAuditLog({
    actorId: session.user.id,
    action: 'report.reopen',
    targetType: 'report',
    targetId: reportId,
  });
  revalidatePath('/admin/reports');
  return { ok: true };
}

export async function unpublishInternshipAction(internshipId: string): Promise<{ ok: boolean }> {
  const session = await requireAdmin();
  const { internships } = await import('@/db/schema');
  const [row] = await db
    .update(internships)
    .set({ status: 'archived', updatedAt: new Date() })
    .where(eq(internships.id, internshipId))
    .returning();
  if (!row) return { ok: false };

  await recordAuditLog({
    actorId: session.user.id,
    action: 'internship.unpublish',
    targetType: 'internship',
    targetId: internshipId,
    metadata: { previousStatus: 'published', newStatus: 'archived' },
  });
  revalidatePath('/admin/reports');
  revalidatePath('/marketplace');
  return { ok: true };
}

export type { Report };
