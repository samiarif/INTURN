import { db } from '@/db';
import { profiles, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function getProfileByUserId(userId: string) {
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);
  return profile ?? null;
}

export async function getUserByClerkId(clerkId: string) {
  const [user] = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);
  return user ?? null;
}

export async function getProfileWithUserByClerkId(clerkId: string) {
  const user = await getUserByClerkId(clerkId);
  if (!user) return null;
  const profile = await getProfileByUserId(user.id);
  return { user, profile };
}
