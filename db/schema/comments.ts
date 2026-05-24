import { pgTable, text, timestamp, uuid, index } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces';
import { tasks } from './tasks';
import { deliverables } from './deliverables';
import { users } from './users';

export const comments = pgTable(
  'comments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    // Exactly one of taskId / deliverableId should be set, or both null for
    // workspace-level comments. Application-layer invariant; not enforced by DB.
    taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'cascade' }),
    deliverableId: uuid('deliverable_id').references(() => deliverables.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    body: text('body').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('comments_workspace_idx').on(table.workspaceId),
    index('comments_task_idx').on(table.taskId),
    index('comments_deliverable_idx').on(table.deliverableId),
    index('comments_created_idx').on(table.createdAt),
    index('comments_workspace_created_idx').on(table.workspaceId, table.createdAt),
  ],
);

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
