import { pgTable, text, timestamp, uuid, index } from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * User-submitted reports (reclamations) — an intern flags an internship,
 * an organization, or another user for review. Reports land in
 * /admin/reports and admins triage open → reviewed → resolved.
 *
 * `subjectType` + `subjectId` is the polymorphic target. We keep these
 * as text + uuid rather than foreign keys so reports survive subject
 * deletion (useful for audit).
 */
export const reports = pgTable(
  'reports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    reporterId: uuid('reporter_id').references(() => users.id, { onDelete: 'set null' }),
    subjectType: text('subject_type', { enum: ['internship', 'organization', 'user'] }).notNull(),
    subjectId: uuid('subject_id').notNull(),
    reason: text('reason', {
      enum: ['scam', 'misleading', 'inappropriate', 'spam', 'unsafe', 'other'],
    }).notNull(),
    body: text('body').notNull(),
    status: text('status', { enum: ['open', 'reviewed', 'resolved'] }).default('open').notNull(),
    resolution: text('resolution'),
    resolvedBy: uuid('resolved_by').references(() => users.id, { onDelete: 'set null' }),
    resolvedAt: timestamp('resolved_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('reports_status_created_idx').on(table.status, table.createdAt),
    index('reports_subject_idx').on(table.subjectType, table.subjectId),
    index('reports_reporter_idx').on(table.reporterId),
  ],
);

export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;
