import { pgTable, text, timestamp, uuid, integer, date, jsonb, index } from 'drizzle-orm/pg-core';
import { projects } from './projects';

export type SprintTaskBlueprint = { title: string; description?: string };

export const projectSprints = pgTable(
  'project_sprints',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    goal: text('goal'),
    orderIndex: integer('order_index').notNull().default(0),
    startDate: date('start_date'),
    endDate: date('end_date'),
    taskBlueprint: jsonb('task_blueprint').$type<SprintTaskBlueprint[]>().notNull().default([]),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('project_sprints_project_order_idx').on(table.projectId, table.orderIndex)],
);

export type ProjectSprint = typeof projectSprints.$inferSelect;
export type NewProjectSprint = typeof projectSprints.$inferInsert;
