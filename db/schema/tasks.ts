import { pgTable, text, timestamp, uuid, date, integer, index } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces';
import { projectSprints } from './project-sprints';

export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    sprintId: uuid('sprint_id').references(() => projectSprints.id, { onDelete: 'set null' }),
    tag: text('tag'),
    title: text('title').notNull(),
    description: text('description'),
    status: text('status', { enum: ['todo', 'in-progress', 'review', 'done'] }).default('todo'),
    priority: text('priority', { enum: ['low', 'medium', 'high'] }).default('medium'),
    dueDate: date('due_date'),
    order: integer('order').default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('tasks_workspace_status_idx').on(table.workspaceId, table.status),
    index('tasks_workspace_order_idx').on(table.workspaceId, table.order),
    index('tasks_workspace_sprint_idx').on(table.workspaceId, table.sprintId),
  ],
);

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
