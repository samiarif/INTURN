import { db } from '@/db';
import { academicReports, academicReportComments, users } from '@/db/schema';
import { and, asc, desc, eq } from 'drizzle-orm';
import type { AcademicReport, AcademicReportComment, User } from '@/db/schema';

/** Latest rapport for a (student, university) pair, or null. No auth here. */
export async function getReportForStudent(
  studentUserId: string,
  universityOrgId: string,
): Promise<AcademicReport | null> {
  const [row] = await db
    .select()
    .from(academicReports)
    .where(
      and(
        eq(academicReports.studentUserId, studentUserId),
        eq(academicReports.universityOrgId, universityOrgId),
      ),
    )
    .orderBy(desc(academicReports.createdAt))
    .limit(1);
  return row ?? null;
}

export type ReportCommentWithAuthor = { comment: AcademicReportComment; author: User };

/** The rapport thread joined to authors, oldest-first (chat reads top-down). */
export async function getReportComments(reportId: string): Promise<ReportCommentWithAuthor[]> {
  return db
    .select({ comment: academicReportComments, author: users })
    .from(academicReportComments)
    .innerJoin(users, eq(users.id, academicReportComments.authorId))
    .where(eq(academicReportComments.reportId, reportId))
    .orderBy(asc(academicReportComments.createdAt));
}

/** How many of a university's rapports are awaiting review (status submitted). */
export async function countReportsAwaitingReview(universityOrgId: string): Promise<number> {
  const rows = await db
    .select({ id: academicReports.id })
    .from(academicReports)
    .where(
      and(
        eq(academicReports.universityOrgId, universityOrgId),
        eq(academicReports.status, 'submitted'),
      ),
    );
  return rows.length;
}

/** All deliverables (livrables) for a (student, university) pair, oldest-first. */
export async function getReportsForStudent(
  studentUserId: string,
  universityOrgId: string,
): Promise<AcademicReport[]> {
  return db
    .select()
    .from(academicReports)
    .where(
      and(
        eq(academicReports.studentUserId, studentUserId),
        eq(academicReports.universityOrgId, universityOrgId),
      ),
    )
    .orderBy(asc(academicReports.createdAt))
    .limit(100);
}

/** Map of studentUserId → count of submitted deliverables (roster "à relire" pill). */
export async function getAwaitingReviewCountByStudent(
  universityOrgId: string,
): Promise<Map<string, number>> {
  const rows = await db
    .select({ studentUserId: academicReports.studentUserId })
    .from(academicReports)
    .where(
      and(
        eq(academicReports.universityOrgId, universityOrgId),
        eq(academicReports.status, 'submitted'),
      ),
    )
    .limit(2000);
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.studentUserId, (map.get(r.studentUserId) ?? 0) + 1);
  return map;
}

/**
 * Per-student latest report status for the dashboard roster pill. Returns a
 * map of studentUserId → status. One query, no per-row N+1.
 */
export async function getReportStatusByStudent(
  universityOrgId: string,
): Promise<Map<string, string>> {
  const rows = await db
    .select({
      studentUserId: academicReports.studentUserId,
      status: academicReports.status,
      createdAt: academicReports.createdAt,
    })
    .from(academicReports)
    .where(eq(academicReports.universityOrgId, universityOrgId))
    .orderBy(desc(academicReports.createdAt));
  const map = new Map<string, string>();
  for (const r of rows) {
    if (!map.has(r.studentUserId)) map.set(r.studentUserId, r.status); // newest-first wins
  }
  return map;
}
