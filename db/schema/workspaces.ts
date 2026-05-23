import { pgTable, text, timestamp, uuid, date } from 'drizzle-orm/pg-core';
import { internships } from './internships';
import { users } from './users';
import { organizations } from './organizations';

export const workspaces = pgTable('workspaces', {
  id: uuid('id').defaultRandom().primaryKey(),
  internshipId: uuid('internship_id')
    .notNull()
    .references(() => internships.id, { onDelete: 'cascade' }),
  internId: uuid('intern_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  status: text('status', { enum: ['active', 'completed', 'cancelled'] }).default('active'),
  startDate: date('start_date'),
  endDate: date('end_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
