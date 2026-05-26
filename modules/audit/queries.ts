import { db } from '@/db';
import { auditLogs, users, type AuditLog, type User } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';

export type AuditLogRow = {
  log: AuditLog;
  actor: User | null;
};

export async function listRecentAuditLogs(limit = 100): Promise<AuditLogRow[]> {
  const rows = await db
    .select({ log: auditLogs, actor: users })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.actorId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
  return rows;
}
