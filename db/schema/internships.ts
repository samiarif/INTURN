import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  boolean,
  jsonb,
  date,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations';

export const internships = pgTable('internships', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  sector: text('sector'),
  skills: jsonb('skills').$type<string[]>().default([]),
  duration: integer('duration'),
  locationType: text('location_type', { enum: ['on-site', 'virtual', 'hybrid'] }),
  location: text('location'),
  isPaid: boolean('is_paid').default(false),
  compensation: text('compensation'),
  internCount: integer('intern_count').default(1),
  language: text('language', { enum: ['fr', 'en', 'ar'] }),
  status: text('status', { enum: ['draft', 'published', 'closed', 'archived'] }).default('draft'),
  deadline: date('deadline'),
  customQuestions:
    jsonb('custom_questions').$type<Array<{ question: string; required: boolean }>>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Internship = typeof internships.$inferSelect;
export type NewInternship = typeof internships.$inferInsert;
