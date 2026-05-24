import { db } from '@/db';
import { comments, users } from '@/db/schema';
import { eq, and, desc, isNull, lt } from 'drizzle-orm';

export type CommentWithAuthor = {
  comment: typeof comments.$inferSelect;
  author: typeof users.$inferSelect;
};

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

export type PageOptions = {
  /** Max rows to return. Defaults to 50, capped at 100. */
  limit?: number;
  /** Cursor: only rows older than this ISO timestamp. */
  before?: Date;
};

function clampLimit(limit: number | undefined): number {
  if (!limit || limit <= 0) return DEFAULT_LIMIT;
  return Math.min(limit, MAX_LIMIT);
}

export async function getWorkspaceComments(
  workspaceId: string,
  { limit, before }: PageOptions = {},
): Promise<CommentWithAuthor[]> {
  const where = and(
    eq(comments.workspaceId, workspaceId),
    isNull(comments.taskId),
    isNull(comments.deliverableId),
    before ? lt(comments.createdAt, before) : undefined,
  );
  return db
    .select({ comment: comments, author: users })
    .from(comments)
    .innerJoin(users, eq(users.id, comments.authorId))
    .where(where)
    .orderBy(desc(comments.createdAt))
    .limit(clampLimit(limit));
}

export async function getTaskComments(
  taskId: string,
  { limit, before }: PageOptions = {},
): Promise<CommentWithAuthor[]> {
  const where = and(
    eq(comments.taskId, taskId),
    before ? lt(comments.createdAt, before) : undefined,
  );
  return db
    .select({ comment: comments, author: users })
    .from(comments)
    .innerJoin(users, eq(users.id, comments.authorId))
    .where(where)
    .orderBy(desc(comments.createdAt))
    .limit(clampLimit(limit));
}

export async function getDeliverableComments(
  deliverableId: string,
  { limit, before }: PageOptions = {},
): Promise<CommentWithAuthor[]> {
  const where = and(
    eq(comments.deliverableId, deliverableId),
    before ? lt(comments.createdAt, before) : undefined,
  );
  return db
    .select({ comment: comments, author: users })
    .from(comments)
    .innerJoin(users, eq(users.id, comments.authorId))
    .where(where)
    .orderBy(desc(comments.createdAt))
    .limit(clampLimit(limit));
}
