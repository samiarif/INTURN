import { cache } from 'react';
import { db } from '@/db';
import { notifications, type Notification } from '@/db/schema';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';

export const getUnreadCount = cache(async (userId: string): Promise<number> => {
  const [row] = await db
    .select({ count: sql<number>`COUNT(*)`.mapWith(Number) })
    .from(notifications)
    .where(and(eq(notifications.recipientId, userId), isNull(notifications.readAt)));
  return Number(row?.count ?? 0);
});

export async function listRecentNotifications(
  userId: string,
  limit = 20,
): Promise<Notification[]> {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.recipientId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}
