import { pgTable, text, timestamp, uuid, jsonb, date, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations';

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    brief: text('brief'),
    status: text('status', { enum: ['draft', 'active', 'archived'] }).default('draft').notNull(),
    supervisorIds: jsonb('supervisor_ids').$type<string[]>().default([]),
    startDate: date('start_date'),
    endDate: date('end_date'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('projects_org_slug_idx').on(table.organizationId, table.slug),
    index('projects_status_idx').on(table.status),
  ],
);

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
