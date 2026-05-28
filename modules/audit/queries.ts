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
  const conditions = buildConditions(filter);

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

export type AuditLogPage = {
  rows: AuditLogRow[];
  page: number;
  pageSize: number;
  hasMore: boolean;
};

/**
 * Offset-paginated audit log. Fetches pageSize+1 rows so we can tell the
 * caller whether a next page exists without a second count query (same
 * trick the marketplace uses). `page` is 1-based.
 */
export async function listAuditLogPage(
  page = 1,
  pageSize = 50,
  filter: AuditLogFilter = {},
): Promise<AuditLogPage> {
  const safePage = Math.max(1, page);
  const conditions = buildConditions(filter);

  const baseQuery = db
    .select({ log: auditLogs, actor: users })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.actorId));

  const fetched = await (conditions.length > 0
    ? baseQuery.where(and(...conditions))
    : baseQuery
  )
    .orderBy(desc(auditLogs.createdAt))
    .limit(pageSize + 1)
    .offset((safePage - 1) * pageSize);

  const hasMore = fetched.length > pageSize;
  return {
    rows: fetched.slice(0, pageSize),
    page: safePage,
    pageSize,
    hasMore,
  };
}

/**
 * Full audit log for CSV export — no limit. Ordered oldest-first so an
 * appended export reads chronologically. Used only by the admin export
 * route (requireAdmin gated there).
 */
export async function listAllAuditLogsForExport(
  filter: AuditLogFilter = {},
): Promise<AuditLogRow[]> {
  const conditions = buildConditions(filter);
  const baseQuery = db
    .select({ log: auditLogs, actor: users })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.actorId));

  return (conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery).orderBy(
    desc(auditLogs.createdAt),
  );
}

function buildConditions(filter: AuditLogFilter): SQL[] {
  const conditions: SQL[] = [];
  if (filter.actionPrefix) {
    conditions.push(like(auditLogs.action, `${filter.actionPrefix}%`));
  }
  if (filter.targetType) {
    conditions.push(eq(auditLogs.targetType, filter.targetType));
  }
  return conditions;
}
