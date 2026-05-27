import { db } from '@/db';
import { auditLogs, users, type AuditLog, type User } from '@/db/schema';
import { and, desc, eq, like, type SQL } from 'drizzle-orm';

export type AuditLogRow = {
  log: AuditLog;
  actor: User | null;
};

export type AuditLogFilter = {
  actionPrefix?: string; // e.g. 'report.' or 'org.'
  targetType?: string;
};

export async function listRecentAuditLogs(
  limit = 100,
  filter: AuditLogFilter = {},
): Promise<AuditLogRow[]> {
  const conditions: SQL[] = [];
  if (filter.actionPrefix) {
    conditions.push(like(auditLogs.action, `${filter.actionPrefix}%`));
  }
  if (filter.targetType) {
    conditions.push(eq(auditLogs.targetType, filter.targetType));
  }

  const baseQuery = db
    .select({ log: auditLogs, actor: users })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.actorId));

  const rows = await (conditions.length > 0
    ? baseQuery.where(and(...conditions))
    : baseQuery
  )
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
  return rows;
}
