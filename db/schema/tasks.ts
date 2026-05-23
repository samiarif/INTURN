import { pgTable, text, timestamp, uuid, date, integer } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces';

export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status', { enum: ['todo', 'in-progress', 'review', 'done'] }).default('todo'),
  priority: text('priority', { enum: ['low', 'medium', 'high'] }).default('medium'),
  dueDate: date('due_date'),
  order: integer('order').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
