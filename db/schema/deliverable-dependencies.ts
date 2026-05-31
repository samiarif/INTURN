import { pgTable, uuid, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { deliverables } from './deliverables';
import { projects } from './projects';
import { users } from './users';

/**
 * Cross-intern "feeds" edges between deliverables, within one project. The
 * upstream deliverable feeds the downstream. Awareness-only (never gates work);
 * cycle prevention lives in the app layer (modules/deliverables/dependencies).
 * Migration: 0019.
 */
export const deliverableDependencies = pgTable(
  'deliverable_dependencies',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    upstreamId: uuid('upstream_id')
      .notNull()
      .references(() => deliverables.id, { onDelete: 'cascade' }),
    downstreamId: uuid('downstream_id')
      .notNull()
      .references(() => deliverables.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('deliverable_dependencies_edge_idx').on(table.upstreamId, table.downstreamId),
    index('deliverable_dependencies_project_idx').on(table.projectId),
    index('deliverable_dependencies_downstream_idx').on(table.downstreamId),
    index('deliverable_dependencies_upstream_idx').on(table.upstreamId),
  ],
);

export type DeliverableDependency = typeof deliverableDependencies.$inferSelect;
export type NewDeliverableDependency = typeof deliverableDependencies.$inferInsert;
