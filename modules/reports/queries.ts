import { db } from '@/db';
import { reports, users, type Report, type User } from '@/db/schema';
import { desc, eq, inArray, sql } from 'drizzle-orm';

export type ReportWithReporter = { report: Report; reporter: User | null };

export async function listReportsByStatus(
  statuses: Array<'open' | 'reviewed' | 'resolved'>,
  limit = 50,
): Promise<ReportWithReporter[]> {
  if (statuses.length === 0) return [];
  return db
    .select({ report: reports, reporter: users })
    .from(reports)
    .leftJoin(users, eq(users.id, reports.reporterId))
    .where(inArray(reports.status, statuses))
    .orderBy(desc(reports.createdAt))
    .limit(limit);
}

export async function getReportById(id: string): Promise<ReportWithReporter | null> {
  const [row] = await db
    .select({ report: reports, reporter: users })
    .from(reports)
    .leftJoin(users, eq(users.id, reports.reporterId))
    .where(eq(reports.id, id))
    .limit(1);
  return row ?? null;
}

export async function countOpenReports(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(reports)
    .where(eq(reports.status, 'open'));
  return Number(row?.count ?? 0);
}
