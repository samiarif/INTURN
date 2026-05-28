import { pgTable, text, timestamp, uuid, boolean, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const organizations = pgTable('organizations', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  industry: text('industry'),
  size: text('size', { enum: ['1-10', '11-50', '51-200', '201-500', '500+'] }),
  description: text('description'),
  website: text('website'),
  location: text('location'),
  country: text('country'),
  city: text('city'),
  logoUrl: text('logo_url'),
  rneUrl: text('rne_url'),
  verified: boolean('verified').default(false).notNull(),
  verificationStatus: text('verification_status', {
    enum: ['draft', 'pending', 'verified', 'suspended'],
  })
    .default('draft')
    .notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
},
(table) => [
  index('organizations_owner_idx').on(table.ownerId),
]);

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
