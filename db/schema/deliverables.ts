import { pgTable, text, timestamp, uuid, integer, date, index } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces';
import { tasks } from './tasks';

export const deliverables = pgTable(
  'deliverables',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    description: text('description'),
    fileUrl: text('file_url'),
    fileName: text('file_name'),
    fileType: text('file_type'),
    status: text('status', {
      enum: ['draft', 'submitted', 'approved', 'revision-requested'],
    }).default('draft'),
    feedback: text('feedback'),
    version: integer('version').default(1).notNull(),
    submittedAt: timestamp('submitted_at'),
    dueDate: date('due_date'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('deliverables_workspace_status_idx').on(table.workspaceId, table.status),
    index('deliverables_task_idx').on(table.taskId),
  ],
);

export type Deliverable = typeof deliverables.$inferSelect;
export type NewDeliverable = typeof deliverables.$inferInsert;
