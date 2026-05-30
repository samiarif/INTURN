'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { academicReports } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { requireActiveSession } from '@/modules/auth/session';
import { requireOrgRole, getActiveMembership } from '@/modules/team/authz';
import { assertOurBlobUrl } from '@/lib/blob';
import { ratelimit } from '@/lib/ratelimit';
import {
  createReportDraft,
  submitReport,
  approveReport,
  requestReportRevision,
  addReportComment,
} from './service';

type ActionResult = { ok: true } | { ok: false; error: string };

async function loadReport(reportId: string) {
  const [report] = await db
    .select()
    .from(academicReports)
    .where(eq(academicReports.id, reportId))
    .limit(1);
  if (!report) throw new Error('Report not found');
  return report;
}

function revalidateReport(studentUserId: string) {
  revalidatePath('/intern/university');
  revalidatePath(`/university/students/${studentUserId}`);
  revalidatePath('/university/dashboard');
}

/** Student: create the first draft rapport for a university they belong to. */
export async function createReportDraftAction(input: {
  universityOrgId: string;
  internshipId?: string | null;
  title?: string | null;
}): Promise<ActionResult> {
  try {
    const { user } = await requireActiveSession();
    // Must hold an active student membership in the target university org.
    const m = await getActiveMembership(user.id, input.universityOrgId);
    if (!m || m.role !== 'student') return { ok: false, error: 'Forbidden' };

    await createReportDraft({
      studentUserId: user.id,
      universityOrgId: input.universityOrgId,
      internshipId: input.internshipId ?? null,
      title: input.title ?? null,
    });
    revalidateReport(user.id);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown_error' };
  }
}

/** Student: submit / resubmit their own rapport (PDF). */
export async function submitReportAction(input: {
  reportId: string;
  fileUrl: string;
  fileName: string;
  fileType?: string;
  note?: string;
}): Promise<ActionResult> {
  try {
    const { user } = await requireActiveSession();
    const report = await loadReport(input.reportId);
    if (report.studentUserId !== user.id) return { ok: false, error: 'Forbidden' };

    assertOurBlobUrl(input.fileUrl, 'fileUrl');
    const rl = ratelimit('upload').limit(user.id);
    if (!rl.success) return { ok: false, error: 'rate_limited' };

    await submitReport({
      reportId: input.reportId,
      fileUrl: input.fileUrl,
      fileName: input.fileName,
      fileType: input.fileType ?? null,
      note: input.note?.trim() || null,
      actorId: user.id,
    });
    revalidateReport(report.studentUserId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown_error' };
  }
}

/** Coordinator: approve a submitted rapport. Membership-gated (IDOR-safe). */
export async function approveReportAction(input: { reportId: string }): Promise<ActionResult> {
  try {
    const { user } = await requireActiveSession();
    const report = await loadReport(input.reportId);
    await requireOrgRole(user.id, report.universityOrgId, ['owner', 'admin']);

    await approveReport({ reportId: input.reportId, actorId: user.id });
    revalidateReport(report.studentUserId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown_error' };
  }
}

/** Coordinator: request a revision (+ required feedback). Membership-gated. */
export async function requestReportRevisionAction(input: {
  reportId: string;
  feedback: string;
}): Promise<ActionResult> {
  try {
    const { user } = await requireActiveSession();
    const report = await loadReport(input.reportId);
    await requireOrgRole(user.id, report.universityOrgId, ['owner', 'admin']);

    const feedback = input.feedback?.trim();
    if (!feedback) return { ok: false, error: 'feedback_required' };

    await requestReportRevision({ reportId: input.reportId, feedback, actorId: user.id });
    revalidateReport(report.studentUserId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown_error' };
  }
}

/** Both sides: comment on the rapport thread (owning student OR org staff). */
export async function addReportCommentAction(input: {
  reportId: string;
  body: string;
}): Promise<ActionResult> {
  try {
    const { user } = await requireActiveSession();
    const report = await loadReport(input.reportId);

    const isStudent = report.studentUserId === user.id;
    let isStaff = false;
    if (!isStudent) {
      const m = await getActiveMembership(user.id, report.universityOrgId);
      isStaff = m?.role === 'owner' || m?.role === 'admin';
    }
    if (!isStudent && !isStaff) return { ok: false, error: 'Forbidden' };

    await addReportComment({ reportId: input.reportId, authorId: user.id, body: input.body });
    revalidateReport(report.studentUserId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'unknown_error' };
  }
}
