import { pgTable, text, timestamp, uuid, jsonb, integer } from 'drizzle-orm/pg-core';
import { users } from './users';

export const profiles = pgTable('profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
  headline: text('headline'),
  bio: text('bio'),
  university: text('university'),
  fieldOfStudy: text('field_of_study'),
  graduationYear: integer('graduation_year'),
  skills: jsonb('skills').$type<string[]>().default([]),
  languages: jsonb('languages').$type<string[]>().default([]),
  location: text('location'),
  phone: text('phone'),
  linkedinUrl: text('linkedin_url'),
  portfolioUrl: text('portfolio_url'),
  resumeUrl: text('resume_url'),
  yearOfStudy: text('year_of_study'),
  city: text('city'),
  roles: jsonb('roles').$type<string[]>().default([]),
  portfolioLinks: jsonb('portfolio_links')
    .$type<Array<{ platform: string; url: string }>>()
    .default([]),
  preferredLanguage: text('preferred_language', { enum: ['fr', 'en'] }),
  profileStep: text('profile_step', { enum: ['none', 'basics-done', 'complete'] })
    .default('none')
    .notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
