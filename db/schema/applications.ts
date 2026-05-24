import { pgTable, text, timestamp, uuid, jsonb, index, unique } from 'drizzle-orm/pg-core';
import { users } from './users';
import { internships } from './internships';

export const applications = pgTable(
  'applications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    internshipId: uuid('internship_id')
      .notNull()
      .references(() => internships.id, { onDelete: 'cascade' }),
    applicantId: uuid('applicant_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: text('status', {
      enum: ['new', 'reviewed', 'shortlisted', 'interview', 'accepted', 'rejected'],
    }).default('new'),
    coverNote: text('cover_note'),
    customAnswers: jsonb('custom_answers').$type<Array<{ question: string; answer: string }>>(),
    internalNotes: text('internal_notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('applications_internship_idx').on(table.internshipId),
    index('applications_applicant_idx').on(table.applicantId),
    index('applications_internship_status_idx').on(table.internshipId, table.status),
    unique('applications_internship_applicant_unique').on(table.internshipId, table.applicantId),
  ],
);

export type Application = typeof applications.$inferSelect;
export type NewApplication = typeof applications.$inferInsert;
