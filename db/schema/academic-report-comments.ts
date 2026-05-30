import { pgTable, text, timestamp, uuid, index } from 'drizzle-orm/pg-core';
import { academicReports } from './academic-reports';
import { users } from './users';

// The university↔student discussion thread on a rapport académique. A DEDICATED
// table — NOT the company `comments` table, whose workspace_id is NOT NULL (a
// rapport has no workspace). Carries NO workspaceId: report comments are
// physically isolated from company workspace comments, matching the firewall.
export const academicReportComments = pgTable(
  'academic_report_comments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    reportId: uuid('report_id')
      .notNull()
      .references(() => academicReports.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    body: text('body').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('academic_report_comments_report_idx').on(table.reportId)],
);

export type AcademicReportComment = typeof academicReportComments.$inferSelect;
export type NewAcademicReportComment = typeof academicReportComments.$inferInsert;
