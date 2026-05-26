'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { communityPosts, communityComments } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { requireSession } from '@/modules/auth/session';

export type CreatePostInput = { title: string; body: string };
export type CreatePostResult = { ok: true; postId: string } | { ok: false; error: string };

export async function createPostAction(input: CreatePostInput): Promise<CreatePostResult> {
  const session = await requireSession();
  if (session.role !== 'intern' && session.role !== 'admin') {
    return { ok: false, error: 'forbidden' };
  }
  if (input.title.trim().length < 6) return { ok: false, error: 'title_too_short' };
  if (input.title.length > 160) return { ok: false, error: 'title_too_long' };
  if (input.body.trim().length < 20) return { ok: false, error: 'body_too_short' };
  if (input.body.length > 8000) return { ok: false, error: 'body_too_long' };

  const [row] = await db
    .insert(communityPosts)
    .values({
      authorId: session.user.id,
      title: input.title.trim(),
      body: input.body.trim(),
    })
    .returning();

  revalidatePath('/intern/community');
  return { ok: true, postId: row.id };
}

export type AddCommentInput = { postId: string; body: string };
export type AddCommentResult = { ok: true; commentId: string } | { ok: false; error: string };

export async function addCommentAction(input: AddCommentInput): Promise<AddCommentResult> {
  const session = await requireSession();
  if (session.role !== 'intern' && session.role !== 'admin') {
    return { ok: false, error: 'forbidden' };
  }
  if (input.body.trim().length < 1) return { ok: false, error: 'body_required' };
  if (input.body.length > 2000) return { ok: false, error: 'body_too_long' };

  const [comment] = await db
    .insert(communityComments)
    .values({
      postId: input.postId,
      authorId: session.user.id,
      body: input.body.trim(),
    })
    .returning();

  // Bump post activity + comment count atomically.
  await db
    .update(communityPosts)
    .set({
      commentCount: sql`${communityPosts.commentCount} + 1`,
      lastActivityAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(communityPosts.id, input.postId));

  revalidatePath('/intern/community');
  revalidatePath(`/intern/community/${input.postId}`);
  return { ok: true, commentId: comment.id };
}

export async function hidePostAction(postId: string): Promise<{ ok: boolean }> {
  const session = await requireSession();
  if (session.role !== 'admin') return { ok: false };
  await db
    .update(communityPosts)
    .set({ status: 'hidden', updatedAt: new Date() })
    .where(eq(communityPosts.id, postId));
  revalidatePath('/intern/community');
  revalidatePath(`/intern/community/${postId}`);
  return { ok: true };
}

/**
 * Author-initiated delete. Only the original author (or an admin) can
 * delete. Cascades to all comments via the FK relation.
 */
export async function deletePostAction(postId: string): Promise<void> {
  const session = await requireSession();
  const [post] = await db.select().from(communityPosts).where(eq(communityPosts.id, postId)).limit(1);
  if (!post) return;
  if (post.authorId !== session.user.id && session.role !== 'admin') {
    throw new Error('Forbidden');
  }
  await db.delete(communityPosts).where(eq(communityPosts.id, postId));
  revalidatePath('/intern/community');
  redirect('/intern/community');
}
