import { db } from '@/db';
import {
  communityPosts,
  communityComments,
  users,
  type CommunityPost,
  type CommunityComment,
  type User,
} from '@/db/schema';
import { desc, eq, sql } from 'drizzle-orm';

export type PostWithAuthor = {
  post: CommunityPost;
  author: Pick<User, 'id' | 'firstName' | 'lastName' | 'imageUrl' | 'email'>;
};

export type CommentWithAuthor = {
  comment: CommunityComment;
  author: Pick<User, 'id' | 'firstName' | 'lastName' | 'imageUrl' | 'email'>;
};

const AUTHOR_FIELDS = {
  id: users.id,
  firstName: users.firstName,
  lastName: users.lastName,
  imageUrl: users.imageUrl,
  email: users.email,
};

export async function listFeed(limit = 30): Promise<PostWithAuthor[]> {
  const rows = await db
    .select({ post: communityPosts, author: AUTHOR_FIELDS })
    .from(communityPosts)
    .innerJoin(users, eq(users.id, communityPosts.authorId))
    .where(eq(communityPosts.status, 'active'))
    .orderBy(desc(communityPosts.lastActivityAt))
    .limit(limit);
  return rows;
}

export async function getPost(postId: string): Promise<PostWithAuthor | null> {
  const [row] = await db
    .select({ post: communityPosts, author: AUTHOR_FIELDS })
    .from(communityPosts)
    .innerJoin(users, eq(users.id, communityPosts.authorId))
    .where(eq(communityPosts.id, postId))
    .limit(1);
  if (!row || row.post.status === 'hidden') return null;
  return row;
}

export async function listComments(postId: string): Promise<CommentWithAuthor[]> {
  return db
    .select({ comment: communityComments, author: AUTHOR_FIELDS })
    .from(communityComments)
    .innerJoin(users, eq(users.id, communityComments.authorId))
    .where(eq(communityComments.postId, postId))
    .orderBy(communityComments.createdAt);
}

export async function countActivePosts(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(communityPosts)
    .where(eq(communityPosts.status, 'active'));
  return Number(row?.count ?? 0);
}
