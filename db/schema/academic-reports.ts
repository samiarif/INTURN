import { pgTable, text, timestamp, uuid, integer, date, jsonb, index } from 'drizzle-orm/pg-core';
import { users } from './users';
import { organizations } from './organizations';
import { internships } from './internships';

// Mirrors deliverables' DeliverableRevision shape (newest-first snapshots), but
// for the university↔student rapport académique axis. Defined here so the
// academic_reports table (and Plan 2's review loop) share one revision shape.
export type AcademicReportRevision = {
  version: number;
  submittedAt: string; // ISO
  submittedBy: string; // user id
  fileUrl: string | null;
  fileName: string | null;
  fileType: string | null;
  note: string | null;
  status: 'submitted' | 'approved' | 'revision-requested';
  review?: {
    reviewerId: string;
    reviewedAt: string;
    state: 'approved' | 'changes';
    text: string;
  };
};

export const academicReports = pgTable(
  'academic_reports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // The managed student (global role stays 'intern'). Cascades on user delete.
    studentUserId: uuid('student_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // The supervising university org. Cascades on org delete.
    universityOrgId: uuid('university_org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    // Internship context ONLY — a plain reference, never workspace-scoped. Nullable
    // (a student may be managed before placement). ON DELETE SET NULL so deleting
    // the internship orphans the rapport rather than cascading it away.
    internshipId: uuid('internship_id').references(() => internships.id, {
      onDelete: 'set null',
    }),
    // Nullable: a report may start as a bare draft before the student fills metadata.
    title: text('title'),
    description: text('description'),
    kind: text('kind', { enum: ['rapport', 'presentation', 'diagram', 'other'] })
      .notNull()
      .default('rapport'),
    fileUrl: text('file_url'),
    fileName: text('file_name'),
    fileType: text('file_type'),
    status: text('status', {
      enum: ['draft', 'submitted', 'approved', 'revision-requested'],
    })
      .default('draft')
      .notNull(),
    feedback: text('feedback'),
    version: integer('version').default(1).notNull(),
    submittedAt: timestamp('submitted_at'),
    dueDate: date('due_date'),
    revisionHistory: jsonb('revision_history')
      .$type<AcademicReportRevision[]>()
      .default([])
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('academic_reports_university_status_idx').on(table.universityOrgId, table.status),
    index('academic_reports_student_idx').on(table.studentUserId),
  ],
);

export type AcademicReport = typeof academicReports.$inferSelect;
export type NewAcademicReport = typeof academicReports.$inferInsert;
