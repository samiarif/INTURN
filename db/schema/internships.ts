import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  boolean,
  jsonb,
  date,
  index,
  customType,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { organizations } from './organizations';
import { projects } from './projects';

// Postgres tsvector — maintained by trigger (see 0003_marketplace_fts.sql).
const tsvector = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'tsvector';
  },
});

export const internships = pgTable(
  'internships',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
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
    // Full-text search vector — maintained by a Postgres trigger from
    // (title, sector, description). See 0003_marketplace_fts.sql.
    searchVector: tsvector('search_vector'),
  },
  (table) => [
    index('internships_project_idx').on(table.projectId),
    // Marketplace listing: WHERE status = 'published' ORDER BY created_at DESC
    index('internships_status_created_idx').on(table.status, sql`created_at DESC`),
    // GIN index backing FTS @@ to_tsquery lookups. Created via raw SQL in the
    // migration; declared here so drizzle's introspection sees it.
    index('internships_search_vector_idx').using('gin', table.searchVector),
  ],
);

export type Internship = typeof internships.$inferSelect;
export type NewInternship = typeof internships.$inferInsert;
