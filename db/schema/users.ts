import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkId: text('clerk_id').notNull().unique(),
  email: text('email').notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  imageUrl: text('image_url'),
  role: text('role', { enum: ['intern', 'company', 'admin'] }),
  /** Non-null = the user is suspended by an admin. Login still works
   * (so we can tell them why) but every write server-side checks this
   * and refuses. UI shows a banner so the user knows their account is
   * restricted. */
  suspendedAt: timestamp('suspended_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
