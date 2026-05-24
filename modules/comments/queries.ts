import { db } from '@/db';
import { comments, users } from '@/db/schema';
import { eq, and, desc, isNull } from 'drizzle-orm';

export type CommentWithAuthor = {
  comment: typeof comments.$inferSelect;
  author: typeof users.$inferSelect;
};

export async function getWorkspaceComments(workspaceId: string): Promise<CommentWithAuthor[]> {
  return db
    .select({ comment: comments, author: users })
    .from(comments)
    .innerJoin(users, eq(users.id, comments.authorId))
    .where(
      and(
        eq(comments.workspaceId, workspaceId),
        isNull(comments.taskId),
        isNull(comments.deliverableId),
      ),
    )
    .orderBy(desc(comments.createdAt));
}

export async function getTaskComments(taskId: string): Promise<CommentWithAuthor[]> {
  return db
    .select({ comment: comments, author: users })
    .from(comments)
    .innerJoin(users, eq(users.id, comments.authorId))
    .where(eq(comments.taskId, taskId))
    .orderBy(desc(comments.createdAt));
}

export async function getDeliverableComments(deliverableId: string): Promise<CommentWithAuthor[]> {
  return db
    .select({ comment: comments, author: users })
    .from(comments)
    .innerJoin(users, eq(users.id, comments.authorId))
    .where(eq(comments.deliverableId, deliverableId))
    .orderBy(desc(comments.createdAt));
}
