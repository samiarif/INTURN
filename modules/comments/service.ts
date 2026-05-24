import { db } from '@/db';
import { comments } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { recordEvent } from '@/modules/events/service';

export async function addComment(input: {
  workspaceId: string;
  taskId?: string | null;
  deliverableId?: string | null;
  authorId: string;
  body: string;
}) {
  // Invariant: at most one of taskId/deliverableId set.
  if (input.taskId && input.deliverableId) {
    throw new Error('Comment cannot target both a task and a deliverable');
  }
  const trimmed = input.body.trim();
  if (!trimmed) throw new Error('Comment body is required');
  if (trimmed.length > 4000) throw new Error('Comment is too long (max 4000 chars)');

  const [created] = await db
    .insert(comments)
    .values({
      workspaceId: input.workspaceId,
      taskId: input.taskId ?? null,
      deliverableId: input.deliverableId ?? null,
      authorId: input.authorId,
      body: trimmed,
    })
    .returning();

  await recordEvent({
    type: 'comment.added',
    actorId: input.authorId,
    // The activity feed picks comments up via task/deliverable/workspace targetId
    // so we route the event to the most-specific target.
    targetType: input.taskId ? 'task' : input.deliverableId ? 'deliverable' : 'workspace',
    targetId: input.taskId ?? input.deliverableId ?? input.workspaceId,
    metadata: {
      commentId: created.id,
      preview: trimmed.slice(0, 240),
    },
  });

  return created;
}

export async function deleteComment(input: { commentId: string; actorId: string }) {
  const [current] = await db.select().from(comments).where(eq(comments.id, input.commentId)).limit(1);
  if (!current) throw new Error('Comment not found');
  if (current.authorId !== input.actorId) {
    throw new Error('You can only delete your own comments');
  }
  await db.delete(comments).where(eq(comments.id, input.commentId));
}
