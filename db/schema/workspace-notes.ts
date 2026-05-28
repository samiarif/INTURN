import { pgTable, text, timestamp, uuid, index } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces';
import { users } from './users';

export const workspaceNotes = pgTable(
  'workspace_notes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    body: text('body').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    // Author-private notes for a workspace, newest first.
    index('workspace_notes_ws_author_idx').on(table.workspaceId, table.authorId),
  ],
);

export type WorkspaceNote = typeof workspaceNotes.$inferSelect;
export type NewWorkspaceNote = typeof workspaceNotes.$inferInsert;
