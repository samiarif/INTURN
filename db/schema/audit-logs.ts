import { pgTable, text, timestamp, uuid, jsonb, index } from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * Admin action audit log — every meaningful state change made through
 * /admin/* lands here. Append-only (no edit / no delete).
 *
 * `targetType` + `targetId` identifies the subject (organization, user,
 * internship, report, record, …). `metadata` carries action-specific
 * context (before/after, reason, etc.) as a JSONB blob.
 *
 * Records remain even if the subject is deleted — they're the audit
 * trail. `actorId` is set null if the admin's user row is deleted
 * (extremely rare; the log entry stays for compliance).
 */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    action: text('action').notNull(), // e.g. 'org.verify', 'report.resolve', 'internship.unpublish'
    targetType: text('target_type').notNull(),
    targetId: uuid('target_id'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('audit_logs_actor_created_idx').on(table.actorId, table.createdAt),
    index('audit_logs_target_idx').on(table.targetType, table.targetId),
    index('audit_logs_action_created_idx').on(table.action, table.createdAt),
  ],
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
