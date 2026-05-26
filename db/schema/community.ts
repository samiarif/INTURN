import { pgTable, text, timestamp, uuid, integer, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

/**
 * Community v1 — intern-only discussions.
 *
 * Per the brief: no DMs, no groups, no follow graph. Just a single
 * feed where interns post questions / experiences / discoveries and
 * other interns reply. Companies + admins can read but not post.
 *
 * Moderation: posts can be reported via the existing `reports` table
 * (subjectType = 'community-post'). Hidden posts (status='hidden')
 * disappear from the feed but stay in the DB for audit.
 */
export const communityPosts = pgTable(
  'community_posts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    body: text('body').notNull(),
    status: text('status', { enum: ['active', 'hidden'] }).default('active').notNull(),
    commentCount: integer('comment_count').default(0).notNull(),
    lastActivityAt: timestamp('last_activity_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('community_posts_status_activity_idx').on(table.status, sql`last_activity_at DESC`),
    index('community_posts_author_idx').on(table.authorId),
  ],
);

export const communityComments = pgTable(
  'community_comments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    postId: uuid('post_id')
      .notNull()
      .references(() => communityPosts.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    body: text('body').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('community_comments_post_created_idx').on(table.postId, table.createdAt),
    index('community_comments_author_idx').on(table.authorId),
  ],
);

export type CommunityPost = typeof communityPosts.$inferSelect;
export type NewCommunityPost = typeof communityPosts.$inferInsert;
export type CommunityComment = typeof communityComments.$inferSelect;
export type NewCommunityComment = typeof communityComments.$inferInsert;
