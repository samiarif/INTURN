import { pgTable, timestamp, uuid, primaryKey, index } from 'drizzle-orm/pg-core';
import { users } from './users';
import { internships } from './internships';

export const internshipBookmarks = pgTable(
  'internship_bookmarks',
  {
    internId: uuid('intern_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    internshipId: uuid('internship_id')
      .notNull()
      .references(() => internships.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.internId, table.internshipId] }),
    index('internship_bookmarks_intern_idx').on(table.internId),
  ],
);

export type InternshipBookmark = typeof internshipBookmarks.$inferSelect;
export type NewInternshipBookmark = typeof internshipBookmarks.$inferInsert;
